import { useState, useEffect } from "react"
import { Textarea, Button, Input, RadioGroup, Radio, Tooltip } from "@heroui/react"
import { Copy, Trash2, ArrowDownUp, Info, Shield, ShieldAlert } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLog } from "../../contexts/LogContext"

const STORAGE_KEY = "caesar-tool-state"

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

export function CaesarTab() {
  const { t } = useTranslation()
  const { addLog } = useLog()

  const savedState = loadStateFromStorage()

  const [input, setInput] = useState(savedState.input || "")
  const [output, setOutput] = useState(savedState.output || "")
  const [shift, setShift] = useState(savedState.shift || "3")
  const [nonLetterMode, setNonLetterMode] = useState(savedState.nonLetterMode || "keep") // ignore, encrypt, keep

  useEffect(() => {
    saveStateToStorage({ input, output, shift, nonLetterMode })
  }, [input, output, shift, nonLetterMode])

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
  }

  const copyToClipboard = (text: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    addLog(t("tools.encoder.copiedToClipboard"), "info")
  }

  const handleShiftChange = (val: string) => {
      // Allow empty string for typing, otherwise validate numbers
      if (val === "" || /^-?\d+$/.test(val)) {
          setShift(val)
      }
  }

  return (
    <div className="space-y-4">
      <Textarea
        label={t("tools.classical.inputPlaceholder", "Input Text")}
        placeholder={t("tools.classical.inputPlaceholder")}
        minRows={5}
        variant="bordered"
        value={input}
        onValueChange={setInput}
        classNames={{
          inputWrapper: "bg-default-100/50 hover:bg-default-100 focus-within:bg-background"
        }}
      />

      <div className="flex flex-col md:flex-row gap-4 p-4 bg-default-50 rounded-lg border border-default-100 items-center justify-between">
          <div className="flex items-center gap-4">
              <Input
                type="number"
                label={t("tools.classical.shift")}
                value={shift}
                onValueChange={handleShiftChange}
                className="w-32"
                size="sm"
                variant="flat"
              />
              
              <div className="flex items-center gap-2">
                 <RadioGroup
                    orientation="horizontal"
                    label={
                        <div className="flex items-center gap-1">
                            {t("tools.classical.nonLetter")}
                            <Tooltip content={<div className="whitespace-pre-wrap">{t("tools.classical.symbolTooltip")}</div>}>
                                <Info className="w-3 h-3 cursor-pointer text-default-500" />
                            </Tooltip>
                        </div>
                    }
                    value={nonLetterMode}
                    onValueChange={setNonLetterMode}
                    size="sm"
                  >
                    <Radio value="ignore">{t("tools.classical.ignore")}</Radio>
                    <Radio value="keep">{t("tools.classical.keep")}</Radio>
                    <Radio value="encrypt">{t("tools.classical.encrypt")}</Radio>
                  </RadioGroup>
              </div>
          </div>

          <div className="flex items-center gap-2">
            <Button color="primary" onPress={() => processCaesar(false)} startContent={<Shield className="w-4 h-4" />}>
                {t("tools.classical.encode")}
            </Button>
            <Button color="secondary" onPress={() => processCaesar(true)} startContent={<ShieldAlert className="w-4 h-4" />}>
                {t("tools.classical.decode")}
            </Button>
            <Button isIconOnly variant="light" onPress={swapText} title={t("tools.encoder.swap")}>
                <ArrowDownUp className="w-4 h-4" />
            </Button>
            <Button isIconOnly variant="light" color="danger" onPress={() => { setInput(""); setOutput(""); localStorage.removeItem(STORAGE_KEY); }} title={t("tools.encoder.clearAll")}>
                <Trash2 className="w-4 h-4" />
            </Button>
          </div>
      </div>

      <div className="relative group">
        <Textarea
          label={t("tools.encoder.output")}
          readOnly
          minRows={5}
          variant="bordered"
          value={output}
          classNames={{
            inputWrapper: "bg-default-100/30 group-hover:bg-default-100/50 transition-colors"
          }}
        />
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button isIconOnly size="sm" variant="flat" onPress={() => copyToClipboard(output)} title={t("tools.encoder.copy")}>
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
