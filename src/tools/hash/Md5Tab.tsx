import { useState, useEffect } from "react"
import { Textarea, Button, RadioGroup, Radio } from "@heroui/react"
import { Copy, Trash2, Hash } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLog } from "../../contexts/LogContext"
import CryptoJS from "crypto-js"
import { getStoredItem, setStoredItem, removeStoredItem } from "../../lib/store"

// 定义 STORAGE_KEY 常量
const MD5_STORAGE_KEY = "md5_state"

export function Md5Tab() {
  const { t } = useTranslation()
  const { addLog } = useLog()

  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")
  const [bit, setBit] = useState("32")
  const [md5Case, setMd5Case] = useState("lower")
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    let mounted = true;
    getStoredItem(MD5_STORAGE_KEY).then((stored) => {
      if (mounted && stored) {
        try {
          const state = JSON.parse(stored);
          if (state.input) setInput(state.input);
          if (state.output) setOutput(state.output);
          if (state.bit) setBit(state.bit);
          if (state.case) setMd5Case(state.case);
        } catch (e) {
          console.error("Failed to parse Md5Tab state", e);
        }
      }
      if (mounted) setIsLoaded(true);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (isLoaded) {
      setStoredItem(MD5_STORAGE_KEY, JSON.stringify({
        input,
        output,
        bit,
        case: md5Case
      }))
    }
  }, [input, output, bit, md5Case, isLoaded])

  const handleMd5Hash = () => {
    if (!input) return
    try {
      let hash = CryptoJS.MD5(input).toString()
      
      if (bit === "16") {
        // 16-bit MD5 is usually the middle 16 characters (8 to 24) of the 32-character hex string
        hash = hash.substring(8, 24)
      }

      if (md5Case === "upper") {
        hash = hash.toUpperCase()
      }

      setOutput(hash)

      addLog({ 
        method: `MD5 (${bit}-bit, ${md5Case})`, 
        input, 
        output: hash 
      }, "success")

    } catch (e) {
      addLog({ method: "MD5", input, output: (e as Error).message }, "error")
    }
  }

  const copyToClipboard = (text: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="space-y-4">
      <Textarea
        label={t("tools.hash.inputLabel")}
        placeholder={t("tools.hash.inputPlaceholder")}
        minRows={6}
        variant="bordered"
        value={input}
        onValueChange={setInput}
        classNames={{
          inputWrapper: "bg-default-100/50 hover:bg-default-100 focus-within:bg-background"
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-4 py-2 px-1">
          <div className="flex items-center gap-6">
            <RadioGroup
              orientation="horizontal"
              value={bit}
              onValueChange={setBit}
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
            <Button isIconOnly variant="light" color="danger" onPress={() => { 
              setInput(""); 
              setOutput(""); 
              removeStoredItem(MD5_STORAGE_KEY); 
            }} title={t("tools.hash.clearAll")}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
      </div>

      <div className="relative group">
        <Textarea
          label={t("tools.hash.outputLabel")}
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
