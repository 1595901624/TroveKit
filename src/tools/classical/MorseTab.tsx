import { useState, useMemo } from "react"
import { Button, Textarea, Select, SelectItem, Input } from "@heroui/react"
import { useTranslation } from "react-i18next"
import { useToast } from "../../contexts/ToastContext"
import { useLog } from "../../contexts/LogContext"
import { ArrowRightLeft, Copy, Trash2, Replace } from "lucide-react"

// 标准国际摩斯电码 + 扩展字符
const MORSE_MAP: Record<string, string> = {
  "A": ".-", "B": "-...", "C": "-.-.", "D": "-..", "E": ".", "F": "..-.",
  "G": "--.", "H": "....", "I": "..", "J": ".---", "K": "-.-", "L": ".-..",
  "M": "--", "N": "-.", "O": "---", "P": ".--.", "Q": "--.-", "R": ".-.",
  "S": "...", "T": "-", "U": "..-", "V": "...-", "W": ".--", "X": "-..-",
  "Y": "-.--", "Z": "--..",
  "0": "-----", "1": ".----", "2": "..---", "3": "...--", "4": "....-",
  "5": ".....", "6": "-....", "7": "--...", "8": "---..", "9": "----.",
  ".": ".-.-.-", ",": "--..--", "?": "..--..", "'": ".----.", "!": "-.-.--",
  "/": "-..-.", "(": "-.--.", ")": "-.--.-", "&": ".-...", ":": "---...",
  ";": "-.-.-.", "=": "-...-", "+": ".-.-.", "-": "-....-", "_": "..--.-",
  "\"": ".-..-.", "$": "...-..-", "@": ".--.-.",
  " ": "/"
}

const REVERSE_MORSE_MAP: Record<string, string> = Object.entries(MORSE_MAP).reduce((acc, [key, value]) => {
  acc[value] = key
  return acc
}, {} as Record<string, string>)

export function MorseTab() {
  const { t } = useTranslation()
  const { addToast } = useToast()
  const { addLog } = useLog()

  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")

  const [separatorType, setSeparatorType] = useState("space")
  const [customSeparator, setCustomSeparator] = useState(" ")
  const [shortCode, setShortCode] = useState(".")
  const [longCode, setLongCode] = useState("-")
  const [caseMode, setCaseMode] = useState("upper")

  const separator = useMemo(() => {
    if (separatorType === "space") return " "
    if (separatorType === "slash") return "/"
    return customSeparator
  }, [separatorType, customSeparator])

  const handleEncode = () => {
    if (!input) return setOutput("")
    const upperInput = input.toUpperCase()
    const encoded = upperInput.split("").map(char => {
      if (char === " ") return "/"
      const standardCode = MORSE_MAP[char]
      if (!standardCode) return char
      return standardCode.replace(/\./g, shortCode).replace(/-/g, longCode)
    }).join(separator)

    setOutput(encoded)
    addToast(t("log.filterSuccess"), "success")
    addLog({ method: "Morse Encode", input, output: encoded }, "success")
  }

  const handleDecode = () => {
    if (!input) return setOutput("")
    const words = input.split(separator)
    const decoded = words.map(code => {
      if (code === "" || code === "/") return " "
      let tempCode = code
      let stdCode = ""
      while (tempCode.length > 0) {
        if (tempCode.startsWith(longCode)) {
          stdCode += "-"
          tempCode = tempCode.substring(longCode.length)
        } else if (tempCode.startsWith(shortCode)) {
          stdCode += "."
          tempCode = tempCode.substring(shortCode.length)
        } else {
          stdCode += tempCode[0]
          tempCode = tempCode.substring(1)
        }
      }
      return REVERSE_MORSE_MAP[stdCode] || stdCode
    }).join("")

    let finalOutput = decoded
    if (caseMode === "lower") finalOutput = finalOutput.toLowerCase()
    else if (caseMode === "upper") finalOutput = finalOutput.toUpperCase()

    setOutput(finalOutput)
    addToast(t("log.filterSuccess"), "success")
    addLog({ method: "Morse Decode", input, output: finalOutput }, "success")
  }

  const handleSwap = () => { setInput(output); setOutput(input); }
  const handleClear = () => { setInput(""); setOutput(""); }
  const handleCopy = () => {
    navigator.clipboard.writeText(output)
    addToast(t("tools.encoder.copiedToClipboard"), "success")
  }

  return (
    <div className="flex flex-col gap-4 h-full p-2">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-default-50 rounded-x
       border border-default-200">
        <div className="flex flex-col gap-2">
          <span className="text-xs text-default-500 font-medium uppercase">{t(
            "tools.classical.morse.separator")}</span>
          <div className="flex gap-2">
            <Select size="sm" selectedKeys={[separatorType]} onChange={(e) => setSeparatorType(e.target.value)} className="flex-1">
              <SelectItem key="space">{t("tools.classical.morse.space")}</SelectItem>
              <SelectItem key="slash">{t("tools.classical.morse.slash")}</SelectItem>
              <SelectItem key="custom">{t("tools.classical.morse.custom")}</SelectItem>
            </Select>
            {separatorType === "custom" && <Input size="sm" value={customSeparator} onValueChange=
              {setCustomSeparator} className="w-16" />}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-xs text-default-500 font-medium uppercase">{t(
            "tools.classical.morse.codes")}</span>
          <div className="flex gap-2">
            <Input size="sm" label={t("tools.classical.morse.short")} value={shortCode}
              onValueChange={setShortCode} classNames={{ label: "text-[10px]" }} />
            <Input size="sm" label={t("tools.classical.morse.long")} value={longCode}
              onValueChange={setLongCode} classNames={{ label: "text-[10px]" }} />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-xs text-default-500 font-medium uppercase">{t(
            "tools.classical.morse.case")}</span>
          <Select size="sm" selectedKeys={[caseMode]} onChange={(e) => setCaseMode(e.target.value)}>
            <SelectItem key="upper">{t("tools.hash.uppercase")}</SelectItem>
            <SelectItem key="lower">{t("tools.hash.lowercase")}</SelectItem>
            <SelectItem key="none">{t("tools.classical.morse.noCase")}</SelectItem>
          </Select>
        </div>
        <div className="flex items-end gap-2">
          <Button color="primary" className="flex-1" onPress={handleEncode} startContent={<Replace
            className="w-4 h-4" />}>{t("tools.classical.encode")}</Button>
          <Button color="secondary" className="flex-1" onPress={handleDecode} startContent={<Replace
            className="w-4 h-4" />}>{t("tools.classical.decode")}</Button>
        </div>
      </div>
      <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0">
        <div className="flex-1 flex flex-col gap-2">
          <div className="flex justify-between items-center px-1">
            <span className="text-sm font-medium text-default-600">{t("log.input")}</span>
            <Button isIconOnly size="sm" variant="light" color="danger" onPress={handleClear}><Trash2
              className="w-4 h-4" /></Button>
          </div>
          <Textarea value={input} onValueChange={setInput} placeholder={t(
            "tools.classical.inputPlaceholder")} classNames={{
              input: "font-mono text-sm", inputWrapper: "h-full bg-default-50/50"
            }} className="flex-1 h-full min-h-[200px]" minRows={10} />
        </div>
        <div className="flex items-center justify-center">
          <Button isIconOnly variant="flat" onPress={handleSwap}><ArrowRightLeft className="w-4 h-4" /></Button>
        </div>
        <div className="flex-1 flex flex-col gap-2">
          <div className="flex justify-between items-center px-1">
            <span className="text-sm font-medium text-default-600">{t("log.output")}</span>
            <Button isIconOnly size="sm" variant="light" color="primary" onPress={handleCopy}><Copy
              className="w-4 h-4" /></Button>
          </div>
          <Textarea value={output} isReadOnly placeholder={t("tools.classical.outputPlaceholder")}
            classNames={{ input: "font-mono text-sm", inputWrapper: "h-full bg-default-50/50" }} className="flex-1  
       h-full min-h-[200px]" minRows={10} />
        </div>
      </div>
    </div>
  )
}