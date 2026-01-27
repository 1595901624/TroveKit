import { useState, useEffect } from "react"
import { Textarea, Button, RadioGroup, Radio } from "@heroui/react"
import { Copy, Trash2, Hash } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLog } from "../../contexts/LogContext"
// @ts-ignore
import { sm3 } from "sm-crypto"
import { getStoredItem, setStoredItem, removeStoredItem } from "../../lib/store"

const STORAGE_KEY = "sm3-tool-state"

export function Sm3Tab() {
  const { t } = useTranslation()
  const { addLog } = useLog()

  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")
  const [caseOption, setCaseOption] = useState("lower") // "lower" | "upper"
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    let mounted = true;
    getStoredItem(STORAGE_KEY).then((stored) => {
      if (mounted && stored) {
        try {
          const state = JSON.parse(stored);
          if (state.input) setInput(state.input);
          if (state.output) setOutput(state.output);
          if (state.caseOption) setCaseOption(state.caseOption);
        } catch (e) {
          console.error("Failed to parse Sm3Tab state", e);
        }
      }
      if (mounted) setIsLoaded(true);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (isLoaded) {
      setStoredItem(STORAGE_KEY, JSON.stringify({
        input,
        output,
        caseOption
      }))
    }
  }, [input, output, caseOption, isLoaded])

  const handleSm3Hash = () => {
    if (!input) return
    try {
      let hash = sm3(input)

      if (caseOption === "upper") {
        hash = hash.toUpperCase()
      }

      setOutput(hash)
      addLog({ 
        method: `SM3 (${caseOption})`, 
        input: input, 
        output: hash 
      }, "success")

    } catch (e) {
      // @ts-ignore
      addLog({ method: "SM3", input: input, output: e.message || e }, "error")
    }
  }

  const copyToClipboard = (text: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="space-y-4">
      <Textarea
        label={t("tools.hash.inputLabel", "Input Text")}
        placeholder={t("tools.hash.inputPlaceholder", "Enter text to hash...")}
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
              value={caseOption}
              onValueChange={setCaseOption}
              label={t("tools.hash.case")}
              size="sm"
            >
              <Radio value="lower">{t("tools.hash.lowercase")}</Radio>
              <Radio value="upper">{t("tools.hash.uppercase")}</Radio>
            </RadioGroup>
          </div>

          <div className="flex items-center gap-2">
            <Button color="primary" variant="flat" onPress={handleSm3Hash} startContent={<Hash className="w-4 h-4" />}>
              {t("tools.hash.generate")}
            </Button>
            <Button isIconOnly variant="light" color="danger" onPress={() => { setInput(""); setOutput(""); setCaseOption("lower"); removeStoredItem(STORAGE_KEY); }} title={t("tools.hash.clearAll")}>
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
