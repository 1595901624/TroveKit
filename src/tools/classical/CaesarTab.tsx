import { useState, useEffect } from "react"
import { Button, Input, Select, SelectItem } from "../../components/ui/base-ui"
import { Shield, ShieldAlert } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLogActions } from "../../contexts/LogContext"
import { getStoredItem, setStoredItem, removeStoredItem } from "../../lib/store"
import { HashOperationSwitch, HashWorkbench } from "../hash/HashWorkbench"

const STORAGE_KEY = "caesar-tool-state"

export function CaesarTab() {
  const { t } = useTranslation()
  const { addLog } = useLogActions()

  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")
  const [shift, setShift] = useState("3")
  const [nonLetterMode, setNonLetterMode] = useState("keep") // ignore, encrypt, keep
  const [operation, setOperation] = useState<"encode" | "decode">("encode")
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    let mounted = true
    getStoredItem(STORAGE_KEY).then((stored) => {
      if (mounted && stored) {
        try {
          const state = JSON.parse(stored)
          if (state.input) setInput(state.input)
          if (state.output) setOutput(state.output)
          if (state.shift) setShift(state.shift)
          if (state.nonLetterMode) setNonLetterMode(state.nonLetterMode)
        } catch (e) {
          console.error("Failed to parse CaesarTab state", e)
        }
      }
      if (mounted) setIsLoaded(true)
    })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (isLoaded) {
      setStoredItem(STORAGE_KEY, JSON.stringify({ input, output, shift, nonLetterMode }))
    }
  }, [input, output, shift, nonLetterMode, isLoaded])

  const processCaesar = (isDecode: boolean) => {
    if (!input) return
    const s = parseInt(shift)
    if (isNaN(s)) {
        addLog({ method: "Caesar", input, output: "Invalid shift" }, "error")
        return
    }
    
    const rawShift = isDecode ? -s : s

    let res = ""
    for (const char of input) {
        if (/[a-zA-Z]/.test(char)) {
            const base = char >= 'a' ? 97 : 65
            // (x % n + n) % n handles negative numbers correctly
            const newChar = String.fromCharCode(((char.charCodeAt(0) - base + rawShift) % 26 + 26) % 26 + base)
            res += newChar
        } else {
            if (nonLetterMode === "ignore") {
                continue
            } else if (nonLetterMode === "keep") {
                res += char
            } else if (nonLetterMode === "encrypt") {
                // "Offset Apply": Shift ASCII value
                // Note: This can produce non-printable characters or weird symbols
                res += String.fromCharCode(char.charCodeAt(0) + rawShift)
            }
        }
    }
    
    setOutput(res)
    addLog({ 
        method: `Caesar ${isDecode ? "Decode" : "Encode"} (Shift: ${s}, Mode: ${nonLetterMode})`, 
        input, 
        output: res 
    }, "success")
  }

  const swapText = () => {
    setInput(output)
    setOutput(input)
    setOperation((current) => current === "encode" ? "decode" : "encode")
  }

  const handleShiftChange = (val: string) => {
      // Allow empty string for typing, otherwise validate numbers
      if (val === "" || /^-?\d+$/.test(val)) {
          setShift(val)
      }
  }

  return (
    <HashWorkbench
      id="caesar"
      input={input}
      onInputChange={setInput}
      inputPlaceholder={t("tools.classical.inputPlaceholder")}
      inputLabel={t("tools.encoder.input")}
      outputLabel={t("tools.encoder.output")}
      output={output}
      onSwap={swapText}
      onClear={() => { setInput(""); setOutput(""); removeStoredItem(STORAGE_KEY) }}
      toolbarContent={<HashOperationSwitch ariaLabel="Caesar" value={operation} onChange={setOperation} options={[{ value: "encode", label: t("tools.classical.encode") }, { value: "decode", label: t("tools.classical.decode") }]} />}
      configContent={(
        <div className="grid gap-2 sm:grid-cols-[128px_minmax(0,1fr)]">
          <Input type="number" label={t("tools.classical.shift")} value={shift} onValueChange={handleShiftChange} size="sm" classNames={{ inputWrapper: "h-9 min-h-9 bg-background" }} />
          <Select size="sm" label={t("tools.classical.nonLetter")} description={t("tools.classical.symbolTooltip")} selectedKeys={[nonLetterMode]} onChange={(event) => setNonLetterMode(event.target.value)}><SelectItem key="ignore">{t("tools.classical.ignore")}</SelectItem><SelectItem key="keep">{t("tools.classical.keep")}</SelectItem><SelectItem key="encrypt">{t("tools.classical.encrypt")}</SelectItem></Select>
        </div>
      )}
      actions={<Button size="sm" color="primary" variant="solid" className="h-8 min-w-[88px]" onPress={() => processCaesar(operation === "decode")} isDisabled={!input} startContent={operation === "encode" ? <Shield className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}>{operation === "encode" ? t("tools.classical.encode") : t("tools.classical.decode")}</Button>}
    />
  )
}
