import { useState, useEffect } from "react"
import { Textarea, Button, Select, SelectItem, Switch, Input } from "@heroui/react"
import { Copy, Trash2, ArrowDownUp, ChevronDown } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLog } from "../../contexts/LogContext"
import { invoke } from "@tauri-apps/api/core"

const STORAGE_KEY = "basex-tool-state"

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

export function BaseXTab() {
  const { t } = useTranslation()
  const { addLog } = useLog()

  const savedState = loadStateFromStorage()

  const [baseXInput, setBaseXInput] = useState(savedState.baseXInput || "")
  const [baseXOutput, setBaseXOutput] = useState(savedState.baseXOutput || "")
  const [selectedBase, setSelectedBase] = useState(savedState.selectedBase || "base16")
  const [isCustomAlphabet, setIsCustomAlphabet] = useState(savedState.isCustomAlphabet || false)
  const [customAlphabet, setCustomAlphabet] = useState(savedState.customAlphabet || "")

  useEffect(() => {
    saveStateToStorage({ baseXInput, baseXOutput, selectedBase, isCustomAlphabet, customAlphabet })
  }, [baseXInput, baseXOutput, selectedBase, isCustomAlphabet, customAlphabet])

  const baseOptions = [
    { key: "base16", label: t("tools.encoder.base16") },
    { key: "base32", label: t("tools.encoder.base32") },
    { key: "base58", label: t("tools.encoder.base58") },
    { key: "base62", label: t("tools.encoder.base62") },
    { key: "base64", label: t("tools.encoder.base64") },
    // { key: "base85", label: t("tools.encoder.base85") },
    { key: "base91", label: t("tools.encoder.base91") },
  ]

  const handleBaseXEncode = async () => {
    if (!baseXInput) return
    try {
      const result = await invoke<string>("basex_encode", {
        input: baseXInput,
        base: selectedBase,
        alphabet: isCustomAlphabet ? customAlphabet : null
      })
      setBaseXOutput(result)
      addLog({ method: `BaseX Encode (${selectedBase})`, input: baseXInput, output: result }, "success")
    } catch (e) {
      setBaseXOutput("")
      addLog({ method: `BaseX Encode (${selectedBase})`, input: baseXInput, output: String(e) }, "error")
    }
  }

  const handleBaseXDecode = async () => {
    if (!baseXInput) return
    try {
      const result = await invoke<string>("basex_decode", {
        input: baseXInput,
        base: selectedBase,
        alphabet: isCustomAlphabet ? customAlphabet : null
      })
      setBaseXOutput(result)
      addLog({ method: `BaseX Decode (${selectedBase})`, input: baseXInput, output: result }, "success")
    } catch (e) {
      setBaseXOutput("")
      addLog({ method: `BaseX Decode (${selectedBase})`, input: baseXInput, output: String(e) }, "error")
    }
  }

  const swapBaseX = () => {
    setBaseXInput(baseXOutput)
    setBaseXOutput(baseXInput)
  }

  const copyToClipboard = (text: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    addLog(t("tools.encoder.copiedToClipboard"), "info")
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-4 items-end">
          <Select
            label={t("tools.encoder.base")}
            className="max-w-xs"
            selectedKeys={[selectedBase]}
            onChange={(e) => setSelectedBase(e.target.value)}
          >
            {baseOptions.map((opt) => (
              <SelectItem key={opt.key}>{opt.label}</SelectItem>
            ))}
          </Select>

          <div className="flex items-center pb-2">
            <Switch isSelected={isCustomAlphabet} onValueChange={setIsCustomAlphabet}>
              {t("tools.encoder.useCustomAlphabet")}
            </Switch>
          </div>
        </div>
        
        {isCustomAlphabet && (
          <Input
            label={t("tools.encoder.alphabet")}
            placeholder={t("tools.encoder.alphabet")}
            value={customAlphabet}
            onValueChange={setCustomAlphabet}
            variant="bordered"
            classNames={{
              inputWrapper: "bg-default-100/50 hover:bg-default-100 focus-within:bg-background"
            }}
          />
        )}
      </div>

      <Textarea
        label={t("tools.encoder.input")}
        placeholder={t("tools.encoder.baseXPlaceholder")}
        minRows={6}
        variant="bordered"
        value={baseXInput}
        onValueChange={setBaseXInput}
        classNames={{
          inputWrapper: "bg-default-100/50 hover:bg-default-100 focus-within:bg-background"
        }}
      />

      <div className="flex items-center justify-center gap-4 py-2">
        <Button color="primary" variant="flat" onPress={handleBaseXEncode} startContent={<ChevronDown className="w-4 h-4" />}>
          {t("tools.encoder.encode")}
        </Button>
        <Button color="secondary" variant="flat" onPress={handleBaseXDecode} startContent={<ChevronDown className="w-4 h-4" />}>
          {t("tools.encoder.decode")}
        </Button>
        <Button isIconOnly variant="light" onPress={swapBaseX} title={t("tools.encoder.swap")}>
          <ArrowDownUp className="w-4 h-4" />
        </Button>
        <Button isIconOnly variant="light" color="danger" onPress={() => { setBaseXInput(""); setBaseXOutput(""); localStorage.removeItem(STORAGE_KEY); }} title={t("tools.encoder.clearAll")}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="relative group">
        <Textarea
          label={t("tools.encoder.output")}
          readOnly
          minRows={6}
          variant="bordered"
          value={baseXOutput}
          classNames={{
            inputWrapper: "bg-default-100/30 group-hover:bg-default-100/50 transition-colors"
          }}
        />
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button isIconOnly size="sm" variant="flat" onPress={() => copyToClipboard(baseXOutput)} title={t("tools.encoder.copy")}>
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
