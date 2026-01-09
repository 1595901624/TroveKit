import { useState, useEffect } from "react"
import { Textarea, Button, Select, SelectItem } from "@heroui/react"
import { Copy, Trash2, ArrowDownUp, ChevronDown } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLog } from "../../contexts/LogContext"

const STORAGE_KEY = "hex-tool-state"

const loadStateFromStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

const saveStateToStorage = (state: Record<string, any>) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function HexTab() {
  const { t } = useTranslation()
  const { addLog } = useLog()

  const savedState = loadStateFromStorage()

  const [hexInput, setHexInput] = useState(savedState.hexInput || "")
  const [hexOutput, setHexOutput] = useState(savedState.hexOutput || "")
  const [newlineMode, setNewlineMode] = useState(savedState.newlineMode || "lf")

  useEffect(() => {
    saveStateToStorage({ hexInput, hexOutput, newlineMode })
  }, [hexInput, hexOutput, newlineMode])

  const newlineOptions = [
    { key: "lf", label: t("tools.encoder.lf") },
    { key: "crlf", label: t("tools.encoder.crlf") },
  ]

  const handleHexEncode = () => {
    if (!hexInput) return
    try {
      let text = hexInput
      if (newlineMode === "crlf") {
        // Normalize to \n first, then to \r\n
        text = text.replace(/\r\n/g, "\n").replace(/\n/g, "\r\n")
      } else {
        // Normalize to \n (LF)
        text = text.replace(/\r\n/g, "\n")
      }

      const encoder = new TextEncoder()
      const data = encoder.encode(text)
      const hex = Array.from(data)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
      
      setHexOutput(hex)
      addLog({ method: t("tools.encoder.hexEncode"), input: hexInput, output: hex }, "success")
    } catch (e) {
      addLog({ method: t("tools.encoder.hexEncode"), input: hexInput, output: (e as Error).message }, "error")
    }
  }

  const handleHexDecode = () => {
    if (!hexInput) return
    try {
      // Remove whitespace
      const cleanHex = hexInput.replace(/\s+/g, "")
      if (cleanHex.length % 2 !== 0) {
        throw new Error("Invalid hex string length")
      }

      const bytes = new Uint8Array(cleanHex.length / 2)
      for (let i = 0; i < cleanHex.length; i += 2) {
        bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16)
      }

      const decoder = new TextDecoder()
      const result = decoder.decode(bytes)
      
      setHexOutput(result)
      addLog({ method: t("tools.encoder.hexDecode"), input: hexInput, output: result }, "success")
    } catch (e) {
      addLog({ method: t("tools.encoder.hexDecode"), input: hexInput, output: (e as Error).message }, "error")
    }
  }

  const swapHex = () => {
    setHexInput(hexOutput)
    setHexOutput(hexInput)
  }

  const copyToClipboard = (text: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    addLog(t("tools.encoder.copiedToClipboard"), "info")
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Select
          label={t("tools.encoder.newlineMode")}
          className="max-w-xs"
          selectedKeys={[newlineMode]}
          onChange={(e) => setNewlineMode(e.target.value)}
          size="sm"
        >
          {newlineOptions.map((opt) => (
            <SelectItem key={opt.key}>{opt.label}</SelectItem>
          ))}
        </Select>
      </div>

      <Textarea
        label={t("tools.encoder.input")}
        placeholder={t("tools.encoder.hexPlaceholder")}
        minRows={6}
        variant="bordered"
        value={hexInput}
        onValueChange={setHexInput}
        classNames={{
          inputWrapper: "bg-default-100/50 hover:bg-default-100 focus-within:bg-background"
        }}
      />

      <div className="flex items-center justify-center gap-4 py-2">
        <Button color="primary" variant="flat" onPress={handleHexEncode} startContent={<ChevronDown className="w-4 h-4" />}>
          {t("tools.encoder.encode")}
        </Button>
        <Button color="secondary" variant="flat" onPress={handleHexDecode} startContent={<ChevronDown className="w-4 h-4" />}>
          {t("tools.encoder.decode")}
        </Button>
        <Button isIconOnly variant="light" onPress={swapHex} title={t("tools.encoder.swap")}>
          <ArrowDownUp className="w-4 h-4" />
        </Button>
        <Button isIconOnly variant="light" color="danger" onPress={() => { setHexInput(""); setHexOutput(""); localStorage.removeItem(STORAGE_KEY); }} title={t("tools.encoder.clearAll")}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="relative group">
        <Textarea
          label={t("tools.encoder.output")}
          readOnly
          minRows={6}
          variant="bordered"
          value={hexOutput}
          classNames={{
            inputWrapper: "bg-default-100/30 group-hover:bg-default-100/50 transition-colors font-mono text-tiny"
          }}
        />
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button isIconOnly size="sm" variant="flat" onPress={() => copyToClipboard(hexOutput)} title={t("tools.encoder.copy")}>
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
