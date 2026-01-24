import { useEffect, useState } from "react"
import { Button, Input, Radio, RadioGroup, Select, SelectItem, Textarea } from "@heroui/react"
import { Copy, Lock, Trash2, Unlock, RefreshCw } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLog } from "../../contexts/LogContext"
import { getStoredItem, removeStoredItem, setStoredItem } from "../../lib/store"
import { invoke } from "@tauri-apps/api/core"

const STORAGE_KEY = "trivium-tool-state"

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

function bytesToBase64(bytes: Uint8Array): string {
  // Browser-safe base64 encoding
  let binary = ""
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.trim().replace(/\s+/g, "")
  if (clean.length === 0) return new Uint8Array()
  const binary = atob(clean)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i) & 0xff
  return out
}

function normalize80Bit(bytes: Uint8Array): Uint8Array {
  // Trivium key/IV are exactly 80-bit = 10 bytes
  const out = new Uint8Array(10)
  out.set(bytes.subarray(0, 10))
  return out
}

function reverseBytes10(bytes: Uint8Array): Uint8Array {
  // Keep behavior explicit and stable: reverse exactly 10 bytes (80-bit).
  if (bytes.length !== 10) return bytes
  const out = new Uint8Array(10)
  for (let i = 0; i < 10; i++) out[i] = bytes[9 - i]
  return out
}

export function TriviumTab() {
  const { t } = useTranslation()
  const { addLog } = useLog()

  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")

  const [key, setKey] = useState("")
  const [keyType, setKeyType] = useState("hex")
  const [iv, setIv] = useState("")
  const [ivType, setIvType] = useState("hex")

  const [format, setFormat] = useState("Hex")
  const [caseOption, setCaseOption] = useState("lower" as "lower" | "upper")
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
          if (state.iv) setIv(state.iv)
          if (state.ivType) setIvType(state.ivType)
          if (state.format) setFormat(state.format)
          if (state.caseOption === "lower" || state.caseOption === "upper") setCaseOption(state.caseOption)
        } catch (e) {
          console.error("Failed to parse TriviumTab state", e)
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
        iv,
        ivType,
        format,
        caseOption
      })
    )
  }, [input, output, key, keyType, iv, ivType, format, caseOption, isLoaded])

  const parseKeyIv = (value: string, _type: string) => {
    if (!value) return normalize80Bit(new Uint8Array())
    // Only Hex format is currently supported for Key/IV. Text handling is commented out for now.
    // const raw = _type === "hex" ? hexToBytes(value) : utf8ToBytes(value)
    const raw = hexToBytes(value)
    const fixed = normalize80Bit(raw)
    // Convention note:
    // Many Trivium toolchains treat the provided hex as a big-endian 80-bit value.
    // To match the expected results (including the user-provided known vector),
    // we reverse the 10-byte sequence for Hex inputs.
    return reverseBytes10(fixed)
  }

  const parseCipherInput = (value: string) => {
    if (format === "Hex") return hexToBytes(value)
    return base64ToBytes(value)
  }

  const encodeCipherOutput = (bytes: Uint8Array) => {
    if (format === "Hex") {
      const hex = bytesToHex(bytes)
      return caseOption === "upper" ? hex.toUpperCase() : hex.toLowerCase()
    }
    return bytesToBase64(bytes)
  }

  // Case selector component extracted to avoid TSX parsing ambiguity when rendered inline.
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

  const handleGenerate = () => {
    // Generate 80-bit (10-byte) key and IV
    if (keyType === "hex") {
      const k = new Uint8Array(10)
      crypto.getRandomValues(k)
      setKey(bytesToHex(k))
    } else {
      // setKey(generateRandomString(10))
    }

    if (ivType === "hex") {
      const v = new Uint8Array(10)
      crypto.getRandomValues(v)
      setIv(bytesToHex(v))
    } else {
      // setIv(generateRandomString(10))
    }
  }

  const handleEncrypt = async () => { 
    if (!input) return
    try {
      const keyBytes = parseKeyIv(key, keyType)
      const ivBytes = parseKeyIv(iv, ivType)
      const plainBytes = utf8ToBytes(input)

      const cipher = await invoke<number[]>("trivium_xor", {
        key: Array.from(keyBytes),
        iv: Array.from(ivBytes),
        data: Array.from(plainBytes)
      })
      const cipherBytes = Uint8Array.from(cipher)
      const out = encodeCipherOutput(cipherBytes)
      setOutput(out)

      const keyLog = keyType === "hex" ? bytesToHex(keyBytes) : key
      const ivLog = ivType === "hex" ? bytesToHex(ivBytes) : iv

      addLog(
        {
          method: `Trivium Encrypt (${format})`,
          input,
          output: out,
          cryptoParams: {
            algorithm: "Trivium",
            format,
            key: keyLog,
            key_type: keyType,
            iv: ivLog,
            iv_type: ivType,
            key_size: "80-bit",
            iv_size: "80-bit"
          }
        },
        "success"
      )
    } catch (e) {
      addLog({ method: "Trivium Encrypt", input, output: (e as Error).message }, "error")
    }
  }

  const handleDecrypt = async () => {
    if (!input) return
    try {
      const keyBytes = parseKeyIv(key, keyType)
      const ivBytes = parseKeyIv(iv, ivType)
      const cipherBytes = parseCipherInput(input)

      const plain = await invoke<number[]>("trivium_xor", {
        key: Array.from(keyBytes),
        iv: Array.from(ivBytes),
        data: Array.from(cipherBytes)
      })
      const plainBytes = Uint8Array.from(plain)
      const out = bytesToUtf8(plainBytes)
      setOutput(out)

      const keyLog = keyType === "hex" ? bytesToHex(keyBytes) : key
      const ivLog = ivType === "hex" ? bytesToHex(ivBytes) : iv

      addLog(
        {
          method: `Trivium Decrypt (${format})`,
          input,
          output: out,
          cryptoParams: {
            algorithm: "Trivium",
            format,
            key: keyLog,
            key_type: keyType,
            iv: ivLog,
            iv_type: ivType,
            key_size: "80-bit",
            iv_size: "80-bit"
          }
        },
        "success"
      )
    } catch (e) {
      addLog({ method: "Trivium Decrypt", input, output: (e as Error).message }, "error")
    }
  }

  const copyToClipboard = (text: string) => {
    if (!text) return
    const out = format === "Hex" ? (caseOption === "upper" ? text.toUpperCase() : text.toLowerCase()) : text
    navigator.clipboard.writeText(out)
  }

  const clearAll = () => {
    setInput("")
    setOutput("")
    setKey("")
    setKeyType("hex")
    setIv("")
    setIvType("hex")
    setFormat("Hex")
    setCaseOption("lower")
    removeStoredItem(STORAGE_KEY)
  }

  return (
    <div className="space-y-4">
      <Textarea
        label={t("tools.hash.inputLabel", "Input Text")}
        placeholder={t("tools.hash.aesInputPlaceholder", "Enter text to encrypt/decrypt...")}
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
          <div className="flex gap-2">
            <Input
              size="sm"
              label={t("tools.hash.key")}
              placeholder={t("tools.hash.keyPlaceholder", "Key") + " (80-bit, Hex)"}
              value={key}
              onValueChange={setKey}
              className="flex-1"
            />
            <Select
              size="sm"
              label={t("tools.hash.hex")}
              className="w-24"
              selectedKeys={new Set(["hex"])}
              disallowEmptySelection
            >
              {/* <SelectItem key="text">{t("tools.hash.text")}</SelectItem> */}
              <SelectItem key="hex">{t("tools.hash.hex")}</SelectItem>
            </Select>
          </div>

          <div className="flex gap-2">
            <Input
              size="sm"
              label={t("tools.hash.iv")}
              placeholder={t("tools.hash.iv", "IV") + " (80-bit, Hex)"}
              value={iv}
              onValueChange={setIv}
              className="flex-1"
            />
            <Select
              size="sm"
              label={t("tools.hash.hex")}
              className="w-24"
              selectedKeys={new Set(["hex"])}
              disallowEmptySelection
            >
              {/* <SelectItem key="text">{t("tools.hash.text")}</SelectItem> */}
              <SelectItem key="hex">{t("tools.hash.hex")}</SelectItem>
            </Select>
          </div>

          <Button
            size="sm"
            variant="flat"
            startContent={<RefreshCw className="w-4 h-4" />}
            onPress={handleGenerate}
            title={t("tools.hash.generateRandom", "Generate Random Key & IV")}
          >
            {t("tools.hash.generateRandom", "Generate Random Key & IV")}
          </Button>
        </div>

        <div className="space-y-2">
          <RadioGroup
            orientation="horizontal"
            value={format}
            onValueChange={setFormat}
            label={t("tools.hash.format", "Format")}
            description={t("tools.hash.formatNote", "Encrypt: Output Format / Decrypt: Input Format")}
            size="sm"
            className="text-tiny"
          >
            <Radio value="Base64">Base64</Radio>
            <Radio value="Hex">Hex</Radio>
          </RadioGroup>

          {format === "Hex" && <CaseSelector />}

        </div>
      </div>

      <div className="flex items-center gap-2 justify-end">
        <Button color="primary" variant="flat" onPress={handleEncrypt} startContent={<Lock className="w-4 h-4" />}>
          {t("tools.hash.encrypt")}
        </Button>
        <Button color="secondary" variant="flat" onPress={handleDecrypt} startContent={<Unlock className="w-4 h-4" />}>
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
          value={format === "Hex" ? (caseOption === "upper" ? output.toUpperCase() : output.toLowerCase()) : output}
          classNames={{
            inputWrapper: "bg-default-100/30 group-hover:bg-default-100/50 transition-colors font-mono text-tiny"
          }}
        />
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button isIconOnly size="sm" variant="flat" onPress={() => copyToClipboard(output)}>
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
