import { useState, useEffect } from "react"
import { Textarea, Button, RadioGroup, Radio } from "@heroui/react"
import { Copy, Trash2, Hash } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLog } from "../../contexts/LogContext"
import md4 from "../../lib/md4"

interface Md4State {
  input: string
  output: string
  bit: string
  case: string
}

const MD4_STORAGE_KEY = "md4_state"

export function Md4Tab() {
  const { t } = useTranslation()
  const { addLog } = useLog()

  const [state, setState] = useState<Md4State>(() => {
    const saved = localStorage.getItem(MD4_STORAGE_KEY)
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
      }
    }

    return {
      input: "",
      output: "",
      bit: "32",
      case: "lower"
    }
  })

  const { input, output, bit, case: md4Case } = state

  useEffect(() => {
    localStorage.setItem(MD4_STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const handleMd4Hash = () => {
    if (!input) return
    try {
      let hash = md4(input)

      if (bit === "16") {
        hash = hash.substring(8, 24)
      }

      if (md4Case === "upper") {
        hash = hash.toUpperCase()
      }

      setState(prev => ({
        ...prev,
        output: hash
      }))

      addLog({
        method: `MD4 (${bit}-bit, ${md4Case})`,
        input,
        output: hash
      }, "success")

    } catch (e) {
      addLog({ method: "MD4", input, output: (e as Error).message }, "error")
    }
  }

  const copyToClipboard = (text: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    addLog(t("tools.hash.copiedToClipboard"), "info")
  }

  return (
    <div className="space-y-4">
      <Textarea
        label={t("tools.hash.inputLabel", "Input Text")}
        placeholder={t("tools.hash.inputPlaceholder", "Enter text to hash...")}
        minRows={6}
        variant="bordered"
        value={input}
        onValueChange={(value) => setState(prev => ({ ...prev, input: value }))}
        classNames={{
          inputWrapper: "bg-default-100/50 hover:bg-default-100 focus-within:bg-background"
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-4 py-2 px-1">
          <div className="flex items-center gap-6">
            <RadioGroup
              orientation="horizontal"
              value={bit}
              onValueChange={(value) => setState(prev => ({ ...prev, bit: value }))}
              label={t("tools.hash.length")}
              size="sm"
              className="text-tiny"
            >
              <Radio value="32">{t("tools.hash.bit32")}</Radio>
              <Radio value="16">{t("tools.hash.bit16")}</Radio>
            </RadioGroup>

            <RadioGroup
              orientation="horizontal"
              value={md4Case}
              onValueChange={(value) => setState(prev => ({ ...prev, case: value }))}
              label={t("tools.hash.case")}
              size="sm"
            >
              <Radio value="lower">{t("tools.hash.lowercase")}</Radio>
              <Radio value="upper">{t("tools.hash.uppercase")}</Radio>
            </RadioGroup>
          </div>

          <div className="flex items-center gap-2">
            <Button color="primary" variant="flat" onPress={handleMd4Hash} startContent={<Hash className="w-4 h-4" />}>
              {t("tools.hash.generate")}
            </Button>
            <Button isIconOnly variant="light" color="danger" onPress={() => {
              setState(prev => ({
                ...prev,
                input: "",
                output: ""
              }))
            }} title={t("tools.hash.clearAll") }>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
      </div>

      <div className="relative group">
        <Textarea
          label={t("tools.hash.outputLabel", "MD4 Output")}
          readOnly
          minRows={4}
          variant="bordered"
          value={output}
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