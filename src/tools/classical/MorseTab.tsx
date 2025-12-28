import { useState, useMemo } from "react"
import { Button, Textarea, Select, SelectItem, Input } from "@heroui/react"
import { useTranslation } from "react-i18next"
import { useToast } from "../../contexts/ToastContext"
import { useLog } from "../../contexts/LogContext"
import { ArrowRightLeft, Copy, Trash2, Replace } from "lucide-react"
// @ts-ignore
import { encode as morseEncode, decode as morseDecode } from "xmorse"

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
  const [caseMode, setCaseMode] = useState("none")

  const separator = useMemo(() => {
    if (separatorType === "space") return " "
    if (separatorType === "slash") return "/"
    return customSeparator
  }, [separatorType, customSeparator])

  const morseOptions = useMemo(() => ({
    space: separator,
    short: shortCode,
    long: longCode
  }), [separator, shortCode, longCode])

  const handleEncode = () => {
    if (!input) return setOutput("")

    try {
      const encoded = morseEncode(input, morseOptions)
      setOutput(encoded)
      addToast(t("log.filterSuccess"), "success")
      addLog({ method: "Morse Encode (xmorse)", input, output: encoded }, "success")
    } catch (e) {
      console.error(e)
      addToast(t("log.filterError"), "error")
    }
  }

  const handleDecode = () => {
    if (!input) return setOutput("")

    try {
      const decoded = morseDecode(input, morseOptions)

      let finalOutput = decoded
      if (caseMode === "lower") finalOutput = finalOutput.toLowerCase()
      else if (caseMode === "upper") finalOutput = finalOutput.toUpperCase()

      setOutput(finalOutput)
      addToast(t("log.filterSuccess"), "success")
      addLog({ method: "Morse Decode (xmorse)", input, output: finalOutput }, "success")
    } catch (e) {
      console.error(e)
      addToast(t("log.filterError"), "error")
    }
  }

  const handleSwap = () => { setInput(output); setOutput(input); }
  const handleClear = () => { setInput(""); setOutput(""); }
  const handleCopy = () => {
    navigator.clipboard.writeText(output)
    addToast(t("tools.encoder.copiedToClipboard"), "success")
  }

  return (
    <div className="flex flex-col gap-4 h-full p-2">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-default-50 rounded-xl border border-default-200">
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
