import { useState, useEffect, useMemo } from "react"
import { Button, ButtonGroup, Input, Switch, Textarea } from "../../components/ui/base-ui"
import { Copy, Trash2, RefreshCw } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLogActions } from "../../contexts/LogContext"
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
  const { addLog } = useLogActions()
  
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

  const parsedCount = Number.parseInt(count, 10)
  const canGenerate = Number.isFinite(parsedCount) && parsedCount > 0

  const copyToClipboard = () => {
    if (!formattedOutput) return
    navigator.clipboard.writeText(formattedOutput)
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <div className="flex min-h-[58px] shrink-0 flex-wrap items-end gap-2 rounded-xl border border-default-200 bg-default-50/70 p-2">
        <Input
          type="number"
          label={t("tools.generator.count")}
          aria-label={t("tools.generator.count")}
          placeholder="1–5000"
          value={count}
          onValueChange={(value) => {
            if (value === "") {
              setCount("")
              return
            }
            let next = Number.parseInt(value, 10)
            if (next > 5000) next = 5000
            setCount(next.toString())
          }}
          min={1}
          max={5000}
          isInvalid={count !== "" && !canGenerate}
          className="w-28 shrink-0"
          classNames={{ inputWrapper: "bg-background" }}
          size="sm"
        />

        <Button
          size="sm"
          color="primary"
          className="h-8 shrink-0"
          isDisabled={!canGenerate}
          onPress={handleGenerate}
          startContent={<RefreshCw className="h-4 w-4" />}
        >
          {t("tools.generator.generate")}
        </Button>

        <div className="hidden h-5 w-px bg-default-200 sm:block" />

        <div className="flex min-w-0 flex-col gap-1">
          <span className="px-0.5 text-[11px] leading-none text-default-500">{t("tools.generator.type")}</span>
          <ButtonGroup size="sm" variant="light" className="min-w-0 rounded-lg border border-default-200 bg-background p-0.5">
            {["string", "hex", "base64", "binary"].map((format) => (
              <Button
                key={format}
                size="sm"
                color={type === format ? "primary" : "default"}
                variant={type === format ? "flat" : "light"}
                className="h-7 min-w-0 px-2.5 text-xs"
                onPress={() => setType(format)}
              >
                {format === "string" ? "String" : format === "base64" ? "Base64" : format === "binary" ? "Binary" : "Hex"}
              </Button>
            ))}
          </ButtonGroup>
        </div>

        <div className="ml-auto flex h-8 shrink-0 items-center gap-4 rounded-lg border border-default-200 bg-background px-3">
          <Switch size="sm" isSelected={isUppercase} onValueChange={setIsUppercase} isDisabled={type === "base64" || type === "binary"}>
            {t("tools.generator.uppercase")}
          </Switch>
          <Switch size="sm" isSelected={showHyphens} onValueChange={setShowHyphens} isDisabled={type !== "string"}>
            {t("tools.generator.hyphens")}
          </Switch>
        </div>
      </div>

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-default-200 bg-background" aria-labelledby="uuid-output-heading">
        <div className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-default-200 px-3.5">
          <div className="flex min-w-0 items-baseline gap-3">
            <h2 id="uuid-output-heading" className="shrink-0 text-sm font-semibold text-foreground">{t("tools.encoder.output")}</h2>
            <span className="truncate text-[11px] text-default-400">{uuids.length} UUID · {formattedOutput.length} {t("tools.formatter.characters")}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button size="sm" variant="light" color="primary" className="h-8 px-2.5" isDisabled={!formattedOutput} onPress={copyToClipboard} startContent={<Copy className="h-4 w-4" />}>
              {t("tools.encoder.copy")}
            </Button>
            <Button size="sm" variant="light" className="h-8 px-2.5 text-default-500 hover:bg-danger/10 hover:text-danger" isDisabled={!uuids.length} onPress={() => setUuids([])} startContent={<Trash2 className="h-4 w-4" />}>
              {t("tools.encoder.clearAll")}
            </Button>
          </div>
        </div>
        <div className="min-h-0 flex-1 bg-default-50/35 p-3">
          <Textarea
            className="h-full"
            classNames={{ base: "flex h-full flex-col", input: "h-full resize-none font-mono text-xs", inputWrapper: "min-h-0 flex-1 bg-background" }}
            value={formattedOutput}
            readOnly
            disableAutosize
            minRows={12}
            placeholder={t("tools.generator.outputPlaceholder")}
          />
        </div>
      </section>
    </div>
  )
}
