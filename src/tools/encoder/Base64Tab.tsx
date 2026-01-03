import { useState, useEffect } from "react"
import { Textarea, Button } from "@heroui/react"
import { Copy, Trash2, ArrowDownUp, ChevronDown } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLog } from "../../contexts/LogContext"

const STORAGE_KEY = "base64-tool-state"

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

export function Base64Tab() {
  const { t } = useTranslation()
  const { addLog } = useLog()

  const savedState = loadStateFromStorage()

  const [base64Input, setBase64Input] = useState(savedState.base64Input || "")
  const [base64Output, setBase64Output] = useState(savedState.base64Output || "")

  useEffect(() => {
    saveStateToStorage({ base64Input, base64Output })
  }, [base64Input, base64Output])

  const handleBase64Encode = () => {
    if (!base64Input) return
    try {
      const encoder = new TextEncoder()
      const data = encoder.encode(base64Input)
      const binString = Array.from(data, (byte) => String.fromCodePoint(byte)).join("")
      const result = window.btoa(binString)
      setBase64Output(result)
      addLog({ method: "Base64 Encode", input: base64Input, output: result }, "success")
    } catch (e) {
      addLog({ method: "Base64 Encode", input: base64Input, output: (e as Error).message }, "error")
    }
  }

  const handleBase64Decode = () => {
    if (!base64Input) return
    try {
      const binString = window.atob(base64Input.trim())
      const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0)!)
      const decoder = new TextDecoder()
      const result = decoder.decode(bytes)
      setBase64Output(result)
      addLog({ method: "Base64 Decode", input: base64Input, output: result }, "success")
    } catch (e) {
      addLog({ method: "Base64 Decode", input: base64Input, output: (e as Error).message }, "error")
    }
  }

  const swapBase64 = () => {
    setBase64Input(base64Output)
    setBase64Output(base64Input)
  }

  const copyToClipboard = (text: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    addLog(t("tools.encoder.copiedToClipboard"), "info")
  }

  return (
    <div className="space-y-4">
      <Textarea
        label={t("tools.encoder.input")}
        placeholder={t("tools.encoder.base64Placeholder")}
        minRows={6}
        variant="bordered"
        value={base64Input}
        onValueChange={setBase64Input}
        classNames={{
          inputWrapper: "bg-default-100/50 hover:bg-default-100 focus-within:bg-background"
        }}
      />

      <div className="flex items-center justify-center gap-4 py-2">
        <Button color="primary" variant="flat" onPress={handleBase64Encode} startContent={<ChevronDown className="w-4 h-4" />}>
          {t("tools.encoder.encode")}
        </Button>
        <Button color="secondary" variant="flat" onPress={handleBase64Decode} startContent={<ChevronDown className="w-4 h-4" />}>
          {t("tools.encoder.decode")}
        </Button>
        <Button isIconOnly variant="light" onPress={swapBase64} title={t("tools.encoder.swap")}>
          <ArrowDownUp className="w-4 h-4" />
        </Button>
        <Button isIconOnly variant="light" color="danger" onPress={() => { setBase64Input(""); setBase64Output(""); localStorage.removeItem(STORAGE_KEY); }} title={t("tools.encoder.clearAll")}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="relative group">
        <Textarea
          label={t("tools.encoder.output")}
          readOnly
          minRows={6}
          variant="bordered"
          value={base64Output}
          classNames={{
            inputWrapper: "bg-default-100/30 group-hover:bg-default-100/50 transition-colors font-mono text-tiny"
          }}
        />
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button isIconOnly size="sm" variant="flat" onPress={() => copyToClipboard(base64Output)} title={t("tools.encoder.copy")}>
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
