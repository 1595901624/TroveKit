import { useState, useEffect } from "react"
import { Button, RadioGroup, Radio } from "../../components/ui/base-ui"
import { Hash } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLog } from "../../contexts/LogContext"
// @ts-ignore
import { sm3 } from "sm-crypto"
import { getStoredItem, setStoredItem, removeStoredItem } from "../../lib/store"
import { HashWorkbench } from "./HashWorkbench"

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

  return (
    <HashWorkbench
      id="sm3"
      input={input}
      onInputChange={setInput}
      output={output}
      onClear={() => { setInput(""); setOutput(""); setCaseOption("lower"); removeStoredItem(STORAGE_KEY) }}
      toolbarContent={(
        <RadioGroup orientation="horizontal" value={caseOption} onValueChange={setCaseOption} label={t("tools.hash.case")} size="sm">
          <Radio value="lower">{t("tools.hash.lowercase")}</Radio>
          <Radio value="upper">{t("tools.hash.uppercase")}</Radio>
        </RadioGroup>
      )}
      actions={(
        <Button size="sm" color="primary" onPress={handleSm3Hash} isDisabled={!input} startContent={<Hash className="h-4 w-4" />}>
          {t("tools.hash.generate")}
        </Button>
      )}
    />
  )
}
