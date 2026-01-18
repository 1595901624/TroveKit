import { useState, useEffect } from "react"
import { Textarea, Button, Select, SelectItem, Card, CardBody, Input } from "@heroui/react"
import { Copy, Trash2, RotateCw, CheckCircle2, AlertCircle, KeyRound } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLog } from "../../contexts/LogContext"
import * as jose from 'jose';
import { useStorageLoader } from "../../hooks/usePersistentState"
import { setStoredItem } from "../../lib/store"

const STORAGE_KEY = "jwt-tool-state"

const ALGORITHMS = [
  "HS256", "HS384", "HS512",
  "RS256", "RS384", "RS512",
  "ES256", "ES384", "ES512",
  "PS256", "PS384", "PS512",
  "none"
]

export function JwtTab() {
  const { t } = useTranslation()
  const { addLog } = useLog()
  
  const [savedState, isLoaded] = useStorageLoader<any>(STORAGE_KEY)

  // State
  const [token, setToken] = useState("")
  const [header, setHeader] = useState("{\n  \"alg\": \"HS256\",\n  \"typ\": \"JWT\"\n}")
  const [payload, setPayload] = useState("{\n  \"sub\": \"1234567890\",\n  \"name\": \"John Doe\",\n  \"iat\": 1516239022\n}")
  const [secret, setSecret] = useState("your-256-bit-secret")
  const [algorithm, setAlgorithm] = useState("HS256")
  
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [validationMsg, setValidationMsg] = useState("")
  const [isEncoding, setIsEncoding] = useState(false)

  // Load state
  useEffect(() => {
    if (isLoaded && savedState) {
        if (savedState.token) setToken(savedState.token)
        // If we have saved header/payload/secret, use them, otherwise defaults
        if (savedState.header) setHeader(savedState.header)
        if (savedState.payload) setPayload(savedState.payload)
        if (savedState.secret) setSecret(savedState.secret)
        if (savedState.algorithm) setAlgorithm(savedState.algorithm)
    }
  }, [isLoaded, savedState])

  // Save state
  useEffect(() => {
    if (isLoaded) {
      setStoredItem(STORAGE_KEY, JSON.stringify({
        token, header, payload, secret, algorithm
      }))
    }
  }, [token, header, payload, secret, algorithm, isLoaded])

  const getKey = async (alg: string, keyStr: string, usage: 'sign' | 'verify') => {
    if (alg === 'none') return undefined;
    
    // HMAC
    if (alg.startsWith('HS')) {
        return new TextEncoder().encode(keyStr);
    }
    
    // Asymmetric
    try {
        // Normalize key string
        keyStr = keyStr.replace(/\r\n/g, '\n').trim();
        
        const isPrivate = keyStr.includes("PRIVATE KEY");
        const isPublic = keyStr.includes("PUBLIC KEY");

        if (usage === 'sign') {
            if (isPublic) {
                throw new Error(t("tools.encoder.error.signWithPublic"));
            }
            return await jose.importPKCS8(keyStr, alg);
        } else {
            // Verify
            if (isPublic) {
                return await jose.importSPKI(keyStr, alg);
            } else if (isPrivate) {
                // User provided private key for verification.
                // Try to derive public key from it
                try {
                    const privKey = await jose.importPKCS8(keyStr, alg);
                    // Export as SPKI (Public Key)
                    const spkiPem = await jose.exportSPKI(privKey);
                    return await jose.importSPKI(spkiPem, alg);
                } catch (e) {
                     console.warn("Failed to derive public key from private key", e);
                     // Fallback: try using private key directly (might fail depending on runtime)
                     return await jose.importPKCS8(keyStr, alg);
                }
            } else {
                 // Try importing as SPKI by default if headers are missing or unclear, 
                 // but usually PEM headers are required by jose.
                 // Let's just try SPKI first.
                 return await jose.importSPKI(keyStr, alg);
            }
        }
    } catch (e) {
        throw new Error(`${t("tools.encoder.error.invalidKey", { alg })}: ${(e as Error).message}`);
    }
  }

  // Actions
  const handleDecode = async () => {
    if (!token) return;
    try {
        const decodedHeader = jose.decodeProtectedHeader(token);
        const decodedPayload = jose.decodeJwt(token);
        
        setHeader(JSON.stringify(decodedHeader, null, 2));
        setPayload(JSON.stringify(decodedPayload, null, 2));
        
        // Also verify if possible
        if (decodedHeader.alg && decodedHeader.alg !== 'none') {
            setAlgorithm(decodedHeader.alg);
            // We don't automatically verify because we might not have the key
            // But we can try if secret is set
            handleVerify(token, decodedHeader.alg);
        } else {
             setAlgorithm('none');
             setIsValid(true);
             setValidationMsg("Unsecured JWT (none algorithm)");
        }
        
        addLog({ method: "JWT Decode", input: "Token", output: "Header & Payload extracted" }, "success");
    } catch (e) {
        addLog({ method: "JWT Decode", input: "Token", output: (e as Error).message }, "error");
        setIsValid(false);
        setValidationMsg((e as Error).message);
    }
  }

  const handleEncode = async () => {
      setIsEncoding(true);
      try {
          const h = JSON.parse(header);
          const p = JSON.parse(payload);
          
          // Force alg in header to match selected algorithm
          h.alg = algorithm;
          setHeader(JSON.stringify(h, null, 2));

          let jwt;
          if (algorithm === 'none') {
              jwt = (new jose.UnsecuredJWT(p) as any)
                .setProtectedHeader(h)
                .encode();
          } else {
              const key = await getKey(algorithm, secret, 'sign');
              jwt = await new jose.SignJWT(p)
                .setProtectedHeader(h)
                .setIssuedAt()
                .sign(key!);
          }
          
          setToken(jwt);
          setIsValid(true);
          setValidationMsg("Signature Verified (Just Signed)");
          addLog({ method: "JWT Encode", input: "Payload", output: "Token generated" }, "success");
      } catch (e) {
          console.error(e);
          setIsValid(false);
          setValidationMsg((e as Error).message);
          addLog({ method: "JWT Encode", input: "Payload", output: (e as Error).message }, "error");
      } finally {
          setIsEncoding(false);
      }
  }

  const handleVerify = async (tokenToVerify: string = token, algToVerify: string = algorithm) => {
      if (!tokenToVerify) return;
      try {
          if (algToVerify === 'none') {
              setIsValid(true);
              setValidationMsg("Algorithm is none.");
              return;
          }

          const key = await getKey(algToVerify, secret, 'verify');
          await jose.jwtVerify(tokenToVerify, key!, {
              algorithms: [algToVerify]
          });
          
          setIsValid(true);
          setValidationMsg("Signature Verified");
      } catch (e) {
          setIsValid(false);
          setValidationMsg((e as Error).message);
      }
  }

  const copyToClipboard = (text: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="flex flex-col lg:flex-row h-full gap-4 overflow-hidden p-1">
      {/* Left: Token Input */}
      <div className="flex-1 flex flex-col gap-4 min-w-[300px]">
          <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{t("tools.encoder.jwtToken")}</h3>
              <div className="flex gap-2">
                 <Button size="sm" color="primary" variant="flat" onPress={() => handleDecode()} startContent={<RotateCw className="w-4 h-4" />}>
                     {t("tools.encoder.decode")}
                 </Button>
                 <Button size="sm" isIconOnly variant="light" onPress={() => copyToClipboard(token)}>
                     <Copy className="w-4 h-4" />
                 </Button>
                 <Button size="sm" isIconOnly variant="light" color="danger" onPress={() => setToken("")}>
                     <Trash2 className="w-4 h-4" />
                 </Button>
              </div>
          </div>
          <Textarea 
             className="flex-1 font-mono text-xs"
             classNames={{input: "h-full", inputWrapper: "h-full"}}
             minRows={10}
             value={token}
             onValueChange={setToken}
             placeholder={t("tools.encoder.jwtPlaceholder")}
          />
          
          {/* Validation Status */}
          <Card className={`border ${isValid === true ? "border-success bg-success-50/20" : isValid === false ? "border-danger bg-danger-50/20" : "border-default-200"}`} shadow="sm">
              <CardBody className="p-3 flex flex-row items-center gap-3">
                  {isValid === true && <CheckCircle2 className="w-5 h-5 text-success" />}
                  {isValid === false && <AlertCircle className="w-5 h-5 text-danger" />}
                  {isValid === null && <div className="w-5 h-5" />}
                  <div className="flex-1 text-xs font-mono truncate">
                      {isValid === null ? t("tools.encoder.ready") : validationMsg}
                  </div>
                  <Button size="sm" variant="light" onPress={() => handleVerify()}>
                      {t("tools.encoder.verify")}
                  </Button>
              </CardBody>
          </Card>
      </div>

      {/* Right: Decoded Data */}
      <div className="flex-1 flex flex-col gap-4 min-w-[300px] overflow-y-auto pr-2">
          
          {/* Header */}
          <div className="space-y-2">
             <div className="flex items-center justify-between">
                 <span className="text-xs font-medium text-default-500">{t("tools.encoder.header")}</span>
             </div>
             <Textarea 
                minRows={3}
                maxRows={6}
                value={header}
                onValueChange={setHeader}
                className="font-mono text-xs"
                variant="bordered"
             />
          </div>

          {/* Payload */}
          <div className="space-y-2 flex-1">
             <div className="flex items-center justify-between">
                 <span className="text-xs font-medium text-default-500">{t("tools.encoder.payload")}</span>
             </div>
             <Textarea 
                minRows={6}
                value={payload}
                onValueChange={setPayload}
                className="font-mono text-xs"
                variant="bordered"
             />
          </div>

          {/* Signature / Key Config */}
          <div className="p-4 bg-default-50 rounded-xl border border-default-200 space-y-4">
              <div className="flex items-center gap-2 text-default-600">
                  <KeyRound className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase">{t("tools.encoder.signatureConfig")}</span>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                  <Select 
                      label={t("tools.encoder.algorithm")} 
                      size="sm" 
                      className="col-span-1"
                      selectedKeys={[algorithm]}
                      onChange={(e) => setAlgorithm(e.target.value)}
                  >
                      {ALGORITHMS.map(alg => <SelectItem key={alg}>{alg}</SelectItem>)}
                  </Select>
                  
                  <Input 
                      label={algorithm.startsWith("HS") ? t("tools.encoder.secret") : t("tools.encoder.privatePublicKey")}
                      size="sm"
                      className="col-span-2"
                      value={secret}
                      onValueChange={setSecret}
                      type={algorithm.startsWith("HS") ? "text" : "text"} 
                  />
              </div>
              
              {/* If RSA/EC, show bigger text area for key */}
              {(!algorithm.startsWith("HS") && algorithm !== 'none') && (
                   <Textarea 
                      label={t("tools.encoder.pemKey")}
                      placeholder={t("tools.encoder.pemPlaceholder")}
                      minRows={3}
                      value={secret}
                      onValueChange={setSecret}
                      className="font-mono text-[10px]"
                   />
              )}

              <Button 
                  color="secondary" 
                  className="w-full" 
                  onPress={handleEncode}
                  isLoading={isEncoding}
              >
                  {t("tools.encoder.encodeJwt")}
              </Button>
          </div>
      </div>
    </div>
  )
}