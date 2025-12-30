import { useState, useEffect } from "react"
import { Textarea, Button, RadioGroup, Radio } from "@heroui/react"
import { Copy, Trash2, Hash } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLog } from "../../contexts/LogContext"
import CryptoJS from "crypto-js"

const STORAGE_KEY = "sha-tool-state"

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

export function ShaTab() {
  const { t } = useTranslation()
  const { addLog } = useLog()

  const savedState = loadStateFromStorage()

  const [shaInput, setShaInput] = useState(savedState.shaInput || "")
  const [shaOutput, setShaOutput] = useState(savedState.shaOutput || "")
  const [shaType, setShaType] = useState(savedState.shaType || "SHA256") // "SHA1" | "SHA256" | "SHA512"
  const [shaCase, setShaCase] = useState(savedState.shaCase || "lower") // "lower" | "upper"

  const handleShaHash = () => {
    if (!shaInput) return
    try {
      let hash = ""
      switch (shaType) {
        case "SHA1":
          hash = CryptoJS.SHA1(shaInput).toString()
          break
        case "SHA224":
          hash = CryptoJS.SHA224(shaInput).toString()
          break
        case "SHA256":
          hash = CryptoJS.SHA256(shaInput).toString()
          break
        case "SHA384":
          hash = CryptoJS.SHA384(shaInput).toString()
          break
        case "SHA512":
          hash = CryptoJS.SHA512(shaInput).toString()
          break
        case "SHA3":
          hash = CryptoJS.SHA3(shaInput).toString()
          break
        default:
          return
      }

      if (shaCase === "upper") {
        hash = hash.toUpperCase()
      }

      setShaOutput(hash)
      addLog({ 
        method: `${shaType} (${shaCase})`, 
        input: shaInput, 
        output: hash 
      }, "success")

    } catch (e) {
      addLog({ method: shaType, input: shaInput, output: (e as Error).message }, "error")
    }
  }

  const copyToClipboard = (text: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    addLog(t("tools.hash.copiedToClipboard"), "info")
  }

  useEffect(() => {
    saveStateToStorage({
      shaInput,
      shaOutput,
      shaType,
      shaCase
    })
  }, [shaInput, shaOutput, shaType, shaCase])

  return (
    <div className="space-y-4">
      <Textarea
        label={t("tools.hash.inputLabel", "Input Text")}
        placeholder={t("tools.hash.inputPlaceholder", "Enter text to hash...")}
        minRows={6}
        variant="bordered"
        value={shaInput}
        onValueChange={setShaInput}
        classNames={{
          inputWrapper: "bg-default-100/50 hover:bg-default-100 focus-within:bg-background"
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-4 py-2 px-1">
          <div className="flex items-center gap-6">
            <RadioGroup
              orientation="horizontal"
              value={shaType}
              onValueChange={setShaType}
              label={t("tools.hash.algorithm")}
              size="sm"
              className="max-w-full"
            >
              <div className="flex flex-wrap gap-4">
                <Radio value="SHA1">{t("tools.hash.sha1")}</Radio>
                <Radio value="SHA224">{t("tools.hash.sha224")}</Radio>
                <Radio value="SHA256">{t("tools.hash.sha256")}</Radio>
                <Radio value="SHA384">{t("tools.hash.sha384")}</Radio>
                <Radio value="SHA512">{t("tools.hash.sha512")}</Radio>
                <Radio value="SHA3">{t("tools.hash.sha3")}</Radio>
              </div>
            </RadioGroup>

            <RadioGroup
              orientation="horizontal"
              value={shaCase}
              onValueChange={setShaCase}
              label={t("tools.hash.case")}
              size="sm"
            >
              <Radio value="lower">{t("tools.hash.lowercase")}</Radio>
              <Radio value="upper">{t("tools.hash.uppercase")}</Radio>
            </RadioGroup>
          </div>

          <div className="flex items-center gap-2">
            <Button color="primary" variant="flat" onPress={handleShaHash} startContent={<Hash className="w-4 h-4" />}>
              {t("tools.hash.generate")}
            </Button>
            <Button isIconOnly variant="light" color="danger" onPress={() => { setShaInput(""); setShaOutput(""); setShaType("SHA256"); setShaCase("lower"); localStorage.removeItem(STORAGE_KEY); }} title={t("tools.hash.clearAll")}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
      </div>

      <div className="relative group">
        <Textarea
          label={t("tools.hash.outputLabel", "Hash Output")}
          readOnly
          minRows={4}
          variant="bordered"
          value={shaOutput}
          classNames={{
            inputWrapper: "bg-default-100/30 group-hover:bg-default-100/50 transition-colors font-mono text-small"
          }}
        />
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button isIconOnly size="sm" variant="flat" onPress={() => copyToClipboard(shaOutput)}>
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
