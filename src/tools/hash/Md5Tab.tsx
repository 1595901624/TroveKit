import { useState } from "react"
import { Textarea, Button, RadioGroup, Radio } from "@heroui/react"
import { Copy, Trash2, Hash } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLog } from "../../contexts/LogContext"
import CryptoJS from "crypto-js"

export function Md5Tab() {
  const { t } = useTranslation()
  const { addLog } = useLog()

  const [md5Input, setMd5Input] = useState("")
  const [md5Output, setMd5Output] = useState("")
  const [md5Bit, setMd5Bit] = useState("32") // "16" | "32"
  const [md5Case, setMd5Case] = useState("lower") // "lower" | "upper"

  const handleMd5Hash = () => {
    if (!md5Input) return
    try {
      let hash = CryptoJS.MD5(md5Input).toString()
      
      if (md5Bit === "16") {
        // 16-bit MD5 is usually the middle 16 characters (8 to 24) of the 32-character hex string
        hash = hash.substring(8, 24)
      }

      if (md5Case === "upper") {
        hash = hash.toUpperCase()
      }

      setMd5Output(hash)
      addLog({ 
        method: `MD5 (${md5Bit}-bit, ${md5Case})`, 
        input: md5Input, 
        output: hash 
      }, "success")

    } catch (e) {
      addLog({ method: "MD5", input: md5Input, output: (e as Error).message }, "error")
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
        value={md5Input}
        onValueChange={setMd5Input}
        classNames={{
          inputWrapper: "bg-default-100/50 hover:bg-default-100 focus-within:bg-background"
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-4 py-2 px-1">
          <div className="flex items-center gap-6">
            <RadioGroup
              orientation="horizontal"
              value={md5Bit}
              onValueChange={setMd5Bit}
              label={t("tools.hash.length")}
              size="sm"
              className="text-tiny"
            >
              <Radio value="32">{t("tools.hash.bit32")}</Radio>
              <Radio value="16">{t("tools.hash.bit16")}</Radio>
            </RadioGroup>

            <RadioGroup
              orientation="horizontal"
              value={md5Case}
              onValueChange={setMd5Case}
              label={t("tools.hash.case")}
              size="sm"
            >
              <Radio value="lower">{t("tools.hash.lowercase")}</Radio>
              <Radio value="upper">{t("tools.hash.uppercase")}</Radio>
            </RadioGroup>
          </div>

          <div className="flex items-center gap-2">
            <Button color="primary" variant="flat" onPress={handleMd5Hash} startContent={<Hash className="w-4 h-4" />}>
              {t("tools.hash.generate")}
            </Button>
            <Button isIconOnly variant="light" color="danger" onPress={() => { setMd5Input(""); setMd5Output(""); }} title={t("tools.hash.clearAll")}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
      </div>

      <div className="relative group">
        <Textarea
          label={t("tools.hash.outputLabel", "MD5 Output")}
          readOnly
          minRows={4}
          variant="bordered"
          value={md5Output}
          classNames={{
            inputWrapper: "bg-default-100/30 group-hover:bg-default-100/50 transition-colors font-mono text-small"
          }}
        />
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button isIconOnly size="sm" variant="flat" onPress={() => copyToClipboard(md5Output)}>
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
