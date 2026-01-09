import { useState, useEffect } from "react"
import { Textarea, Button, Input, RadioGroup, Radio } from "@heroui/react"
import { Copy, Trash2, ArrowDownUp, Shield, ShieldAlert } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLog } from "../../contexts/LogContext"

const STORAGE_KEY = "bacon-tool-state"

const BACON_STANDARD_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
const BACON_TRADITIONAL_ALPHABET = "ABCDEFGHIKLMNOPQRSTUWXYZ" // skips J and V

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

export function BaconTab() {
  const { t } = useTranslation()
  const { addLog } = useLog()

  const savedState = loadStateFromStorage()

  const [input, setInput] = useState(savedState.input || "")
  const [output, setOutput] = useState(savedState.output || "")
  const [alphabetType, setAlphabetType] = useState<"26" | "24">(savedState.alphabetType || "26")
  const [mode, setMode] = useState<"AB" | "ab" | "01" | "custom">(savedState.mode || "AB")
  const [customA, setCustomA] = useState(savedState.customA || "0")
  const [customB, setCustomB] = useState(savedState.customB || "1")

  useEffect(() => {
    saveStateToStorage({ input, output, alphabetType, mode, customA, customB })
  }, [input, output, alphabetType, mode, customA, customB])

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
  }

  const copyToClipboard = (text: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
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

      <div className="flex flex-col gap-4 p-4 bg-default-50 rounded-lg border border-default-100">
        <div className="flex flex-wrap items-end gap-6">
          <RadioGroup
            label={t("tools.classical.bacon.alphabet", "Alphabet")}
            value={alphabetType}
            onValueChange={(v) => setAlphabetType(v as "26" | "24")}
            orientation="horizontal"
            size="sm"
          >
            <Radio value="26">{t("tools.classical.bacon.standard", "Standard (26)")}</Radio>
            <Radio value="24">{t("tools.classical.bacon.traditional", "Traditional (24)")}</Radio>
          </RadioGroup>

          <RadioGroup
            label={t("tools.classical.bacon.mode", "Mode")}
            value={mode}
            onValueChange={(v) => setMode(v as any)}
            orientation="horizontal"
            size="sm"
          >
            <Radio value="AB">A/B</Radio>
            <Radio value="ab">a/b</Radio>
            <Radio value="01">0/1</Radio>
            <Radio value="custom">{t("tools.classical.bacon.custom", "Custom")}</Radio>
          </RadioGroup>

          {mode === "custom" && (
            <div className="flex gap-2 items-center">
              <Input
                label="A"
                value={customA}
                onValueChange={setCustomA}
                size="sm"
                className="w-16"
                variant="bordered"
                maxLength={1}
              />
              <Input
                label="B"
                value={customB}
                onValueChange={setCustomB}
                size="sm"
                className="w-16"
                variant="bordered"
                maxLength={1}
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 justify-end">
          <Button color="primary" onPress={handleEncode} startContent={<Shield className="w-4 h-4" />}>
            {t("tools.classical.encode")}
          </Button>
          <Button color="secondary" onPress={handleDecode} startContent={<ShieldAlert className="w-4 h-4" />}>
            {t("tools.classical.decode")}
          </Button>
          <Button isIconOnly variant="light" onPress={swapText} title={t("tools.encoder.swap")}>
            <ArrowDownUp className="w-4 h-4" />
          </Button>
          <Button
            isIconOnly
            variant="light"
            color="danger"
            onPress={() => {
              setInput("")
              setOutput("")
              localStorage.removeItem(STORAGE_KEY)
            }}
            title={t("tools.encoder.clearAll")}
          >
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
            inputWrapper: "bg-default-100/30 group-hover:bg-default-100/50 transition-colors font-mono text-tiny"
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
