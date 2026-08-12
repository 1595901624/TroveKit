import { useState, useEffect } from "react"
import { Button, RadioGroup, Radio } from "../../components/ui/base-ui"
import { Hash } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLogActions } from "../../contexts/LogContext"
import md4 from "../../lib/md4"
import { getStoredItem, setStoredItem, removeStoredItem } from "../../lib/store"
import { HashWorkbench } from "./HashWorkbench"

const MD4_STORAGE_KEY = "md4_state"

export function Md4Tab() {
  const { t } = useTranslation()
  const { addLog } = useLogActions()

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

  return (
    <HashWorkbench
      id="md4"
      input={input}
      onInputChange={setInput}
      output={output}
      onClear={() => { setInput(""); setOutput(""); removeStoredItem(MD4_STORAGE_KEY) }}
      toolbarContent={(
        <>
          <RadioGroup orientation="horizontal" value={bit} onValueChange={setBit} label={t("tools.hash.length")} size="sm">
            <Radio value="32">{t("tools.hash.bit32")}</Radio>
            <Radio value="16">{t("tools.hash.bit16")}</Radio>
          </RadioGroup>
          <RadioGroup orientation="horizontal" value={md4Case} onValueChange={setMd4Case} label={t("tools.hash.case")} size="sm">
            <Radio value="lower">{t("tools.hash.lowercase")}</Radio>
            <Radio value="upper">{t("tools.hash.uppercase")}</Radio>
          </RadioGroup>
        </>
      )}
      actions={(
        <Button size="sm" color="primary" onPress={handleMd4Hash} isDisabled={!input} startContent={<Hash className="h-4 w-4" />}>
          {t("tools.hash.generate")}
        </Button>
      )}
    />
  )
}
