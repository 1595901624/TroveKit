import { useEffect, useState } from "react"
import { File, Lock, Type, Unlock } from "lucide-react"
import { useTranslation } from "react-i18next"
import CryptoJS from "crypto-js"
import { Button, ButtonGroup, Input, Select, SelectItem } from "../../components/ui/base-ui"
import { FileWorkbench } from "../../components/FileWorkbench"
import { useLogActions } from "../../contexts/LogContext"
import { fileNameFromPath, runFileCommand, type FileOperationResult } from "../../lib/fileOperations"
import { getStoredItem, removeStoredItem, setStoredItem } from "../../lib/store"
import { HashOperationSwitch, HashToolbarField, HashWorkbench } from "./HashWorkbench"

const STORAGE_KEY = "aes-tool-state"
type TextOperation = "encrypt" | "decrypt"
type FileOperation = "encrypt" | "decrypt"
type AesFormatState = Record<TextOperation, { input: string; output: string }>

const DEFAULT_AES_FORMATS: AesFormatState = {
  encrypt: { input: "String", output: "Base64" },
  decrypt: { input: "Base64", output: "String" },
}

function normalizeFormats(formats?: Partial<Record<TextOperation, Partial<{ input: string; output: string }>>>) {
  const normalized: AesFormatState = {
    encrypt: { input: formats?.encrypt?.input || DEFAULT_AES_FORMATS.encrypt.input, output: formats?.encrypt?.output || DEFAULT_AES_FORMATS.encrypt.output },
    decrypt: { input: formats?.decrypt?.input || DEFAULT_AES_FORMATS.decrypt.input, output: formats?.decrypt?.output || DEFAULT_AES_FORMATS.decrypt.output },
  }
  if (normalized.decrypt.input === "String") normalized.decrypt.input = "Base64"
  if (normalized.encrypt.output === "String") normalized.encrypt.output = "Base64"
  return normalized
}

export function AesTab2() {
  const { t } = useTranslation()
  const { addLog } = useLogActions()
  const [workspaceMode, setWorkspaceMode] = useState<"text" | "file">("text")
  const [operation, setOperation] = useState<TextOperation>("encrypt")
  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")
  const [key, setKey] = useState("")
  const [keyType, setKeyType] = useState("text")
  const [keySize, setKeySize] = useState("128")
  const [iv, setIv] = useState("")
  const [ivType, setIvType] = useState("text")
  const [mode, setMode] = useState("CBC")
  const [padding, setPadding] = useState("Pkcs7")
  const [formats, setFormats] = useState<AesFormatState>(DEFAULT_AES_FORMATS)
  const [fileOperation, setFileOperation] = useState<FileOperation>("encrypt")
  const [filePassword, setFilePassword] = useState("")
  const [filePasswordConfirm, setFilePasswordConfirm] = useState("")
  const [isLoaded, setIsLoaded] = useState(false)
  const inputFormat = formats[operation].input
  const outputFormat = formats[operation].output

  useEffect(() => {
    let mounted = true
    getStoredItem(STORAGE_KEY).then((stored) => {
      if (mounted && stored) {
        try {
          const state = JSON.parse(stored)
          setInput(state.aesInput || "")
          setOutput(state.aesOutput || "")
          setKey(state.aesKey || "")
          setKeyType(state.aesKeyType || "text")
          setKeySize(state.aesKeySize || "128")
          setIv(state.aesIv || "")
          setIvType(state.aesIvType || "text")
          setMode(state.aesMode || "CBC")
          setPadding(state.aesPadding || "Pkcs7")
          const restoredOperation: TextOperation = state.operation === "decrypt" || state.activeTab === "decrypt" ? "decrypt" : "encrypt"
          setOperation(restoredOperation)
          setFormats(normalizeFormats(state.aesFormats))
          if (state.activeTab === "fileEncrypt" || state.activeTab === "fileDecrypt") {
            setWorkspaceMode("file")
            setFileOperation(state.activeTab === "fileDecrypt" ? "decrypt" : "encrypt")
          } else if (state.workspaceMode === "file") {
            setWorkspaceMode("file")
            setFileOperation(state.fileOperation === "decrypt" ? "decrypt" : "encrypt")
          }
        } catch (error) {
          console.error("Failed to parse AES state", error)
        }
      }
      if (mounted) setIsLoaded(true)
    })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (!isLoaded) return
    void setStoredItem(STORAGE_KEY, JSON.stringify({
      aesInput: input, aesOutput: output, aesKey: key, aesKeyType: keyType, aesKeySize: keySize,
      aesIv: iv, aesIvType: ivType, aesMode: mode, aesPadding: padding, aesFormats: formats,
      operation, workspaceMode, fileOperation,
    }))
  }, [fileOperation, formats, input, isLoaded, iv, ivType, key, keySize, keyType, mode, operation, output, padding, workspaceMode])

  const parseKeyIv = (value: string, type: string, lengthBits?: number) => {
    let wordArray = type === "hex" ? CryptoJS.enc.Hex.parse(value) : CryptoJS.enc.Utf8.parse(value)
    if (!lengthBits) return wordArray
    const targetHexLength = (lengthBits / 8) * 2
    wordArray = CryptoJS.enc.Hex.parse(CryptoJS.enc.Hex.stringify(wordArray).padEnd(targetHexLength, "0").slice(0, targetHexLength))
    return wordArray
  }

  const parseData = (value: string, format: string) => format === "Hex" ? CryptoJS.enc.Hex.parse(value) : format === "Base64" ? CryptoJS.enc.Base64.parse(value) : CryptoJS.enc.Utf8.parse(value)
  const encodeData = (value: CryptoJS.lib.WordArray, format: string) => format === "String" ? value.toString(CryptoJS.enc.Utf8) : format === "Hex" ? value.toString(CryptoJS.enc.Hex) : value.toString(CryptoJS.enc.Base64)
  const cryptoMode = () => ({ CBC: CryptoJS.mode.CBC, ECB: CryptoJS.mode.ECB, CTR: CryptoJS.mode.CTR, OFB: CryptoJS.mode.OFB, CFB: CryptoJS.mode.CFB }[mode] || CryptoJS.mode.CBC)
  const cryptoPadding = () => ({ Pkcs7: CryptoJS.pad.Pkcs7, ZeroPadding: CryptoJS.pad.ZeroPadding, NoPadding: CryptoJS.pad.NoPadding, AnsiX923: CryptoJS.pad.AnsiX923, Iso10126: CryptoJS.pad.Iso10126 }[padding] || CryptoJS.pad.Pkcs7)

  const runTextOperation = () => {
    if (!input) return
    const parsedKey = parseKeyIv(key, keyType, Number(keySize))
    const parsedIv = mode === "ECB" ? undefined : parseKeyIv(iv, ivType, 128)
    try {
      let result: string
      if (operation === "encrypt") {
        const encrypted = CryptoJS.AES.encrypt(parseData(input, inputFormat), parsedKey, { mode: cryptoMode(), padding: cryptoPadding(), iv: parsedIv })
        result = encodeData(encrypted.ciphertext, outputFormat)
      } else {
        const decrypted = CryptoJS.AES.decrypt({ ciphertext: parseData(input, inputFormat) } as CryptoJS.lib.CipherParams, parsedKey, { mode: cryptoMode(), padding: cryptoPadding(), iv: parsedIv })
        result = encodeData(decrypted, outputFormat)
        if (outputFormat === "String" && decrypted.sigBytes > 0 && !result) throw new Error(t("tools.hash.decryptionFailed"))
      }
      setOutput(result)
      addLog({ method: `AES ${operation === "encrypt" ? "Encrypt" : "Decrypt"} (${mode}, ${keySize}-bit)`, input, output: result, cryptoParams: { algorithm: "AES", mode, key_size: `${keySize}-bit`, padding } }, "success")
    } catch (error) {
      addLog({ method: `AES ${operation}`, input, output: error instanceof Error ? error.message : String(error) }, "error")
    }
  }

  const updateInputFormat = (value: string) => {
    const next = operation === "decrypt" && value === "String" ? "Base64" : value
    setFormats((current) => normalizeFormats({ ...current, [operation]: { ...current[operation], input: next } }))
  }
  const updateOutputFormat = (value: string) => {
    const next = operation === "encrypt" && value === "String" ? "Base64" : value
    setFormats((current) => normalizeFormats({ ...current, [operation]: { ...current[operation], output: next } }))
  }
  const clearText = () => {
    setInput(""); setOutput(""); setKey(""); setIv(""); setFormats(DEFAULT_AES_FORMATS); void removeStoredItem(STORAGE_KEY)
  }
  const defaultFileOutput = (inputName: string) => fileOperation === "encrypt" ? `${inputName}.tkaes` : /\.tkaes$/i.test(inputName) ? inputName.replace(/\.tkaes$/i, "") || `${inputName}.decrypted` : `${inputName}.decrypted`
  const filePasswordValid = filePassword.length > 0 && (fileOperation === "decrypt" || filePassword === filePasswordConfirm)
  const passwordValidation = !filePassword ? t("tools.fileAes.passwordRequired") : fileOperation === "encrypt" && filePassword !== filePasswordConfirm ? t("tools.fileAes.passwordMismatch") : undefined

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex min-h-[46px] shrink-0 items-center rounded-xl border border-default-200 bg-default-50/70 p-1.5">
        <ButtonGroup size="sm" variant="light" className="rounded-lg border border-default-200 bg-background p-0.5">
          <Button color={workspaceMode === "text" ? "primary" : "default"} variant={workspaceMode === "text" ? "flat" : "light"} onPress={() => setWorkspaceMode("text")} startContent={<Type className="h-4 w-4" />}>{t("tools.fileWorkbench.textMode")}</Button>
          <Button color={workspaceMode === "file" ? "primary" : "default"} variant={workspaceMode === "file" ? "flat" : "light"} onPress={() => setWorkspaceMode("file")} startContent={<File className="h-4 w-4" />}>{t("tools.fileWorkbench.fileMode")}</Button>
        </ButtonGroup>
      </div>

      {workspaceMode === "text" ? <div className="min-h-0 flex-1">
        <HashWorkbench
          id="aes" input={input} onInputChange={setInput} inputPlaceholder={t("tools.hash.aesInputPlaceholder")} output={output} onClear={clearText}
          toolbarContent={<>
            <HashOperationSwitch ariaLabel="AES" value={operation} onChange={(next) => { setOperation(next); setOutput("") }} options={[{ value: "encrypt", label: t("tools.hash.encrypt") }, { value: "decrypt", label: t("tools.hash.decrypt") }]} />
            <HashToolbarField label={t("tools.hash.inputFormat")}><Select aria-label={t("tools.hash.inputFormat")} className="w-28" classNames={{ trigger: "h-8 bg-background px-2.5 text-xs" }} selectedKeys={[inputFormat]} onChange={(event) => updateInputFormat(event.target.value)}><SelectItem key="String" isDisabled={operation !== "encrypt"}>{t("tools.hash.text")}</SelectItem><SelectItem key="Base64">Base64</SelectItem><SelectItem key="Hex">Hex</SelectItem></Select></HashToolbarField>
            <span className="text-sm text-default-400">→</span>
            <HashToolbarField label={t("tools.hash.outputFormat")}><Select aria-label={t("tools.hash.outputFormat")} className="w-28" classNames={{ trigger: "h-8 bg-background px-2.5 text-xs" }} selectedKeys={[outputFormat]} onChange={(event) => updateOutputFormat(event.target.value)}><SelectItem key="String" isDisabled={operation !== "decrypt"}>{t("tools.hash.text")}</SelectItem><SelectItem key="Base64">Base64</SelectItem><SelectItem key="Hex">Hex</SelectItem></Select></HashToolbarField>
          </>}
          configContent={<div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(min(100%,19rem),1fr))]">
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_104px_88px] gap-2">
              <Input size="sm" label={t("tools.hash.key")} placeholder={t("tools.hash.keyPlaceholder")} value={key} onValueChange={setKey} className="min-w-0" classNames={{ inputWrapper: "h-9 min-h-9 bg-background" }} />
              <Select size="sm" label={t("tools.hash.keySize")} selectedKeys={[keySize]} onChange={(event) => setKeySize(event.target.value)}><SelectItem key="128">128 bit</SelectItem><SelectItem key="192">192 bit</SelectItem><SelectItem key="256">256 bit</SelectItem></Select>
              <Select size="sm" label={t("tools.hash.type")} selectedKeys={[keyType]} onChange={(event) => setKeyType(event.target.value)}><SelectItem key="text">{t("tools.hash.text")}</SelectItem><SelectItem key="hex">Hex</SelectItem></Select>
            </div>
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_88px] gap-2">
              <Input size="sm" label={t("tools.hash.iv")} value={iv} onValueChange={setIv} isDisabled={mode === "ECB"} classNames={{ inputWrapper: "h-9 min-h-9 bg-background" }} />
              <Select size="sm" label={t("tools.hash.type")} selectedKeys={[ivType]} onChange={(event) => setIvType(event.target.value)} isDisabled={mode === "ECB"}><SelectItem key="text">{t("tools.hash.text")}</SelectItem><SelectItem key="hex">Hex</SelectItem></Select>
            </div>
            <div className="grid min-w-0 grid-cols-[104px_144px] gap-2">
              <Select size="sm" label={t("tools.hash.mode")} selectedKeys={[mode]} onChange={(event) => setMode(event.target.value)}>{["CBC", "ECB", "CTR", "OFB", "CFB"].map((item) => <SelectItem key={item}>{item}</SelectItem>)}</Select>
              <Select size="sm" label={t("tools.hash.padding")} selectedKeys={[padding]} onChange={(event) => setPadding(event.target.value)}><SelectItem key="Pkcs7">PKCS7</SelectItem><SelectItem key="ZeroPadding">Zero Padding</SelectItem><SelectItem key="AnsiX923">ANSI X.923</SelectItem><SelectItem key="Iso10126">ISO 10126</SelectItem><SelectItem key="NoPadding">No Padding</SelectItem></Select>
            </div>
          </div>}
          actions={<Button size="sm" color="primary" onPress={runTextOperation} isDisabled={!input} startContent={operation === "encrypt" ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}>{operation === "encrypt" ? t("tools.hash.encrypt") : t("tools.hash.decrypt")}</Button>}
        />
      </div> : <div className="min-h-0 flex-1 overflow-y-auto pb-2">
        <FileWorkbench
          key={fileOperation} title={t("tools.fileAes.title")} description={t("tools.fileAes.description")} operationLabel={fileOperation === "encrypt" ? t("tools.hash.fileEncrypt") : t("tools.hash.fileDecrypt")}
          inputFilters={fileOperation === "decrypt" ? [{ name: "TroveKit AES", extensions: ["tkaes"] }] : undefined}
          outputFilters={fileOperation === "encrypt" ? [{ name: "TroveKit AES", extensions: ["tkaes"] }] : undefined}
          requiresOutput defaultOutputName={defaultFileOutput} canRun={filePasswordValid} validationMessage={passwordValidation}
          controls={<div className="space-y-3 rounded-xl border border-default-200 bg-default-50/60 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <ButtonGroup size="sm" variant="light" className="rounded-lg border border-default-200 bg-background p-0.5">
                <Button color={fileOperation === "encrypt" ? "primary" : "default"} variant={fileOperation === "encrypt" ? "flat" : "light"} onPress={() => { setFileOperation("encrypt"); setFilePasswordConfirm("") }} startContent={<Lock className="h-4 w-4" />}>{t("tools.hash.fileEncrypt")}</Button>
                <Button color={fileOperation === "decrypt" ? "primary" : "default"} variant={fileOperation === "decrypt" ? "flat" : "light"} onPress={() => { setFileOperation("decrypt"); setFilePasswordConfirm("") }} startContent={<Unlock className="h-4 w-4" />}>{t("tools.hash.fileDecrypt")}</Button>
              </ButtonGroup>
              <span className="text-[11px] text-default-500">AES-256-GCM · Argon2id · 1 MiB chunks</span>
            </div>
            <div className={`grid gap-2 ${fileOperation === "encrypt" ? "sm:grid-cols-2" : "grid-cols-1"}`}>
              <Input label={t("tools.fileAes.password")} type="password" value={filePassword} onValueChange={setFilePassword} autoComplete="new-password" />
              {fileOperation === "encrypt" && <Input label={t("tools.fileAes.confirmPassword")} type="password" value={filePasswordConfirm} onValueChange={setFilePasswordConfirm} autoComplete="new-password" />}
            </div>
            <p className="text-[11px] leading-relaxed text-default-500">{t("tools.fileAes.securityNote")}</p>
          </div>}
          onRun={async ({ inputPath, outputPath, onProgress }) => {
            const command = fileOperation === "encrypt" ? "aes_encrypt_file" : "aes_decrypt_file"
            try {
              const result = await runFileCommand<FileOperationResult>(command, { inputPath, outputPath, password: filePassword }, onProgress)
              addLog({ method: `AES-256-GCM File ${fileOperation === "encrypt" ? "Encrypt" : "Decrypt"}`, input: fileNameFromPath(inputPath), output: result.outputPath, cryptoParams: { algorithm: "AES-256-GCM", key_derivation: "Argon2id" } }, "success")
              return { message: t("tools.fileAes.completed", { path: result.outputPath }), outputPath: result.outputPath }
            } catch (error) {
              addLog({ method: `AES File ${fileOperation}`, input: fileNameFromPath(inputPath), output: error instanceof Error ? error.message : String(error) }, "error")
              throw error
            }
          }}
        />
      </div>}
    </div>
  )
}
