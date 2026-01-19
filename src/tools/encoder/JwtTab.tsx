import { useState, useEffect } from "react"
import { Textarea, Button, Input, Select, SelectItem, Card, CardBody } from "@heroui/react"
import Editor from "@monaco-editor/react"
import { Copy, Trash2, ArrowRight, ShieldCheck, ShieldAlert, KeyRound } from "lucide-react"
import { useTranslation } from "react-i18next"
import * as jose from "jose"
import { useTheme } from "../../components/theme-provider"
import { useLog } from "../../contexts/LogContext"
import { useStorageLoader } from "../../hooks/usePersistentState"
import { setStoredItem, removeStoredItem } from "../../lib/store"

const STORAGE_KEY = "jwt-tool-state"

const ALGORITHMS = [
  { label: "HS256", value: "HS256", type: "HMAC" },
  { label: "HS384", value: "HS384", type: "HMAC" },
  { label: "HS512", value: "HS512", type: "HMAC" },
  { label: "RS256", value: "RS256", type: "RSA" },
  { label: "RS384", value: "RS384", type: "RSA" },
  { label: "RS512", value: "RS512", type: "RSA" },
  { label: "ES256", value: "ES256", type: "ECDSA" },
  { label: "ES384", value: "ES384", type: "ECDSA" },
]

export function JwtTab() {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const { addLog } = useLog()
  
  const [savedState, isLoaded] = useStorageLoader<any>(STORAGE_KEY)

  // State
  const [token, setToken] = useState("")
  const [header, setHeader] = useState("{\n  \"alg\": \"HS256\",\n  \"typ\": \"JWT\"\n}")
  const [payload, setPayload] = useState("{\n  \"sub\": \"1234567890\",\n  \"name\": \"John Doe\",\n  \"iat\": 1516239022\n}")
  const [secret, setSecret] = useState("")
  const [publicKey, setPublicKey] = useState("")
  const [privateKey, setPrivateKey] = useState("")
  const [algorithm, setAlgorithm] = useState("HS256")
  const [verificationStatus, setVerificationStatus] = useState<"valid" | "invalid" | "none">("none")
  const [verificationMsg, setVerificationMsg] = useState("")

  // Load state
  useEffect(() => {
    if (isLoaded && savedState) {
        if (savedState.token) setToken(savedState.token)
        if (savedState.header) setHeader(savedState.header)
        if (savedState.payload) setPayload(savedState.payload)
        if (savedState.secret) setSecret(savedState.secret)
        if (savedState.publicKey) setPublicKey(savedState.publicKey)
        if (savedState.privateKey) setPrivateKey(savedState.privateKey)
        if (savedState.algorithm) setAlgorithm(savedState.algorithm)
    }
  }, [isLoaded, savedState])

  // Save state
  useEffect(() => {
    if (isLoaded) {
      setStoredItem(STORAGE_KEY, JSON.stringify({ 
        token, header, payload, secret, publicKey, privateKey, algorithm 
      }))
    }
  }, [token, header, payload, secret, publicKey, privateKey, algorithm, isLoaded])

  // --- Logic ---

  const getAlgType = (alg: string) => {
    const found = ALGORITHMS.find(a => a.value === alg)
    return found ? found.type : "HMAC"
  }

  const handleDecode = (inputToken: string) => {
    setToken(inputToken)
    if (!inputToken) {
        setVerificationStatus("none")
        return
    }

    try {
        const decodedHeader = jose.decodeProtectedHeader(inputToken)
        const decodedPayload = jose.decodeJwt(inputToken)

        setHeader(JSON.stringify(decodedHeader, null, 2))
        setPayload(JSON.stringify(decodedPayload, null, 2))
        
        if (decodedHeader.alg && ALGORITHMS.some(a => a.value === decodedHeader.alg)) {
             setAlgorithm(decodedHeader.alg)
        }
        
        // Auto verify if possible
        verifyToken(inputToken, decodedHeader.alg)
        
    } catch (e) {
        // Partial decode if possible or just ignore
        // setVerificationStatus("invalid")
        // setVerificationMsg((e as Error).message)
    }
  }

  const handleEncode = async () => {
    try {
        const h = JSON.parse(header)
        const p = JSON.parse(payload)
        
        // Ensure header alg matches selected alg
        h.alg = algorithm
        setHeader(JSON.stringify(h, null, 2))

        let jwt = ""
        const encoder = new TextEncoder()

        if (getAlgType(algorithm) === "HMAC") {
            if (!secret) throw new Error(t("tools.encoder.error.missingSecret"))
            jwt = await new jose.SignJWT(p)
                .setProtectedHeader(h)
                .sign(encoder.encode(secret))
        } else {
            if (!privateKey) throw new Error(t("tools.encoder.error.missingPrivateKey", { alg: algorithm }))
             // Import key
            const privKey = await jose.importPKCS8(privateKey, algorithm)
            jwt = await new jose.SignJWT(p)
                .setProtectedHeader(h)
                .sign(privKey)
        }

        setToken(jwt)
        setVerificationStatus("valid")
        setVerificationMsg(t("tools.encoder.generatedAndSigned"))
        addLog({ method: "JWT Sign", input: "Header/Payload", output: "JWT Token" }, "success")
    } catch (e) {
        setVerificationStatus("invalid")
        setVerificationMsg((e as Error).message)
        addLog({ method: "JWT Sign", input: "Header/Payload", output: (e as Error).message }, "error")
    }
  }

  const verifyToken = async (jwtStr: string, alg: string = algorithm) => {
      if (!jwtStr) return

      try {
          const encoder = new TextEncoder()
          if (getAlgType(alg) === "HMAC") {
              if (!secret) {
                  setVerificationStatus("none")
                  return
              }
              await jose.jwtVerify(jwtStr, encoder.encode(secret))
          } else {
             if (!publicKey) {
                 setVerificationStatus("none")
                 return
             }
             const pubKey = await jose.importSPKI(publicKey, alg)
             await jose.jwtVerify(jwtStr, pubKey)
          }
          setVerificationStatus("valid")
          setVerificationMsg(t("tools.encoder.tokenSignatureValid"))
      } catch (e) {
          setVerificationStatus("invalid")
          setVerificationMsg(t("tools.encoder.tokenSignatureInvalid") + " " + (e as Error).message)
      }
  }

  // Trigger verify when secret/key changes
  useEffect(() => {
      if (token) {
          verifyToken(token, algorithm)
      }
  }, [secret, publicKey, algorithm]) // eslint-disable-line react-hooks/exhaustive-deps


  const copyToClipboard = (text: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
  }

  const algType = getAlgType(algorithm)

  return (
    <div className="flex flex-col md:flex-row h-full gap-4 overflow-hidden">
        {/* Left: Encoded Token */}
        <div className="md:w-5/12 flex flex-col gap-2 min-h-[200px]">
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-default-600">{t("tools.encoder.jwtToken")}</h3>
                <div className="flex gap-1">
                    <Button isIconOnly size="sm" variant="light" onPress={() => copyToClipboard(token)} title={t("tools.encoder.copy")}>
                        <Copy className="w-4 h-4" />
                    </Button>
                    <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => { setToken(""); setHeader("{}"); setPayload("{}"); removeStoredItem(STORAGE_KEY); }} title={t("tools.encoder.clearAll")}>
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>
            <div className="flex-1 relative group">
                <Textarea
                    variant="bordered"
                    placeholder={t("tools.encoder.jwtPlaceholder")}
                    value={token}
                    onValueChange={handleDecode}
                    className="h-full"
                    classNames={{
                        input: "h-full font-mono text-sm leading-relaxed",
                        inputWrapper: "h-full bg-default-50/50 hover:bg-default-100/50 focus-within:bg-background"
                    }}
                />
            </div>
             {/* Verification Status Card */}
             <div className="mt-auto">
                {verificationStatus !== "none" && (
                    <Card className={`border ${verificationStatus === "valid" ? "border-success bg-success-50 dark:bg-success-900/20" : "border-danger bg-danger-50 dark:bg-danger-900/20"}`} shadow="sm">
                        <CardBody className="flex flex-row items-center gap-3 py-2 px-3">
                            {verificationStatus === "valid" ? <ShieldCheck className="w-5 h-5 text-success" /> : <ShieldAlert className="w-5 h-5 text-danger" />}
                            <div className="flex flex-col">
                                <span className={`font-medium text-xs ${verificationStatus === "valid" ? "text-success" : "text-danger"}`}>
                                    {verificationStatus === "valid" ? t("tools.encoder.verified") : t("tools.encoder.invalidSignature")}
                                </span>
                                {verificationMsg && <span className="text-[10px] opacity-80">{verificationMsg}</span>}
                            </div>
                        </CardBody>
                    </Card>
                )}
            </div>
        </div>

        {/* Center Divider / Action (on mobile it would be hidden or different) */}
        <div className="hidden md:flex flex-col justify-center items-center">
             <ArrowRight className="text-default-300" />
        </div>

        {/* Right: Decoded Header, Payload, Signature */}
        <div className="md:w-7/12 flex flex-col gap-4 h-full overflow-hidden">
            
            {/* Header & Payload split vertically */}
            <div className="flex-1 flex flex-col gap-4 min-h-0">
                {/* Header */}
                <div className="h-1/3 flex flex-col gap-1 min-h-[100px]">
                    <span className="text-xs font-semibold text-default-500">{t("tools.encoder.header")}</span>
                    <div className="flex-1 border border-default-200 rounded-lg overflow-hidden">
                        <Editor
                            height="100%"
                            defaultLanguage="json"
                            value={header}
                            onChange={(val) => setHeader(val || "")}
                            theme={theme === "dark" ? "vs-dark" : "light"}
                            options={{ minimap: { enabled: false }, fontSize: 13, lineNumbers: "off", folding: false, wordWrap: "on" }}
                        />
                    </div>
                </div>

                {/* Payload */}
                <div className="flex-1 flex flex-col gap-1 min-h-[100px]">
                     <span className="text-xs font-semibold text-default-500">{t("tools.encoder.payload")}</span>
                     <div className="flex-1 border border-default-200 rounded-lg overflow-hidden">
                        <Editor
                            height="100%"
                            defaultLanguage="json"
                            value={payload}
                            onChange={(val) => setPayload(val || "")}
                            theme={theme === "dark" ? "vs-dark" : "light"}
                            options={{ minimap: { enabled: false }, fontSize: 13, lineNumbers: "off", folding: false, wordWrap: "on" }}
                        />
                    </div>
                </div>
            </div>

            {/* Signature / Keys */}
            <div className="flex flex-col gap-3 p-3 bg-content2 rounded-lg">
                <div className="flex justify-between items-center">
                     <span className="text-xs font-semibold flex items-center gap-2">
                        <KeyRound className="w-3 h-3" />
                        {t("tools.encoder.signatureConfig")}
                     </span>
                     <Button size="sm" color="primary" onPress={handleEncode} className="font-semibold">
                        {t("tools.encoder.encodeJwt")}
                     </Button>
                </div>
                
                <div className="flex gap-2 items-center">
                    <Select 
                        labelPlacement="outside-left" 
                        size="sm" 
                        className="w-32" 
                        selectedKeys={[algorithm]} 
                        onChange={(e) => setAlgorithm(e.target.value)}
                        aria-label="Algorithm"
                    >
                        {ALGORITHMS.map((alg) => (
                            <SelectItem key={alg.value} textValue={alg.label}>
                                {alg.label}
                            </SelectItem>
                        ))}
                    </Select>
                    
                    <div className="flex-1">
                        {algType === "HMAC" && (
                            <Input
                                size="sm"
                                placeholder={t("tools.encoder.secretPlaceholder")}
                                value={secret}
                                onValueChange={setSecret}
                                isClearable
                                classNames={{ input: "font-mono text-xs" }}
                            />
                        )}
                        {algType !== "HMAC" && (
                             <div className="flex gap-2">
                                <Textarea
                                    minRows={1}
                                    maxRows={3}
                                    size="sm"
                                    placeholder={t("tools.encoder.publicKeyPlaceholder")}
                                    value={publicKey}
                                    onValueChange={setPublicKey}
                                    classNames={{ input: "font-mono text-[10px]" }}
                                />
                                <Textarea
                                    minRows={1}
                                    maxRows={3}
                                    size="sm"
                                    placeholder={t("tools.encoder.privateKeyPlaceholder")}
                                    value={privateKey}
                                    onValueChange={setPrivateKey}
                                    classNames={{ input: "font-mono text-[10px]" }}
                                />
                             </div>
                        )}
                    </div>
                </div>
            </div>

        </div>
    </div>
  )
}
