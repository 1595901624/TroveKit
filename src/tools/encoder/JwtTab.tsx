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
    // Keys
    // - HS* uses a shared secret (raw bytes)
    // - RS*/PS*/ES* uses a Private Key (PKCS8 PEM) for signing and a Public Key (SPKI PEM) for verification
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
        // If we have saved header/payload/secret, use them, otherwise defaults
        if (savedState.header) setHeader(savedState.header)
        if (savedState.payload) setPayload(savedState.payload)
                if (typeof savedState.hmacSecret === 'string') setHmacSecret(savedState.hmacSecret)
                if (typeof savedState.privateKeyPem === 'string') setPrivateKeyPem(savedState.privateKeyPem)
                if (typeof savedState.publicKeyPem === 'string') setPublicKeyPem(savedState.publicKeyPem)

                // Backward compatibility: previous versions stored a single `secret` for everything.
                // We keep it as best-effort migration.
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

        // Asymmetric (RSA / RSA-PSS / ECDSA)
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

            // Some users paste a private key into the verify box.
            // We can *try* to import it and let WebCrypto decide whether verification is allowed.
            if (looksPrivate) return await jose.importPKCS8(pem, alg)

            // If headers are missing, attempt SPKI first, then PKCS8 as fallback.
            try {
                return await jose.importSPKI(pem, alg)
            } catch {
                return await jose.importPKCS8(pem, alg)
            }
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
        
        // Also verify if possible
        if (decodedHeader.alg && decodedHeader.alg !== 'none') {
            setAlgorithm(decodedHeader.alg);
            // We don't automatically verify because we might not have the key
                        // But we can try if the user already provided a key
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
              
              <div className="flex gap-2">
                  <Select 
                      label={t("tools.encoder.algorithm")} 
                      size="sm" 
                      className={algorithm.startsWith("HS") ? "w-1/3" : "w-full"}
                      selectedKeys={[algorithm]}
                      onChange={(e) => setAlgorithm(e.target.value)}
                  >
                      {ALGORITHMS.map(alg => <SelectItem key={alg}>{alg}</SelectItem>)}
                  </Select>
                  
                  {algorithm.startsWith("HS") && (
                    <Input 
                        label={t("tools.encoder.secret")}
                        size="sm"
                        className="w-2/3"
                                                value={hmacSecret}
                                                onValueChange={setHmacSecret}
                        type="text"
                    />
                  )}
              </div>
              
                            {/* If RSA/EC, show separate private/public PEM inputs */}
                            {(!algorithm.startsWith("HS") && algorithm !== 'none') && (
                                <div className="space-y-3">
                                    <Textarea 
                                        label={t("tools.encoder.privateKey")}
                                        placeholder={t("tools.encoder.pemPlaceholder")}
                                        minRows={5}
                                        value={privateKeyPem}
                                        onValueChange={setPrivateKeyPem}
                                        className="font-mono text-[10px]"
                                    />
                                    <Textarea 
                                        label={t("tools.encoder.publicKey")}
                                        placeholder={t("tools.encoder.pemPlaceholder")}
                                        minRows={5}
                                        value={publicKeyPem}
                                        onValueChange={setPublicKeyPem}
                                        className="font-mono text-[10px]"
                                    />
                                </div>
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