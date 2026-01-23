import { useEffect, useState } from "react"
import { Button, Input, Radio, RadioGroup, Select, SelectItem, Textarea } from "@heroui/react"
import { Copy, Lock, Trash2, Unlock } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLog } from "../../contexts/LogContext"
import { getStoredItem, removeStoredItem, setStoredItem } from "../../lib/store"
import { chacha20 } from "@noble/ciphers/chacha.js"

const STORAGE_KEY = "chacha20-tool-state"

function utf8ToBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s)
}

function bytesToUtf8(bytes: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes)
}

function bytesToHex(bytes: Uint8Array): string {
  let out = ""
  for (const b of bytes) out += b.toString(16).padStart(2, "0")
  return out
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim().replace(/^0x/i, "").replace(/\s+/g, "")
  if (clean.length === 0) return new Uint8Array()
  if (clean.length % 2 !== 0) throw new Error("Invalid hex length")
  const out = new Uint8Array(clean.length / 2)
  for (let i = 0; i < out.length; i++) {
    const byte = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16)
    if (Number.isNaN(byte)) throw new Error("Invalid hex")
    out[i] = byte
  }
  return out
}

// Helper to convert Uint8Array to Base64
function bytesToBase64(bytes: Uint8Array): string {
  let binary = ""
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

// Helper to convert Base64 to Uint8Array
function base64ToBytes(base64: string): Uint8Array {
  const binary = window.atob(base64)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export function ChaCha20Tab() {
  const { t } = useTranslation()
  const { addLog } = useLog()

  const [input, setInput] = useState<string>(() => t("tools.hash.defaultInput", "Hello, TroveKit"))
  const [output, setOutput] = useState("")

  const [key, setKey] = useState("")
  const [keyType, setKeyType] = useState("hex") // hex | text
  const [nonce, setNonce] = useState("")
  const [nonceType, setNonceType] = useState("hex") // hex | text

  const [format, setFormat] = useState("Base64") // Hex | Base64
  const [caseOption, setCaseOption] = useState<"lower" | "upper">("lower")
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    let mounted = true
    getStoredItem(STORAGE_KEY).then((stored) => {
      if (mounted && stored) {
        try {
          const state = JSON.parse(stored)
          if (state.input) setInput(state.input)
          if (state.output) setOutput(state.output)
          if (state.key) setKey(state.key)
          if (state.keyType) setKeyType(state.keyType)
          if (state.nonce) setNonce(state.nonce)
          if (state.nonceType) setNonceType(state.nonceType)
          if (state.format) setFormat(state.format)
          if (state.caseOption) setCaseOption(state.caseOption)
        } catch (e) {
          console.error("Failed to parse ChaCha20Tab state", e)
        }
      }
      if (mounted) setIsLoaded(true)
    })
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!isLoaded) return
    setStoredItem(
      STORAGE_KEY,
      JSON.stringify({
        input,
        output,
        key,
        keyType,
        nonce,
        nonceType,
        format,
        caseOption
      })
    )
  }, [input, output, key, keyType, nonce, nonceType, format, caseOption, isLoaded])

  const parseKeyOrNonce = (value: string, type: string, expectedBytes: number | number[]) => {
    let bytes: Uint8Array
    if (type === "hex") {
      // Remove spaces and 0x prefix if present for user convenience
      const clean = value.replace(/\s/g, "").replace(/^0x/i, "")
      if (!clean) return new Uint8Array(typeof expectedBytes === "number" ? expectedBytes : expectedBytes[0])
      bytes = hexToBytes(clean)
    } else {
      bytes = utf8ToBytes(value)
    }

    // Check if valid length
    const allowed = Array.isArray(expectedBytes) ? expectedBytes : [expectedBytes]
    if (!allowed.includes(bytes.length)) {
       // Auto-pad or truncate?
       // For security tools, usually better to throw or warn. 
       // But to be user friendly like other tabs, we might pad/truncate.
       // Let's truncate or zero-pad to the FIRST expected length.
       const target = allowed[0]
       const newBytes = new Uint8Array(target)
       newBytes.set(bytes.slice(0, target))
       return newBytes
    }

    return bytes
  }

  // Case selector for Hex output
  const CaseSelector = () => (
    <RadioGroup
      orientation="horizontal"
      value={caseOption}
      onValueChange={(v) => setCaseOption(v === "upper" ? "upper" : "lower")}
      label={t("tools.hash.case", "Case")}
      size="sm"
      className="text-tiny"
    >
      <Radio value="lower">{t("tools.hash.lowercase", "Lowercase")}</Radio>
      <Radio value="upper">{t("tools.hash.uppercase", "Uppercase")}</Radio>
    </RadioGroup>
  )

  const handleProcess = (mode: "encrypt" | "decrypt") => {
    if (!input) return
    try {
      // ChaCha20 Key: 32 bytes (256 bits)
      const keyBytes = parseKeyOrNonce(key, keyType, 32)
      // ChaCha20 Nonce: 12 bytes (96 bits) or 8 bytes (64 bits)
      const nonceBytes = parseKeyOrNonce(nonce, nonceType, [12, 8])

      let dataBytes: Uint8Array
      if (mode === "encrypt") {
        dataBytes = utf8ToBytes(input)
      } else {
        // Decrypt
        if (format === "Hex") {
          const clean = input.replace(/\s/g, "").replace(/^0x/i, "")
          dataBytes = hexToBytes(clean)
        } else {
          dataBytes = base64ToBytes(input)
        }
      }

      const resultBytes = chacha20(keyBytes, nonceBytes, dataBytes)

      let outString = ""
      if (mode === "encrypt") {
        if (format === "Hex") {
          outString = bytesToHex(resultBytes)
          outString = caseOption === "upper" ? outString.toUpperCase() : outString.toLowerCase()
        } else {
          outString = bytesToBase64(resultBytes)
        }
      } else {
        outString = bytesToUtf8(resultBytes)
      }

      setOutput(outString)

      const methodLabel = `${t("tools.hash.chacha20")} ${mode === "encrypt" ? t("tools.hash.encrypt") : t("tools.hash.decrypt")}`
      addLog(
        {
          method: methodLabel,
          input,
          output: outString,
          cryptoParams: {
            algorithm: "ChaCha20",
            format,
            key: keyType === "hex" ? bytesToHex(keyBytes) : key,
            nonce: nonceType === "hex" ? bytesToHex(nonceBytes) : nonce,
            mode: t("tools.hash.stream", "Stream")
          }
        },
        "success"
      )

    } catch (e) {
      setOutput("")
      let errMsg = e instanceof Error ? e.message : String(e)
      if (errMsg === "Invalid hex length") errMsg = t("tools.hash.errors.invalidHexLength")
      else if (errMsg === "Invalid hex") errMsg = t("tools.hash.errors.invalidHex")
      const methodLabel = `${t("tools.hash.chacha20")} ${mode === "encrypt" ? t("tools.hash.encrypt") : t("tools.hash.decrypt")}`
      addLog({ method: methodLabel, input, output: errMsg }, "error")
    }
  }

  const copyToClipboard = (text: string) => {
    if (!text) return
    let out = text
    if (format === "Hex") {
      out = caseOption === "upper" ? text.toUpperCase() : text.toLowerCase()
    }
    navigator.clipboard.writeText(out)
  }

  const clearAll = () => {
    setInput("")
    setOutput("")
    setKey("")
    setNonce("")
    removeStoredItem(STORAGE_KEY)
  }

  return (
    <div className="space-y-4">
      <Textarea
        label={t("tools.hash.inputLabel", "Input Text")}
        placeholder={t("tools.hash.aesInputPlaceholder", "Enter text...")}
        minRows={4}
        variant="bordered"
        value={input}
        onValueChange={setInput}
        classNames={{
            inputWrapper: "bg-default-100/50 hover:bg-default-100 focus-within:bg-background"
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-2 bg-default-50 rounded-lg">
        <div className="space-y-3">
          {/* Key Input */}
          <div className="flex gap-2">
            <Input
              size="sm"
              label={t("tools.hash.key")}
              placeholder={t("tools.hash.keyPlaceholder32", "32 bytes (Hex)")}
              value={key}
              onValueChange={setKey}
              className="flex-1"
            />
            <Select
              size="sm"
              label={t("tools.hash.type", "Type")}
              className="w-24"
              selectedKeys={new Set([keyType])}
              onSelectionChange={(k) => setKeyType(Array.from(k)[0] as string)}
              disallowEmptySelection
            >
              <SelectItem key="text">{t("tools.hash.text")}</SelectItem>
              <SelectItem key="hex">{t("tools.hash.hex")}</SelectItem>
            </Select>
          </div>

          {/* Nonce Input */}
          <div className="flex gap-2">
            <Input
              size="sm"
              label={t("tools.hash.nonce", "Nonce")}
              placeholder={t("tools.hash.noncePlaceholder", "12 bytes (Hex)")}
              value={nonce}
              onValueChange={setNonce}
              className="flex-1"
            />
            <Select
              size="sm"
              label={t("tools.hash.type", "Type")}
              className="w-24"
              selectedKeys={new Set([nonceType])}
              onSelectionChange={(k) => setNonceType(Array.from(k)[0] as string)}
              disallowEmptySelection
            >
              <SelectItem key="text">{t("tools.hash.text")}</SelectItem>
              <SelectItem key="hex">{t("tools.hash.hex")}</SelectItem>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <RadioGroup
            orientation="horizontal"
            value={format}
            onValueChange={setFormat}
            label={t("tools.hash.format", "Format")}
            description={t("tools.hash.formatNote")}
            size="sm"
            className="text-tiny"
          >
            <Radio value="Base64">{t("tools.hash.base64", "Base64")}</Radio>
            <Radio value="Hex">{t("tools.hash.hex", "Hex")}</Radio>
          </RadioGroup>
          {format === "Hex" && <CaseSelector />}
        </div>
      </div>

      <div className="flex items-center gap-2 justify-end">
        <Button color="primary" variant="flat" onPress={() => handleProcess("encrypt")} startContent={<Lock className="w-4 h-4" />}>
          {t("tools.hash.encrypt")}
        </Button>
        <Button color="secondary" variant="flat" onPress={() => handleProcess("decrypt")} startContent={<Unlock className="w-4 h-4" />}>
          {t("tools.hash.decrypt")}
        </Button>
        <Button isIconOnly variant="light" color="danger" onPress={clearAll} title={t("tools.hash.clearAll")}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="relative group">
        <Textarea
          label={t("tools.hash.outputLabel", "Output")}
          readOnly
          minRows={4}
          variant="bordered"
          value={output}
          classNames={{
            inputWrapper: "bg-default-100/30 group-hover:bg-default-100/50 transition-colors font-mono text-tiny"
          }}
        />
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button isIconOnly size="sm" variant="flat" onPress={() => copyToClipboard(output)} title={t("tools.hash.copy", "Copy")}>
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
