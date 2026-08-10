import { useState, useEffect, useRef } from "react"
import { Textarea, Button, ButtonGroup, Input, Select, SelectItem } from "../../components/ui/base-ui"
import Editor from "../../components/MonacoEditor"
import { Copy, Trash2, ArrowDown, ArrowRight, ShieldCheck, ShieldAlert, KeyRound, RefreshCw, Wand2 } from "lucide-react"
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
  const [activeJsonPanel, setActiveJsonPanel] = useState<"header" | "payload">("payload")
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
        input: op === "Sign" ? `${t("tools.encoder.log.header")}:\n${h}\n\n${t("tools.encoder.log.payload")}:\n${p}` : `${t("tools.encoder.log.token")}:\n${tkn}`,
        output: op === "Sign" ? `${t("tools.encoder.log.token")}:\n${tkn}` : `${t("tools.encoder.log.header")}:\n${h}\n\n${t("tools.encoder.log.payload")}:\n${p}`,
        cryptoParams: {
            algorithm: alg,
            key: k || (op === "Decode" ? t("tools.encoder.noneUnverified") : t("tools.encoder.none")),
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

  const clearAll = () => {
    setToken("")
    setHeader("{}")
    setPayload("{}")
    setVerificationStatus("none")
    setVerificationMsg("")
    removeStoredItem(STORAGE_KEY)
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center gap-2 rounded-xl border border-default-200 bg-default-50/70 p-2">
        <span className="flex shrink-0 items-center gap-1.5 px-1 text-xs font-semibold text-default-600">
          <KeyRound className="h-3.5 w-3.5" />
          {t("tools.encoder.signatureConfig")}
        </span>

        <Select
          className="w-28"
          classNames={{ trigger: "h-8 bg-background px-2.5 text-xs" }}
          selectedKeys={[algorithm]}
          onChange={(event) => setAlgorithm(event.target.value)}
          aria-label={t("tools.encoder.algorithm")}
        >
          {ALGORITHMS.map((alg) => <SelectItem key={alg.value}>{alg.label}</SelectItem>)}
        </Select>

        <div className="min-w-48 flex-1">
          {algType === "HMAC" ? (
            <Input
              placeholder={t("tools.encoder.secretPlaceholder")}
              value={secret}
              onValueChange={setSecret}
              isClearable
              classNames={{
                inputWrapper: "h-8 min-h-8 bg-background px-2.5",
                input: "h-7 font-mono text-xs",
              }}
            />
          ) : (
            <div className="grid min-w-0 gap-2 sm:grid-cols-2">
              <Textarea
                minRows={1}
                placeholder={t("tools.encoder.publicKeyPlaceholder")}
                value={publicKey}
                onValueChange={setPublicKey}
                classNames={{
                  inputWrapper: "h-14 min-h-14 bg-background p-2",
                  input: "min-h-0 overflow-auto font-mono text-[10px] leading-4",
                }}
              />
              <Textarea
                minRows={1}
                placeholder={t("tools.encoder.privateKeyPlaceholder")}
                value={privateKey}
                onValueChange={setPrivateKey}
                classNames={{
                  inputWrapper: "h-14 min-h-14 bg-background p-2",
                  input: "min-h-0 overflow-auto font-mono text-[10px] leading-4",
                }}
              />
            </div>
          )}
        </div>

        <Button size="sm" variant="flat" color="primary" className="h-8" onPress={handleManualDecode} startContent={<RefreshCw className="h-3.5 w-3.5" />}>
          {t("tools.encoder.decode")}
        </Button>
        <Button size="sm" color="primary" className="h-8" onPress={handleEncode}>
          {t("tools.encoder.encodeJwt")}
        </Button>
        <Button size="sm" variant="light" className="h-8 text-default-500 hover:bg-danger/10 hover:text-danger" onPress={clearAll} startContent={<Trash2 className="h-4 w-4" />}>
          {t("tools.encoder.clearAll")}
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,0.9fr)_40px_minmax(0,1.1fr)] overflow-hidden rounded-xl border border-default-200 bg-background lg:grid-cols-[minmax(0,5fr)_48px_minmax(0,7fr)] lg:grid-rows-1">
        <section className="flex min-h-0 min-w-0 flex-col" aria-labelledby="jwt-token-heading">
          <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-default-200 px-4">
            <div className="flex min-w-0 items-center gap-3">
              <h2 id="jwt-token-heading" className="shrink-0 text-sm font-semibold text-foreground">{t("tools.encoder.jwtToken")}</h2>
              <span className="truncate text-[11px] text-default-400">
                {t("tools.encoder.characterCount", { count: token.length })}
              </span>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              {verificationStatus !== "none" && (
                <span
                  className={`flex min-w-0 items-center gap-1 truncate text-[11px] font-medium ${verificationStatus === "valid" ? "text-success" : "text-danger"}`}
                  title={verificationMsg}
                >
                  {verificationStatus === "valid" ? <ShieldCheck className="h-4 w-4 shrink-0" /> : <ShieldAlert className="h-4 w-4 shrink-0" />}
                  <span className="truncate">{verificationStatus === "valid" ? t("tools.encoder.verified") : t("tools.encoder.invalidSignature")}</span>
                </span>
              )}
              <Button size="sm" variant="light" color="primary" className="h-8 min-w-0 px-2.5" onPress={() => copyToClipboard(token)} isDisabled={!token} startContent={<Copy className="h-4 w-4" />}>
                {t("tools.encoder.copy")}
              </Button>
            </div>
          </div>
          <Textarea
            aria-label={t("tools.encoder.jwtToken")}
            placeholder={t("tools.encoder.jwtPlaceholder")}
            value={token}
            onValueChange={handleTokenChange}
            className="min-h-0 flex-1"
            classNames={{
              inputWrapper: "min-h-0 flex-1 rounded-none border-0 bg-transparent p-4 focus-within:border-transparent focus-within:ring-0",
              input: "min-h-0 resize-none overflow-auto font-mono text-[13px] leading-6",
            }}
          />
        </section>

        <div className="flex items-center justify-center border-y border-default-200 bg-default-50/60 lg:border-x lg:border-y-0">
          <ArrowDown className="h-4 w-4 text-default-400 lg:hidden" />
          <ArrowRight className="hidden h-4 w-4 text-default-400 lg:block" />
        </div>

        <section className="flex min-h-0 min-w-0 flex-col lg:grid lg:grid-rows-2 lg:divide-y lg:divide-default-200" aria-label={`${t("tools.encoder.header")} / ${t("tools.encoder.payload")}`}>
          <div className="flex h-10 shrink-0 items-center border-b border-default-200 px-3 lg:hidden">
            <ButtonGroup className="rounded-lg bg-default-100 p-0.5">
              <Button
                size="sm"
                variant={activeJsonPanel === "header" ? "flat" : "light"}
                color={activeJsonPanel === "header" ? "primary" : "default"}
                className="h-7 min-w-20"
                onPress={() => setActiveJsonPanel("header")}
              >
                {t("tools.encoder.header")}
              </Button>
              <Button
                size="sm"
                variant={activeJsonPanel === "payload" ? "flat" : "light"}
                color={activeJsonPanel === "payload" ? "primary" : "default"}
                className="h-7 min-w-20"
                onPress={() => setActiveJsonPanel("payload")}
              >
                {t("tools.encoder.payload")}
              </Button>
            </ButtonGroup>
          </div>

          <div className={`${activeJsonPanel === "header" ? "flex" : "hidden"} min-h-0 flex-1 flex-col lg:flex`}>
            <div className="flex h-10 shrink-0 items-center justify-between px-4">
              <span className="text-xs font-semibold text-default-600">{t("tools.encoder.header")}</span>
              <Button isIconOnly size="sm" variant="light" onPress={handleRandomHeader} title={t("tools.formatter.example")} aria-label={t("tools.formatter.example")}>
                <Wand2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="min-h-0 flex-1 border-t border-default-200 bg-default-50/30">
              <Editor
                height="100%"
                defaultLanguage="json"
                value={header}
                onChange={(value) => setHeader(value || "")}
                theme={theme === "dark" ? "vs-dark" : "light"}
                options={{ minimap: { enabled: false }, fontSize: 13, lineNumbers: "off", folding: false, wordWrap: "on", scrollBeyondLastLine: false }}
              />
            </div>
          </div>

          <div className={`${activeJsonPanel === "payload" ? "flex" : "hidden"} min-h-0 flex-1 flex-col lg:flex`}>
            <div className="flex h-10 shrink-0 items-center justify-between px-4">
              <span className="text-xs font-semibold text-default-600">{t("tools.encoder.payload")}</span>
              <Button isIconOnly size="sm" variant="light" onPress={handleRandomPayload} title={t("tools.formatter.example")} aria-label={t("tools.formatter.example")}>
                <Wand2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="min-h-0 flex-1 border-t border-default-200 bg-default-50/30">
              <Editor
                height="100%"
                defaultLanguage="json"
                value={payload}
                onChange={(value) => setPayload(value || "")}
                theme={theme === "dark" ? "vs-dark" : "light"}
                options={{ minimap: { enabled: false }, fontSize: 13, lineNumbers: "off", folding: false, wordWrap: "on", scrollBeyondLastLine: false }}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
