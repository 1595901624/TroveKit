import { useState, useMemo, useEffect } from "react"
import { Button, Select, SelectItem, Input, addToast } from "../../components/ui/base-ui"
import { useTranslation } from "react-i18next"
import { useLogActions } from "../../contexts/LogContext"
import { Replace } from "lucide-react"
// @ts-ignore
import { encode as morseEncode, decode as morseDecode } from "xmorse"
import { getStoredItem, setStoredItem, removeStoredItem } from "../../lib/store"
import { HashOperationSwitch, HashWorkbench } from "../hash/HashWorkbench"

const STORAGE_KEY = "morse-tool-state"

export function MorseTab() {
  const { t } = useTranslation()
  const { addLog } = useLogActions()

  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")

  const [separatorType, setSeparatorType] = useState("space")
  const [customSeparator, setCustomSeparator] = useState(" ")
  const [shortCode, setShortCode] = useState(".")
  const [longCode, setLongCode] = useState("-")
  const [caseMode, setCaseMode] = useState("none")
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
          if (state.separatorType) setSeparatorType(state.separatorType)
          if (state.customSeparator) setCustomSeparator(state.customSeparator)
          if (state.shortCode) setShortCode(state.shortCode)
          if (state.longCode) setLongCode(state.longCode)
          if (state.caseMode) setCaseMode(state.caseMode)
        } catch (e) {
          console.error("Failed to parse MorseTab state", e)
        }
      }
      if (mounted) setIsLoaded(true)
    })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (isLoaded) {
      setStoredItem(STORAGE_KEY, JSON.stringify({ input, output, separatorType, customSeparator, shortCode, longCode, caseMode }))
    }
  }, [input, output, separatorType, customSeparator, shortCode, longCode, caseMode, isLoaded])

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
      addToast({ title: t("log.filterSuccess"), severity: "success" })
      addLog({ method: "Morse Encode (xmorse)", input, output: encoded }, "success")
    } catch (e) {
      console.error(e)
      addToast({ title: t("log.filterError"), severity: "danger" })
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
      addToast({ title: t("log.filterSuccess"), severity: "success" })
      addLog({ method: "Morse Decode (xmorse)", input, output: finalOutput }, "success")
    } catch (e) {
      console.error(e)
      addToast({ title: t("log.filterError"), severity: "danger" })
    }
  }

  const handleSwap = () => { setInput(output); setOutput(input); setOperation((current) => current === "encode" ? "decode" : "encode") }
  const handleClear = () => { setInput(""); setOutput(""); removeStoredItem(STORAGE_KEY); }
  const handleCopy = () => {
    navigator.clipboard.writeText(output)
    addToast({ title: t("tools.encoder.copiedToClipboard"), severity: "success" })
  }

  return (
    <HashWorkbench
      id="morse"
      input={input}
      onInputChange={setInput}
      inputPlaceholder={t("tools.classical.inputPlaceholder")}
      inputLabel={t("log.input")}
      outputLabel={t("log.output")}
      outputPlaceholder={t("tools.classical.outputPlaceholder")}
      output={output}
      onSwap={handleSwap}
      onCopy={handleCopy}
      onClear={handleClear}
      toolbarContent={<HashOperationSwitch ariaLabel="Morse" value={operation} onChange={setOperation} options={[{ value: "encode", label: t("tools.classical.encode") }, { value: "decode", label: t("tools.classical.decode") }]} />}
      configContent={(
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_96px_96px_160px]">
          <div className="grid grid-cols-[minmax(0,1fr)_72px] gap-2"><Select size="sm" label={t("tools.classical.morse.separator")} selectedKeys={[separatorType]} onChange={(event) => setSeparatorType(event.target.value)}><SelectItem key="space">{t("tools.classical.morse.space")}</SelectItem><SelectItem key="slash">{t("tools.classical.morse.slash")}</SelectItem><SelectItem key="custom">{t("tools.classical.morse.custom")}</SelectItem></Select>{separatorType === "custom" && <Input size="sm" label={t("tools.classical.morse.custom")} value={customSeparator} onValueChange={setCustomSeparator} classNames={{ inputWrapper: "h-9 min-h-9 bg-background" }} />}</div>
          <Input size="sm" label={t("tools.classical.morse.short")} value={shortCode} onValueChange={setShortCode} classNames={{ inputWrapper: "h-9 min-h-9 bg-background" }} />
          <Input size="sm" label={t("tools.classical.morse.long")} value={longCode} onValueChange={setLongCode} classNames={{ inputWrapper: "h-9 min-h-9 bg-background" }} />
          <Select size="sm" label={t("tools.classical.morse.case")} selectedKeys={[caseMode]} onChange={(event) => setCaseMode(event.target.value)}><SelectItem key="upper">{t("tools.hash.uppercase")}</SelectItem><SelectItem key="lower">{t("tools.hash.lowercase")}</SelectItem><SelectItem key="none">{t("tools.classical.morse.noCase")}</SelectItem></Select>
        </div>
      )}
      actions={<Button size="sm" color="primary" variant="solid" className="h-8 min-w-[88px]" onPress={operation === "encode" ? handleEncode : handleDecode} isDisabled={!input} startContent={<Replace className="h-4 w-4" />}>{operation === "encode" ? t("tools.classical.encode") : t("tools.classical.decode")}</Button>}
    />
  )
}
