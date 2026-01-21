import { useState, useEffect, useMemo } from "react"
import { Button, Input, Switch, RadioGroup, Radio, Textarea } from "@heroui/react"
import { Copy, Trash2, RefreshCw } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLog } from "../../contexts/LogContext"
import CryptoJS from "crypto-js"
import { getStoredItem, setStoredItem } from "../../lib/store"

const STORAGE_KEY = "uuid-tool-state"

// Helper function to format UUID
const formatUuid = (uuid: string, type: string, isUppercase: boolean, showHyphens: boolean) => {
  let result = uuid
  
  // Type processing
  if (type === "hex") {
    result = uuid.replace(/-/g, "")
  } else if (type === "binary") {
    // Hex to Binary
    const hex = uuid.replace(/-/g, "")
    let bin = ""
    for (let i = 0; i < hex.length; i++) {
      bin += parseInt(hex[i], 16).toString(2).padStart(4, '0')
    }
    result = bin
  } else if (type === "base64") {
    const hex = uuid.replace(/-/g, "")
    const wordArr = CryptoJS.enc.Hex.parse(hex)
    result = CryptoJS.enc.Base64.stringify(wordArr)
  } else {
    // String type - handle hyphens
    if (!showHyphens) {
      result = uuid.replace(/-/g, "")
    }
  }

  // Case processing
  if (type === "string" || type === "hex") {
    if (isUppercase) {
      result = result.toUpperCase()
    } else {
      result = result.toLowerCase()
    }
  }

  return result
}

export function UuidTab() {
  const { t } = useTranslation()
  const { addLog } = useLog()
  
  const [count, setCount] = useState<string>("5")
  const [uuids, setUuids] = useState<string[]>([])
  const [isUppercase, setIsUppercase] = useState<boolean>(true)
  const [showHyphens, setShowHyphens] = useState<boolean>(true)
  const [type, setType] = useState<string>("string")
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    let mounted = true
    getStoredItem(STORAGE_KEY).then((stored) => {
      if (mounted && stored) {
        try {
          const state = JSON.parse(stored)
          if (state.count) setCount(state.count)
          if (state.uuids) setUuids(state.uuids)
          if (state.isUppercase !== undefined) setIsUppercase(state.isUppercase)
          if (state.showHyphens !== undefined) setShowHyphens(state.showHyphens)
          if (state.type) setType(state.type)
        } catch (e) {
          console.error("Failed to parse UuidTab state", e)
        }
      }
      if (mounted) setIsLoaded(true)
    })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (isLoaded) {
      setStoredItem(STORAGE_KEY, JSON.stringify({ count, uuids, isUppercase, showHyphens, type }))
    }
  }, [count, uuids, isUppercase, showHyphens, type, isLoaded])

  const handleGenerate = () => {
    const num = parseInt(count)
    if (isNaN(num) || num <= 0) return
    
    // Limit to 5000
    const limit = Math.min(num, 5000)
    
    const newUuids = []
    for (let i = 0; i < limit; i++) {
      newUuids.push(crypto.randomUUID())
    }
    setUuids(newUuids)

    // Log the generated UUIDs (max 10)
    const logLimit = 10
    const logUuids = newUuids.slice(0, logLimit).map(uuid => 
      formatUuid(uuid, type, isUppercase, showHyphens)
    )
    
    let outputText = logUuids.join("\n")
    if (limit > logLimit) {
      outputText += `\n... (${t("tools.generator.maxLogLimit")})`
    }

    addLog({
      method: "UUID Generate",
      input: `Count: ${limit}`,
      output: outputText
    }, "success")
  }

  const formattedOutput = useMemo(() => {
    if (uuids.length === 0) return ""
    return uuids.map(uuid => formatUuid(uuid, type, isUppercase, showHyphens)).join("\n")
  }, [uuids, type, showHyphens, isUppercase])

  const copyToClipboard = () => {
    if (!formattedOutput) return
    navigator.clipboard.writeText(formattedOutput)
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex flex-wrap items-end gap-4 p-4 bg-default-50 rounded-xl">
        <Input
          type="number"
          label={t("tools.generator.count")}
          placeholder="1-5000"
          value={count}
          onValueChange={(v) => {
            // Enforce limits
            if (v === "") {
                setCount("")
                return
            }
            let n = parseInt(v)
            if (n > 5000) n = 5000
            setCount(n.toString())
          }}
          min={1}
          max={5000}
          className="w-32"
          variant="bordered"
          size="sm"
        />
        
        <Button 
          color="primary" 
          onPress={handleGenerate}
          startContent={<RefreshCw className="w-4 h-4" />}
          className="text-sm"
        >
          {t("tools.generator.generate")}
        </Button>

        <div className="w-px h-8 bg-default-300 mx-2"></div>

        <div className="flex flex-col gap-2">
            <RadioGroup
                orientation="horizontal"
                value={type}
                onValueChange={setType}
                label={t("tools.generator.type")}
                size="sm"
                className="text-tiny"
            >
                <Radio value="string">String</Radio>
                <Radio value="hex">Hex</Radio>
                <Radio value="base64">Base64</Radio>
                <Radio value="binary">Binary</Radio>
            </RadioGroup>
        </div>

        <div className="flex flex-col gap-2 justify-center">
             <Switch 
                size="sm" 
                isSelected={isUppercase} 
                onValueChange={setIsUppercase}
                isDisabled={type === "base64" || type === "binary"}
            >
                {t("tools.generator.uppercase")}
            </Switch>
             <Switch 
                size="sm" 
                isSelected={showHyphens} 
                onValueChange={setShowHyphens}
                isDisabled={type !== "string"}
            >
                {t("tools.generator.hyphens")}
            </Switch>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative group">
        <Textarea
            classNames={{
                base: "h-full",
                input: "h-full font-mono resize-none",
                inputWrapper: "h-full bg-default-100/50 hover:bg-default-100 focus-within:bg-background"
            }}
            value={formattedOutput}
            readOnly
            minRows={12}
            placeholder={t("tools.generator.outputPlaceholder")}
        />
        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button isIconOnly size="sm" variant="flat" onPress={copyToClipboard} title={t("tools.encoder.copy")}>
                <Copy className="w-4 h-4" />
            </Button>
            <Button isIconOnly size="sm" variant="flat" color="danger" onPress={() => setUuids([])} title={t("tools.encoder.clear")}>
                <Trash2 className="w-4 h-4" />
            </Button>
        </div>
      </div>
    </div>
  )
}