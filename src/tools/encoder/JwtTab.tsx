import { useState, useEffect } from "react"
import { Textarea, Button, Select, SelectItem, Card, CardBody, Input, Badge, Chip } from "@heroui/react"
import { Copy, Trash2, RotateCw, CheckCircle2, AlertCircle, KeyRound, Lock, Unlock, FileJson } from "lucide-react"
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
  
  // Keys
  const [hmacSecret, setHmacSecret] = useState("your-256-bit-secret")
  const [privateKeyPem, setPrivateKeyPem] = useState("")
  const [publicKeyPem, setPublicKeyPem] = useState("")
  const [algorithm, setAlgorithm] = useState("HS256")
  
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [validationMsg, setValidationMsg] = useState("")
  const [isEncoding, setIsEncoding] = useState(false)

  // Load state
  useEffect(() => {
    if (isLoaded && savedState) {
        if (savedState.token) setToken(savedState.token)
        if (savedState.header) setHeader(savedState.header)
        if (savedState.payload) setPayload(savedState.payload)
        
        if (typeof savedState.hmacSecret === 'string') setHmacSecret(savedState.hmacSecret)
        if (typeof savedState.privateKeyPem === 'string') setPrivateKeyPem(savedState.privateKeyPem)
        if (typeof savedState.publicKeyPem === 'string') setPublicKeyPem(savedState.publicKeyPem)

        // Backward compatibility
        if (typeof savedState.secret === 'string' && !savedState.hmacSecret && !savedState.privateKeyPem && !savedState.publicKeyPem) {
            const migrated = savedState.secret
            if ((savedState.algorithm ?? algorithm).startsWith('HS')) {
                setHmacSecret(migrated)
            } else {
                setPrivateKeyPem(migrated)
            }
        }
        if (savedState.algorithm) setAlgorithm(savedState.algorithm)
    }
  }, [isLoaded, savedState])

  // Save state
  useEffect(() => {
    if (isLoaded) {
      setStoredItem(STORAGE_KEY, JSON.stringify({
        token,
        header,
        payload,
        algorithm,
        hmacSecret,
        privateKeyPem,
        publicKeyPem
      }))
    }
  }, [token, header, payload, algorithm, hmacSecret, privateKeyPem, publicKeyPem, isLoaded])

  const normalizePem = (pem: string) => pem.replace(/\r\n/g, '\n').trim()
  const isHmacAlg = (alg: string) => alg.startsWith('HS')
  const isNoneAlg = (alg: string) => alg === 'none'

  const getKey = async (alg: string, keyStr: string, usage: 'sign' | 'verify') => {
    if (isNoneAlg(alg)) return undefined

    // HMAC
    if (isHmacAlg(alg)) {
        if (!keyStr) throw new Error(t("tools.encoder.error.missingSecret"))
        return new TextEncoder().encode(keyStr)
    }

    // Asymmetric
    try {
        const pem = normalizePem(keyStr)
        if (!pem) {
            throw new Error(
                usage === 'sign'
                    ? t("tools.encoder.error.missingPrivateKey", { alg })
                    : t("tools.encoder.error.missingPublicKey", { alg })
            )
        }

        const looksPrivate = pem.includes("PRIVATE KEY")
        const looksPublic = pem.includes("PUBLIC KEY")

        if (usage === 'sign') {
            if (looksPublic) throw new Error(t("tools.encoder.error.signWithPublic"))
            return await jose.importPKCS8(pem, alg)
        }

        // verify
        if (looksPublic) return await jose.importSPKI(pem, alg)
        if (looksPrivate) {
            // Try to derive public key
            try {
                const privKey = await jose.importPKCS8(pem, alg)
                const spkiPem = await jose.exportSPKI(privKey)
                return await jose.importSPKI(spkiPem, alg)
            } catch {
                return await jose.importPKCS8(pem, alg)
            }
        }
        
        // Fallback
        return await jose.importSPKI(pem, alg)
    } catch (e) {
        throw new Error(`${t("tools.encoder.error.invalidKey", { alg })}: ${(e as Error).message}`)
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
        
        // Check verification
        if (decodedHeader.alg && decodedHeader.alg !== 'none') {
            setAlgorithm(decodedHeader.alg);
            const alg = decodedHeader.alg
            const hasKey = isHmacAlg(alg)
                ? !!hmacSecret.trim()
                : !!(publicKeyPem || privateKeyPem).trim()

            if (hasKey) {
                await handleVerify(token, alg)
            } else {
                setIsValid(null)
                setValidationMsg("")
            }
        } else {
             setAlgorithm('none');
             setIsValid(true);
             setValidationMsg("Unsecured JWT");
        }
        
        addLog({ method: "JWT Decode", input: "Token", output: "Decoded" }, "success");
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
          
          h.alg = algorithm;
          setHeader(JSON.stringify(h, null, 2));

          let jwt;
          if (algorithm === 'none') {
              jwt = (new jose.UnsecuredJWT(p) as any)
                .setProtectedHeader(h)
                .encode();
          } else {
              const keyStr = isHmacAlg(algorithm) ? hmacSecret : privateKeyPem
              const key = await getKey(algorithm, keyStr, 'sign');
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

          const keyStr = isHmacAlg(algToVerify)
            ? hmacSecret
            : (publicKeyPem || privateKeyPem)

          const key = await getKey(algToVerify, keyStr, 'verify');
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
    <div className="flex flex-col lg:flex-row h-full gap-6 p-2 overflow-hidden">
      {/* Left Panel: Encoded Token */}
      <div className="flex-1 flex flex-col min-w-[300px] gap-2">
          <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-bold text-default-700 tracking-wide uppercase">{t("tools.encoder.jwtToken")}</h3>
              <div className="flex gap-1">
                 <Button size="sm" variant="light" color="primary" onPress={() => handleDecode()} startContent={<RotateCw className="w-3.5 h-3.5" />}>
                     {t("tools.encoder.decode")}
                 </Button>
                 <Button size="sm" isIconOnly variant="light" onPress={() => copyToClipboard(token)}>
                     <Copy className="w-3.5 h-3.5 text-default-500" />
                 </Button>
                 <Button size="sm" isIconOnly variant="light" color="danger" onPress={() => setToken("")}>
                     <Trash2 className="w-3.5 h-3.5" />
                 </Button>
              </div>
          </div>
          
          <div className="flex-1 relative group">
            <Textarea 
                className="h-full font-mono text-sm"
                classNames={{ 
                    input: "h-full !text-default-700", 
                    inputWrapper: "h-full bg-default-50 hover:bg-default-100 group-hover:ring-1 ring-default-200 transition-all" 
                }}
                minRows={15}
                value={token}
                onValueChange={setToken}
                placeholder={t("tools.encoder.jwtPlaceholder")}
                variant="flat"
            />
          </div>
      </div>

      {/* Right Panel: Decoded & Config */}
      <div className="flex-1 flex flex-col min-w-[300px] gap-4 overflow-y-auto scrollbar-hide pr-1">
          
          {/* Decoded Sections */}
          <div className="grid grid-cols-1 gap-4">
              {/* Header */}
              <div className="space-y-1.5">
                 <div className="flex items-center justify-between">
                     <span className="text-xs font-semibold text-default-500 uppercase flex items-center gap-1.5">
                        <FileJson className="w-3.5 h-3.5" />
                        {t("tools.encoder.header")}
                     </span>
                 </div>
                 <Textarea 
                    minRows={2}
                    maxRows={6}
                    value={header}
                    onValueChange={setHeader}
                    className="font-mono text-xs"
                    classNames={{ inputWrapper: "bg-default-50" }}
                    variant="bordered"
                 />
              </div>

              {/* Payload */}
              <div className="space-y-1.5">
                 <div className="flex items-center justify-between">
                     <span className="text-xs font-semibold text-default-500 uppercase flex items-center gap-1.5">
                        <FileJson className="w-3.5 h-3.5" />
                        {t("tools.encoder.payload")}
                     </span>
                 </div>
                 <Textarea 
                    minRows={6}
                    value={payload}
                    onValueChange={setPayload}
                    className="font-mono text-xs"
                    classNames={{ inputWrapper: "bg-default-50" }}
                    variant="bordered"
                 />
              </div>
          </div>

          {/* Signature Configuration */}
          <Card className="border border-default-200 shadow-sm bg-background/60 backdrop-blur-sm mt-auto">
              <CardBody className="space-y-4 p-4">
                  {/* Title & Status */}
                  <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-default-700">
                          {algorithm === 'none' ? <Unlock className="w-4 h-4 text-warning" /> : <Lock className="w-4 h-4 text-primary" />}
                          <span className="text-xs font-bold uppercase tracking-wider">{t("tools.encoder.signatureConfig")}</span>
                      </div>
                      
                      {isValid !== null && (
                          <Chip
                            size="sm"
                            variant="flat"
                            color={isValid ? "success" : "danger"}
                            startContent={isValid ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                            classNames={{ content: "font-medium text-[10px]" }}
                          >
                              {validationMsg || (isValid ? "Verified" : "Invalid")}
                          </Chip>
                      )}
                  </div>
                  
                  {/* Controls */}
                  <div className="space-y-3">
                      <div className="flex gap-3">
                          <Select 
                              label={t("tools.encoder.algorithm")} 
                              size="sm" 
                              className={isHmacAlg(algorithm) ? "w-1/3" : "w-full"}
                              selectedKeys={[algorithm]}
                              onChange={(e) => setAlgorithm(e.target.value)}
                              variant="bordered"
                          >
                              {ALGORITHMS.map(alg => <SelectItem key={alg}>{alg}</SelectItem>)}
                          </Select>
                          
                          {isHmacAlg(algorithm) && (
                            <Input 
                                label={t("tools.encoder.secret")}
                                size="sm"
                                className="w-2/3"
                                value={hmacSecret}
                                onValueChange={setHmacSecret}
                                type="text"
                                variant="bordered"
                            />
                          )}
                      </div>
                      
                      {/* Asymmetric Keys */}
                      {!isHmacAlg(algorithm) && !isNoneAlg(algorithm) && (
                          <div className="grid grid-cols-1 gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                              <Textarea 
                                  label={t("tools.encoder.privateKey")}
                                  placeholder="-----BEGIN PRIVATE KEY-----"
                                  minRows={3}
                                  maxRows={8}
                                  value={privateKeyPem}
                                  onValueChange={setPrivateKeyPem}
                                  className="font-mono text-[10px]"
                                  variant="bordered"
                              />
                              <Textarea 
                                  label={t("tools.encoder.publicKey")}
                                  placeholder="-----BEGIN PUBLIC KEY-----"
                                  minRows={3}
                                  maxRows={8}
                                  value={publicKeyPem}
                                  onValueChange={setPublicKeyPem}
                                  className="font-mono text-[10px]"
                                  variant="bordered"
                              />
                          </div>
                      )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-divider">
                      <Button 
                          size="sm"
                          variant="light"
                          onPress={() => handleVerify()}
                          startContent={<CheckCircle2 className="w-4 h-4" />}
                      >
                          {t("tools.encoder.verify")}
                      </Button>
                      <Button 
                          size="sm"
                          color="primary"
                          onPress={handleEncode}
                          isLoading={isEncoding}
                          startContent={!isEncoding && <KeyRound className="w-4 h-4" />}
                      >
                          {t("tools.encoder.encodeJwt")}
                      </Button>
                  </div>
              </CardBody>
          </Card>
      </div>
    </div>
  )
}