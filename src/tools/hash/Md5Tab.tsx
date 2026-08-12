import { useState, useEffect } from "react"
import { Button, RadioGroup, Radio } from "../../components/ui/base-ui"
import { Hash } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLogActions } from "../../contexts/LogContext"
import CryptoJS from "crypto-js"
import { getStoredItem, setStoredItem, removeStoredItem } from "../../lib/store"
import { HashWorkbench } from "./HashWorkbench"

// 定义 STORAGE_KEY 常量
const MD5_STORAGE_KEY = "md5_state"

export function Md5Tab() {
  const { t } = useTranslation()
  const { addLog } = useLogActions()

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

  return (
    <HashWorkbench
      id="md5"
      input={input}
      onInputChange={setInput}
      output={output}
      onClear={() => { setInput(""); setOutput(""); removeStoredItem(MD5_STORAGE_KEY) }}
      toolbarContent={(
        <>
          <RadioGroup orientation="horizontal" value={bit} onValueChange={setBit} label={t("tools.hash.length")} size="sm">
            <Radio value="32">{t("tools.hash.bit32")}</Radio>
            <Radio value="16">{t("tools.hash.bit16")}</Radio>
          </RadioGroup>
          <RadioGroup orientation="horizontal" value={md5Case} onValueChange={setMd5Case} label={t("tools.hash.case")} size="sm">
            <Radio value="lower">{t("tools.hash.lowercase")}</Radio>
            <Radio value="upper">{t("tools.hash.uppercase")}</Radio>
          </RadioGroup>
        </>
      )}
      actions={(
        <Button size="sm" color="primary" onPress={handleMd5Hash} isDisabled={!input} startContent={<Hash className="h-4 w-4" />}>
          {t("tools.hash.generate")}
        </Button>
      )}
    />
  )
}
