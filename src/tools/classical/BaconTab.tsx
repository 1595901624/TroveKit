import { useState, useEffect } from "react"
import { Button, Input, Select, SelectItem } from "../../components/ui/base-ui"
import { Shield, ShieldAlert } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLog } from "../../contexts/LogContext"
import { getStoredItem, setStoredItem, removeStoredItem } from "../../lib/store"
import { HashOperationSwitch, HashWorkbench } from "../hash/HashWorkbench"

const STORAGE_KEY = "bacon-tool-state"

const BACON_STANDARD_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
const BACON_TRADITIONAL_ALPHABET = "ABCDEFGHIKLMNOPQRSTUWXYZ" // skips J and V

export function BaconTab() {
  const { t } = useTranslation()
  const { addLog } = useLog()

  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")
  const [alphabetType, setAlphabetType] = useState<"26" | "24">("26")
  const [mode, setMode] = useState<"AB" | "ab" | "01" | "custom">("AB")
  const [customA, setCustomA] = useState("0")
  const [customB, setCustomB] = useState("1")
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
          if (state.alphabetType) setAlphabetType(state.alphabetType)
          if (state.mode) setMode(state.mode)
          if (state.customA) setCustomA(state.customA)
          if (state.customB) setCustomB(state.customB)
        } catch (e) {
          console.error("Failed to parse BaconTab state", e)
        }
      }
      if (mounted) setIsLoaded(true)
    })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (isLoaded) {
      setStoredItem(STORAGE_KEY, JSON.stringify({ input, output, alphabetType, mode, customA, customB }))
    }
  }, [input, output, alphabetType, mode, customA, customB, isLoaded])

  const getSymbols = () => {
    switch (mode) {
      case "AB": return ["A", "B"]
      case "ab": return ["a", "b"]
      case "01": return ["0", "1"]
      case "custom": return [customA || "0", customB || "1"]
    }
  }

  const getBaconMaps = () => {
    const isTraditional = alphabetType === "24"
    const alphabet = isTraditional ? BACON_TRADITIONAL_ALPHABET : BACON_STANDARD_ALPHABET
    const encodeMap: Record<string, string> = {}
    const decodeMap: Record<string, string> = {}

    for (let i = 0; i < alphabet.length; i++) {
      const binary = i.toString(2).padStart(5, '0')
      encodeMap[alphabet[i]] = binary
      decodeMap[binary] = alphabet[i]
    }

    if (isTraditional) {
      encodeMap['J'] = encodeMap['I']
      encodeMap['V'] = encodeMap['U']
    }

    return { encodeMap, decodeMap }
  }

  const handleEncode = () => {
    if (!input) return
    const { encodeMap } = getBaconMaps()
    const [symA, symB] = getSymbols()
    
    let res = ""
    const normalizedInput = input.toUpperCase()
    
    for (const char of normalizedInput) {
      if (encodeMap[char]) {
        const binary = encodeMap[char]
        const encoded = binary.split('').map(b => b === '0' ? symA : symB).join('')
        res += encoded + " "
      } else if (/\s/.test(char)) {
          // Keep spaces as separators if they exist in input? 
          // Actually, Bacon usually outputs blocks. 
          // We'll just skip non-alphabet chars or keep them?
          // Standard: output is blocks of 5.
      }
    }

    const finalResult = res.trim()
    setOutput(finalResult)
    addLog({
      method: `Bacon Encode (${alphabetType === "26" ? "Standard" : "Traditional"}, Mode: ${mode})`,
      input,
      output: finalResult
    }, "success")
  }

  const handleDecode = () => {
    if (!input) return
    const { decodeMap } = getBaconMaps()
    const [symA, symB] = getSymbols()

    // Automatic space recognition:
    // If input has spaces, we assume they might be delimiters.
    // However, if we just remove all whitespace and then chunk by 5, it works for both:
    // "00000 00001" -> "0000000001" -> chunk(5) -> ["00000", "00001"]
    
    // First, convert input symbols to 0 and 1
    // We need to be careful with custom symbols.
    let normalized = ""
    for (const char of input) {
        if (char === symA) normalized += "0"
        else if (char === symB) normalized += "1"
        // ignore others (like spaces, tabs, newlines)
    }

    let res = ""
    for (let i = 0; i < normalized.length; i += 5) {
      const chunk = normalized.substring(i, i + 5)
      if (chunk.length === 5) {
        res += decodeMap[chunk] || "?"
      }
    }

    setOutput(res)
    addLog({
      method: `Bacon Decode (${alphabetType === "26" ? "Standard" : "Traditional"}, Mode: ${mode})`,
      input,
      output: res
    }, "success")
  }

  const swapText = () => {
    setInput(output)
    setOutput(input)
    setOperation((current) => current === "encode" ? "decode" : "encode")
  }

  return (
    <HashWorkbench
      id="bacon"
      input={input}
      onInputChange={setInput}
      inputPlaceholder={t("tools.classical.inputPlaceholder")}
      inputLabel={t("tools.encoder.input")}
      outputLabel={t("tools.encoder.output")}
      output={output}
      onSwap={swapText}
      onClear={() => { setInput(""); setOutput(""); removeStoredItem(STORAGE_KEY) }}
      toolbarContent={<HashOperationSwitch ariaLabel="Bacon" value={operation} onChange={setOperation} options={[{ value: "encode", label: t("tools.classical.encode") }, { value: "decode", label: t("tools.classical.decode") }]} />}
      configContent={(
        <div className="grid gap-2 sm:grid-cols-[180px_180px_minmax(0,1fr)]">
          <Select size="sm" label={t("tools.classical.bacon.alphabet")} selectedKeys={[alphabetType]} onChange={(event) => setAlphabetType(event.target.value as "26" | "24")}><SelectItem key="26">{t("tools.classical.bacon.standard")}</SelectItem><SelectItem key="24">{t("tools.classical.bacon.traditional")}</SelectItem></Select>
          <Select size="sm" label={t("tools.classical.bacon.mode")} selectedKeys={[mode]} onChange={(event) => setMode(event.target.value as typeof mode)}><SelectItem key="AB">A/B</SelectItem><SelectItem key="ab">a/b</SelectItem><SelectItem key="01">0/1</SelectItem><SelectItem key="custom">{t("tools.classical.bacon.custom")}</SelectItem></Select>
          {mode === "custom" && <div className="flex gap-2"><Input label="A" value={customA} onValueChange={setCustomA} size="sm" className="w-20" maxLength={1} classNames={{ inputWrapper: "h-9 min-h-9 bg-background" }} /><Input label="B" value={customB} onValueChange={setCustomB} size="sm" className="w-20" maxLength={1} classNames={{ inputWrapper: "h-9 min-h-9 bg-background" }} /></div>}
        </div>
      )}
      actions={<Button size="sm" color="primary" variant="solid" className="h-8 min-w-[88px]" onPress={operation === "encode" ? handleEncode : handleDecode} isDisabled={!input} startContent={operation === "encode" ? <Shield className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}>{operation === "encode" ? t("tools.classical.encode") : t("tools.classical.decode")}</Button>}
    />
  )
}
