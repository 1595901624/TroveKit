import { useState, useEffect } from "react"
import { Textarea, Button, RadioGroup, Radio } from "@heroui/react"
import { Copy, Trash2, Hash } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLog } from "../../contexts/LogContext"
import md4 from "../../lib/md4"
import { getStoredItem, setStoredItem, removeStoredItem } from "../../lib/store"

const MD4_STORAGE_KEY = "md4_state"

export function Md4Tab() {
  const { t } = useTranslation()
  const { addLog } = useLog()

  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")
  const [bit, setBit] = useState("32")
  const [md4Case, setMd4Case] = useState("lower")
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    let mounted = true;
    getStoredItem(MD4_STORAGE_KEY).then((stored) => {
      if (mounted && stored) {
        try {
          const state = JSON.parse(stored);
          if (state.input) setInput(state.input);
          if (state.output) setOutput(state.output);
          if (state.bit) setBit(state.bit);
          if (state.case) setMd4Case(state.case);
        } catch (e) {
          console.error("Failed to parse Md4Tab state", e);
        }
      }
      if (mounted) setIsLoaded(true);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (isLoaded) {
      setStoredItem(MD4_STORAGE_KEY, JSON.stringify({
        input,
        output,
        bit,
        case: md4Case
      }))
    }
  }, [input, output, bit, md4Case, isLoaded])

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

      setOutput(hash)

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
              value={md4Case}
              onValueChange={setMd4Case}
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
              setInput(""); 
              setOutput(""); 
              removeStoredItem(MD4_STORAGE_KEY); 
            }} title={t("tools.hash.clearAll") }>
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
