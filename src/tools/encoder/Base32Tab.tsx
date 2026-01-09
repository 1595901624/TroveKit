import { useState, useEffect } from "react"
import { Textarea, Button } from "@heroui/react"
import { Copy, Trash2, ArrowDownUp, ChevronDown } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLog } from "../../contexts/LogContext"
import { base32Encode, base32Decode } from "../../lib/base32"

const STORAGE_KEY = "base32-tool-state"

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

export function Base32Tab() {
  const { t } = useTranslation()
  const { addLog } = useLog()

  const savedState = loadStateFromStorage()

  const [base32Input, setBase32Input] = useState(savedState.base32Input || "")
  const [base32Output, setBase32Output] = useState(savedState.base32Output || "")

  useEffect(() => {
    saveStateToStorage({ base32Input, base32Output })
  }, [base32Input, base32Output])

  const handleBase32Encode = () => {
    if (!base32Input) return
    try {
      const result = base32Encode(base32Input)
      setBase32Output(result)
      addLog({ method: "Base32 Encode", input: base32Input, output: result }, "success")
    } catch (e) {
      addLog({ method: "Base32 Encode", input: base32Input, output: (e as Error).message }, "error")
    }
  }

  const handleBase32Decode = () => {
    if (!base32Input) return
    try {
      const result = base32Decode(base32Input)
      setBase32Output(result)
      addLog({ method: "Base32 Decode", input: base32Input, output: result }, "success")
    } catch (e) {
      addLog({ method: "Base32 Decode", input: base32Input, output: (e as Error).message }, "error")
    }
  }

  const swapBase32 = () => {
    setBase32Input(base32Output)
    setBase32Output(base32Input)
  }

  const copyToClipboard = (text: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="space-y-4">
      <Textarea
        label={t("tools.encoder.input")}
        placeholder={t("tools.encoder.base32Placeholder")}
        minRows={6}
        variant="bordered"
        value={base32Input}
        onValueChange={setBase32Input}
        classNames={{
          inputWrapper: "bg-default-100/50 hover:bg-default-100 focus-within:bg-background"
        }}
      />

      <div className="flex items-center justify-center gap-4 py-2">
        <Button color="primary" variant="flat" onPress={handleBase32Encode} startContent={<ChevronDown className="w-4 h-4" />}>
          {t("tools.encoder.encode")}
        </Button>
        <Button color="secondary" variant="flat" onPress={handleBase32Decode} startContent={<ChevronDown className="w-4 h-4" />}>
          {t("tools.encoder.decode")}
        </Button>
        <Button isIconOnly variant="light" onPress={swapBase32} title={t("tools.encoder.swap")}>
          <ArrowDownUp className="w-4 h-4" />
        </Button>
        <Button isIconOnly variant="light" color="danger" onPress={() => { setBase32Input(""); setBase32Output(""); localStorage.removeItem(STORAGE_KEY); }} title={t("tools.encoder.clearAll")}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="relative group">
        <Textarea
          label={t("tools.encoder.output")}
          readOnly
          minRows={6}
          variant="bordered"
          value={base32Output}
          classNames={{
            inputWrapper: "bg-default-100/30 group-hover:bg-default-100/50 transition-colors font-mono text-tiny"
          }}
        />
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button isIconOnly size="sm" variant="flat" onPress={() => copyToClipboard(base32Output)} title={t("tools.encoder.copy")}>
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
