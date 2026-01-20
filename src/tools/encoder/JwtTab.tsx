import { useState, useEffect, useRef } from "react"
import { Textarea, Button, Input, Select, SelectItem, Card, CardBody } from "@heroui/react"
import Editor from "@monaco-editor/react"
import { Copy, Trash2, ArrowRight, ShieldCheck, ShieldAlert, KeyRound, RefreshCw, Wand2 } from "lucide-react"
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

const EXAMPLE_PAYLOADS = [
  {
    "sub": "1234567890",
    "name": "John Doe",
    "admin": true,
    "iat": 1516239022
  },
  {
    "iss": "https://trovekit.io",
    "sub": "user_01HGW",
    "aud": "api://default",
    "iat": Math.floor(Date.now() / 1000),
    "exp": Math.floor(Date.now() / 1000) + 3600,
    "scope": "read write",
    "jti": crypto.randomUUID()
  },
  {
    "user_id": 42,
    "email": "dev@example.com",
    "roles": ["developer", "tester"],
    "preferences": {
      "theme": "dark",
      "notifications": false
    }
  }
]

export function JwtTab() {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const { addLog } = useLog()
  
  const [savedState, isLoaded] = useStorageLoader<any>(STORAGE_KEY)

  // State
  const [token, setToken] = useState("")
  const [header, setHeader] = useState("{\n  \"alg\": \"HS256\",\n  \"typ\": \"JWT\"\n}")
  const [payload, setPayload] = useState(JSON.stringify(EXAMPLE_PAYLOADS[0], null, 2))
  const [secret, setSecret] = useState("")
  const [publicKey, setPublicKey] = useState("")
  const [privateKey, setPrivateKey] = useState("")
  const [algorithm, setAlgorithm] = useState("HS256")
  const [verificationStatus, setVerificationStatus] = useState<"valid" | "invalid" | "none">("none")
  const [verificationMsg, setVerificationMsg] = useState("")
  
  const lastLoggedTokenRef = useRef("")

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

  const base64urlDecode = (str: string) => {
    try {
      return new TextDecoder().decode(jose.base64url.decode(str))
    } catch {
      return ""
    }
  }

  const logOperation = (op: "Decode" | "Sign", tkn: string, h: string, p: string, alg: string, k: string) => {
    // Check validity for Decode to avoid logging garbage
    if (op === "Decode") {
        try {
            JSON.parse(h)
            JSON.parse(p)
        } catch {
            return
        }
    }

    addLog({
        method: `JWT ${op} (${alg})`,
        input: op === "Sign" ? `Header:\n${h}\n\nPayload:\n${p}` : `Token:\n${tkn}`,
        output: op === "Sign" ? `Token:\n${tkn}` : `Header:\n${h}\n\nPayload:\n${p}`,
        cryptoParams: {
            algorithm: alg,
            key: k || (op === "Decode" ? "None (Unverified)" : "None"),
            key_type: getAlgType(alg)
        }
    }, "success")
  }

  // Automatic logging for Decode
  useEffect(() => {
    const timer = setTimeout(() => {
        // Log if token is valid (3 parts), stable, and different from last log
        if (token && token.split('.').length === 3 && token !== lastLoggedTokenRef.current) {
             const keyUsed = getAlgType(algorithm) === "HMAC" ? secret : publicKey
             logOperation("Decode", token, header, payload, algorithm, keyUsed)
             lastLoggedTokenRef.current = token
        }
    }, 1500)
    return () => clearTimeout(timer)
  }, [token, header, payload, algorithm, secret, publicKey])

  const handleDecode = (inputToken: string) => {
    const trimmed = inputToken.trim()
    if (!trimmed) {
        setVerificationStatus("none")
        return
    }

    const parts = trimmed.split(".")
    
    let decodedSomething = false

    // Header
    if (parts.length >= 1 && parts[0]) {
      const h = base64urlDecode(parts[0])
      if (h) {
        try {
          const parsed = JSON.parse(h)
          setHeader(JSON.stringify(parsed, null, 2))
          if (parsed.alg && ALGORITHMS.some(a => a.value === parsed.alg)) {
            setAlgorithm(parsed.alg)
          }
          decodedSomething = true
        } catch {
          setHeader(h)
        }
      }
    }

    // Payload
    if (parts.length >= 2 && parts[1]) {
      const p = base64urlDecode(parts[1])
      if (p) {
        try {
          setPayload(JSON.stringify(JSON.parse(p), null, 2))
          decodedSomething = true
        } catch {
          setPayload(p)
        }
      }
    }

    if (decodedSomething) {
      // Auto verify if we have 3 parts
      if (parts.length === 3) {
        verifyToken(trimmed, algorithm)
      } else {
        setVerificationStatus("none")
        setVerificationMsg("")
      }
    }
  }

  const handleManualDecode = () => {
    handleDecode(token)
    const keyUsed = getAlgType(algorithm) === "HMAC" ? secret : publicKey
    logOperation("Decode", token, header, payload, algorithm, keyUsed)
  }

  const handleTokenChange = (val: string) => {
    setToken(val)
    handleDecode(val)
  }

  const handleRandomHeader = () => {
    const h = {
      "alg": algorithm,
      "typ": "JWT",
      "kid": crypto.randomUUID().slice(0, 8)
    }
    setHeader(JSON.stringify(h, null, 2))
  }

  const handleRandomPayload = () => {
    const randomIdx = Math.floor(Math.random() * EXAMPLE_PAYLOADS.length)
    const p = { ...EXAMPLE_PAYLOADS[randomIdx] }
    // Refresh timestamps if present
    if (p.iat) p.iat = Math.floor(Date.now() / 1000)
    if (p.exp) p.exp = Math.floor(Date.now() / 1000) + 3600
    if (p.jti) p.jti = crypto.randomUUID()
    
    setPayload(JSON.stringify(p, null, 2))
  }

  const handleEncode = async () => {
    try {
        const h = JSON.parse(header)
        const p = JSON.parse(payload)
        
        // Ensure header alg matches selected alg
        h.alg = algorithm
        const updatedHeader = JSON.stringify(h, null, 2)
        setHeader(updatedHeader)

        let jwt = ""
        const encoder = new TextEncoder()
        
        const algType = getAlgType(algorithm)
        let keyUsed = ""

        if (algType === "HMAC") {
            if (!secret) throw new Error(t("tools.encoder.error.missingSecret"))
            keyUsed = secret
            jwt = await new jose.SignJWT(p)
                .setProtectedHeader(h)
                .sign(encoder.encode(secret))
        } else {
            if (!privateKey) throw new Error(t("tools.encoder.error.missingPrivateKey", { alg: algorithm }))
             // Import key
            keyUsed = privateKey
            const privKey = await jose.importPKCS8(privateKey, algorithm)
            jwt = await new jose.SignJWT(p)
                .setProtectedHeader(h)
                .sign(privKey)
        }

        setToken(jwt)
        setVerificationStatus("valid")
        setVerificationMsg(t("tools.encoder.generatedAndSigned"))
        
        logOperation("Sign", jwt, updatedHeader, payload, algorithm, keyUsed)
    } catch (e) {
        setVerificationStatus("invalid")
        setVerificationMsg((e as Error).message)
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

  // Trigger verify when secret/key/alg changes
  useEffect(() => {
      if (token && token.split(".").length === 3) {
          verifyToken(token, algorithm)
      }
  }, [secret, publicKey, algorithm]) // eslint-disable-line react-hooks/exhaustive-deps


  const copyToClipboard = (text: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
  }

  const algType = getAlgType(algorithm)

  return (
    <div className="flex flex-col md:flex-row h-full gap-4 overflow-hidden p-1">
        {/* Left: Encoded Token */}
        <div className="md:w-5/12 flex flex-col gap-2 h-full min-h-0">
            <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-default-600">{t("tools.encoder.jwtToken")}</h3>
                  <Button size="sm" variant="flat" color="primary" onPress={handleManualDecode} startContent={<RefreshCw className="w-3 h-3" />} className="h-7 px-2">
                    {t("tools.encoder.decode")}
                  </Button>
                </div>
                <div className="flex gap-1">
                    <Button isIconOnly size="sm" variant="light" onPress={() => copyToClipboard(token)} title={t("tools.encoder.copy")}>
                        <Copy className="w-4 h-4" />
                    </Button>
                    <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => { setToken(""); setHeader("{}"); setPayload("{}"); removeStoredItem(STORAGE_KEY); }} title={t("tools.encoder.clearAll")}>
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>
            <div className="flex-1 min-h-0 relative group">
                <Textarea
                    variant="bordered"
                    placeholder={t("tools.encoder.jwtPlaceholder")}
                    value={token}
                    onValueChange={handleTokenChange}
                    className="h-full"
                    classNames={{
                        base: "h-full",
                        input: "h-full font-mono text-xs leading-relaxed resize-none",
                        inputWrapper: "h-full bg-default-50/50 hover:bg-default-100/50 focus-within:bg-background overflow-hidden"
                    }}
                />
            </div>
             {/* Verification Status Card */}
             <div className="mt-2">
                {verificationStatus !== "none" && (
                    <Card className={`border ${verificationStatus === "valid" ? "border-success bg-success-50 dark:bg-success-900/20" : "border-danger bg-danger-50 dark:bg-danger-900/20"}`} shadow="sm">
                        <CardBody className="flex flex-row items-center gap-3 py-2 px-3">
                            {verificationStatus === "valid" ? <ShieldCheck className="w-5 h-5 text-success" /> : <ShieldAlert className="w-5 h-5 text-danger" />}
                            <div className="flex flex-col">
                                <span className={`font-medium text-xs ${verificationStatus === "valid" ? "text-success" : "text-danger"}`}>
                                    {verificationStatus === "valid" ? t("tools.encoder.verified") : t("tools.encoder.invalidSignature")}
                                </span>
                                {verificationMsg && <span className="text-[10px] opacity-80 line-clamp-1">{verificationMsg}</span>}
                            </div>
                        </CardBody>
                    </Card>
                )}
            </div>
        </div>

        {/* Center Divider / Action */}
        <div className="hidden md:flex flex-col justify-center items-center">
             <ArrowRight className="text-default-300" />
        </div>

        {/* Right: Decoded Header, Payload, Signature */}
        <div className="md:w-7/12 flex flex-col gap-4 h-full min-h-0 overflow-hidden">
            
            {/* Header & Payload split vertically */}
            <div className="flex-1 flex flex-col gap-4 min-h-0">
                {/* Header */}
                <div className="h-[40%] flex flex-col gap-1 min-h-0">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-xs font-semibold text-default-500">{t("tools.encoder.header")}</span>
                      <Button isIconOnly size="sm" variant="light" onPress={handleRandomHeader} title={t("tools.formatter.example")}>
                        <Wand2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="flex-1 border border-default-200 rounded-lg overflow-hidden bg-content1 shadow-inner">
                        <Editor
                            height="100%"
                            defaultLanguage="json"
                            value={header}
                            onChange={(val) => setHeader(val || "")}
                            theme={theme === "dark" ? "vs-dark" : "light"}
                            options={{ minimap: { enabled: false }, fontSize: 13, lineNumbers: "off", folding: false, wordWrap: "on", scrollBeyondLastLine: false }}
                        />
                    </div>
                </div>

                {/* Payload */}
                <div className="flex-1 flex flex-col gap-1 min-h-0">
                     <div className="flex justify-between items-center px-1">
                        <span className="text-xs font-semibold text-default-500">{t("tools.encoder.payload")}</span>
                        <Button isIconOnly size="sm" variant="light" onPress={handleRandomPayload} title={t("tools.formatter.example")}>
                          <Wand2 className="w-3 h-3" />
                        </Button>
                     </div>
                     <div className="flex-1 border border-default-200 rounded-lg overflow-hidden bg-content1 shadow-inner">
                        <Editor
                            height="100%"
                            defaultLanguage="json"
                            value={payload}
                            onChange={(val) => setPayload(val || "")}
                            theme={theme === "dark" ? "vs-dark" : "light"}
                            options={{ minimap: { enabled: false }, fontSize: 13, lineNumbers: "off", folding: false, wordWrap: "on", scrollBeyondLastLine: false }}
                        />
                    </div>
                </div>
            </div>

            {/* Signature / Keys */}
            <div className="flex flex-col gap-3 p-3 bg-content2 rounded-xl border border-default-100 shadow-sm">
                <div className="flex justify-between items-center">
                     <span className="text-xs font-semibold flex items-center gap-2 text-default-600">
                        <KeyRound className="w-3 h-3" />
                        {t("tools.encoder.signatureConfig")}
                     </span>
                     <Button size="sm" color="primary" onPress={handleEncode} className="font-semibold h-7">
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
                    
                    <div className="flex-1 min-w-0">
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
                                    maxRows={2}
                                    size="sm"
                                    placeholder={t("tools.encoder.publicKeyPlaceholder")}
                                    value={publicKey}
                                    onValueChange={setPublicKey}
                                    classNames={{ input: "font-mono text-[10px] py-1" }}
                                />
                                <Textarea
                                    minRows={1}
                                    maxRows={2}
                                    size="sm"
                                    placeholder={t("tools.encoder.privateKeyPlaceholder")}
                                    value={privateKey}
                                    onValueChange={setPrivateKey}
                                    classNames={{ input: "font-mono text-[10px] py-1" }}
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