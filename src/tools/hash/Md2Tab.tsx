import { useState, useEffect } from "react"
import { Button, RadioGroup, Radio } from "../../components/ui/base-ui"
import { Hash } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLogActions } from "../../contexts/LogContext"
import md2 from "js-md2"
import { getStoredItem, setStoredItem, removeStoredItem } from "../../lib/store"
import { HashWorkbench } from "./HashWorkbench"

// 定义 STORAGE_KEY 常量
const MD2_STORAGE_KEY = "md2_state"

export function Md2Tab() {
  const { t } = useTranslation()
  const { addLog } = useLogActions()

  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")
  const [md2Case, setMd2Case] = useState("lower")
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    let mounted = true;
    getStoredItem(MD2_STORAGE_KEY).then((stored) => {
      if (mounted && stored) {
        try {
          const state = JSON.parse(stored);
          if (state.input) setInput(state.input);
          if (state.output) setOutput(state.output);
          if (state.case) setMd2Case(state.case);
        } catch (e) {
          console.error("Failed to parse Md2Tab state", e);
        }
      }
      if (mounted) setIsLoaded(true);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (isLoaded) {
      setStoredItem(MD2_STORAGE_KEY, JSON.stringify({
        input,
        output,
        case: md2Case
      }))
    }
  }, [input, output, md2Case, isLoaded])

  const handleMd2Hash = () => {
    if (!input) return
    try {
      let hash = md2(input)
      
      if (md2Case === "upper") {
        hash = hash.toUpperCase()
      }

      setOutput(hash)

      addLog({ 
        method: `MD2 (${md2Case})`, 
        input, 
        output: hash 
      }, "success")

    } catch (e) {
      addLog({ method: "MD2", input, output: (e as Error).message }, "error")
    }
  }

  return (
    <HashWorkbench
      id="md2"
      input={input}
      onInputChange={setInput}
      output={output}
      onClear={() => { setInput(""); setOutput(""); removeStoredItem(MD2_STORAGE_KEY) }}
      toolbarContent={(
        <RadioGroup orientation="horizontal" value={md2Case} onValueChange={setMd2Case} label={t("tools.hash.case")} size="sm">
          <Radio value="lower">{t("tools.hash.lowercase")}</Radio>
          <Radio value="upper">{t("tools.hash.uppercase")}</Radio>
        </RadioGroup>
      )}
      actions={(
        <Button size="sm" color="primary" onPress={handleMd2Hash} isDisabled={!input} startContent={<Hash className="h-4 w-4" />}>
          {t("tools.hash.generate")}
        </Button>
      )}
    />
  )
}
