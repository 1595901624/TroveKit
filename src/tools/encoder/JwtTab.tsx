import { useState, useEffect } from "react"
import { Textarea, Button, Select, SelectItem, Card, CardBody, Input, ScrollShadow } from "@heroui/react"
import { Copy, Trash2, RotateCw, CheckCircle2, AlertCircle, KeyRound, Lock, Unlock, FileJson, ShieldCheck, Fingerprint } from "lucide-react"
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
            try {
                const privKey = await jose.importPKCS8(pem, alg)
                const spkiPem = await jose.exportSPKI(privKey)
                return await jose.importSPKI(spkiPem, alg)
            } catch {
                return await jose.importPKCS8(pem, alg)
            }
        }
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
          setValidationMsg("Generated & Signed");
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
    <div className="h-full flex flex-col gap-4 p-2 overflow-hidden bg-default-50/20">
      {/* Three-Column Grid Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 min-h-0">
        
        {/* Column 1: Encoded Token */}
        <Card className="flex flex-col border border-default-200 shadow-sm overflow-hidden" shadow="none">
          <CardBody className="p-0 flex flex-col">
            <div className="p-3 border-b border-divider bg-default-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Fingerprint className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold text-default-700 uppercase tracking-wider">{t("tools.encoder.jwtToken")}</h3>
              </div>
              <div className="flex gap-1">
                 <Button size="sm" variant="flat" color="primary" isIconOnly onPress={() => handleDecode()} title={t("tools.encoder.decode")}>
                     <RotateCw className="w-3.5 h-3.5" />
                 </Button>
                 <Button size="sm" isIconOnly variant="flat" onPress={() => copyToClipboard(token)}>
                     <Copy className="w-3.5 h-3.5" />
                 </Button>
                 <Button size="sm" isIconOnly variant="flat" color="danger" onPress={() => setToken("")}>
                     <Trash2 className="w-3.5 h-3.5" />
                 </Button>
              </div>
            </div>
            <div className="flex-1 p-0">
              <Textarea 
                  className="h-full font-mono text-sm"
                  classNames={{ 
                      input: "h-full !text-default-700 p-4 leading-relaxed", 
                      inputWrapper: "h-full bg-background border-none rounded-none" 
                  }}
                  value={token}
                  onValueChange={setToken}
                  placeholder={t("tools.encoder.jwtPlaceholder")}
                  variant="flat"
                  disableAnimation
              />
            </div>
          </CardBody>
        </Card>

        {/* Column 2: Decoded JSON (Header & Payload) */}
        <Card className="flex flex-col border border-default-200 shadow-sm overflow-hidden" shadow="none">
          <CardBody className="p-0 flex flex-col gap-0">
            {/* Header Section */}
            <div className="p-3 border-b border-divider bg-default-50/50 flex items-center gap-2">
              <FileJson className="w-4 h-4 text-warning" />
              <span className="text-xs font-bold text-default-700 uppercase tracking-wider">{t("tools.encoder.header")}</span>
            </div>
            <div className="h-1/4 min-h-[120px]">
              <Textarea 
                  minRows={4}
                  value={header}
                  onValueChange={setHeader}
                  className="h-full font-mono text-xs"
                  classNames={{ input: "p-4", inputWrapper: "h-full bg-background border-none rounded-none border-b border-divider" }}
                  variant="flat"
              />
            </div>

            {/* Payload Section */}
            <div className="p-3 border-b border-divider bg-default-50/50 flex items-center gap-2">
              <FileJson className="w-4 h-4 text-success" />
              <span className="text-xs font-bold text-default-700 uppercase tracking-wider">{t("tools.encoder.payload")}</span>
            </div>
            <div className="flex-1">
              <Textarea 
                  value={payload}
                  onValueChange={setPayload}
                  className="h-full font-mono text-xs"
                  classNames={{ input: "p-4", inputWrapper: "h-full bg-background border-none rounded-none" }}
                  variant="flat"
              />
            </div>
          </CardBody>
        </Card>

        {/* Column 3: Signature Configuration */}
        <Card className="flex flex-col border border-default-200 shadow-sm overflow-hidden bg-background/60 backdrop-blur-sm" shadow="none">
          <CardBody className="p-0 flex flex-col">
            <div className="p-3 border-b border-divider bg-default-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-success" />
                <h3 className="text-xs font-bold text-default-700 uppercase tracking-wider">{t("tools.encoder.signatureConfig")}</h3>
              </div>
            </div>

            <ScrollShadow className="flex-1 p-5 space-y-6">
              {/* Validation Status Area */}
              {isValid !== null && (
                  <div className={`p-3 rounded-xl border flex items-start gap-3 animate-in fade-in slide-in-from-top-1 duration-200 ${
                    isValid ? "bg-success-50/50 border-success-200" : "bg-danger-50/50 border-danger-200"
                  }`}>
                    <div className={`p-1.5 rounded-lg ${isValid ? "bg-success-100" : "bg-danger-100"}`}>
                        {isValid ? <CheckCircle2 className="w-4 h-4 text-success" /> : <AlertCircle className="w-4 h-4 text-danger" />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold ${isValid ? "text-success-700" : "text-danger-700"}`}>
                            {isValid ? "Verified" : "Invalid Signature"}
                        </p>
                        <p className={`text-[10px] mt-0.5 break-words leading-relaxed ${isValid ? "text-success-600/80" : "text-danger-600/80"}`}>
                            {validationMsg || (isValid ? "Token signature is valid." : "Token signature verification failed.")}
                        </p>
                    </div>
                  </div>
              )}

              {/* Algorithm Selection */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-default-400 uppercase ml-1">{t("tools.encoder.algorithm")}</label>
                <Select 
                    placeholder="Select Algorithm"
                    size="md"
                    selectedKeys={[algorithm]}
                    onChange={(e) => setAlgorithm(e.target.value)}
                    variant="bordered"
                    disallowEmptySelection
                    className="max-w-full"
                >
                    {ALGORITHMS.map(alg => <SelectItem key={alg}>{alg}</SelectItem>)}
                </Select>
              </div>

              {/* Keys Input Section */}
              <div className="space-y-4 pt-2">
                  {isHmacAlg(algorithm) && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-default-400 uppercase ml-1">{t("tools.encoder.secret")}</label>
                      <Input 
                          placeholder="Enter your secret key"
                          size="md"
                          value={hmacSecret}
                          onValueChange={setHmacSecret}
                          type="text"
                          variant="bordered"
                          startContent={<KeyRound className="w-4 h-4 text-default-400" />}
                      />
                    </div>
                  )}
                  
                  {!isHmacAlg(algorithm) && !isNoneAlg(algorithm) && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-default-400 uppercase ml-1">{t("tools.encoder.privateKey")}</label>
                            <Textarea 
                                placeholder="-----BEGIN PRIVATE KEY-----"
                                minRows={5}
                                maxRows={10}
                                value={privateKeyPem}
                                onValueChange={setPrivateKeyPem}
                                className="font-mono text-[10px]"
                                variant="bordered"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-default-400 uppercase ml-1">{t("tools.encoder.publicKey")}</label>
                            <Textarea 
                                placeholder="-----BEGIN PUBLIC KEY-----"
                                minRows={5}
                                maxRows={10}
                                value={publicKeyPem}
                                onValueChange={setPublicKeyPem}
                                className="font-mono text-[10px]"
                                variant="bordered"
                            />
                          </div>
                      </div>
                  )}

                  {isNoneAlg(algorithm) && (
                    <div className="py-8 text-center border-2 border-dashed border-default-200 rounded-xl bg-default-50/50">
                      <Unlock className="w-8 h-8 text-warning mx-auto mb-2 opacity-50" />
                      <p className="text-xs text-default-500 font-medium">Unsecured JWT - No key required</p>
                    </div>
                  )}
              </div>
            </ScrollShadow>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-divider bg-default-50/30 flex gap-3">
                <Button 
                    className="flex-1 font-bold h-11"
                    variant="flat"
                    onPress={() => handleVerify()}
                    startContent={<CheckCircle2 className="w-4 h-4" />}
                >
                    {t("tools.encoder.verify")}
                </Button>
                <Button 
                    className="flex-1 font-bold h-11 bg-gradient-to-r from-primary to-primary-600 text-white shadow-lg shadow-primary/20"
                    onPress={handleEncode}
                    isLoading={isEncoding}
                    startContent={!isEncoding && <Lock className="w-4 h-4" />}
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