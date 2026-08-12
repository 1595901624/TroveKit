import { useEffect, useRef, useState } from "react"
import { addToast } from "../../components/ui/base-ui"
import { useTranslation } from "react-i18next"
import { useLogActions } from "../../contexts/LogContext"
import { getStoredItem } from "../../lib/store"
import { useDebouncedStoredValue } from "../../hooks/useDebouncedStoredValue"
import { useConverterWorker } from "../../hooks/useConverterWorker"
import { ConverterWorkbench } from "./ConverterWorkbench"

const STORAGE_KEY = "json-yaml-tool-state"

export function JsonYamlTab() {
  const { t } = useTranslation()
  const { addLog } = useLogActions()

  const [jsonCode, setJsonCode] = useState("")
  const [yamlCode, setYamlCode] = useState("")
  const [isLoaded, setIsLoaded] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const convert = useConverterWorker()
  const jsonCodeRef = useRef("")
  const yamlCodeRef = useRef("")
  const persistence = useDebouncedStoredValue(STORAGE_KEY, { jsonCode, yamlCode }, isLoaded, 1500, false)

  // 组件会在切换 Tab 时卸载，因此挂载时从持久化存储恢复左右编辑器内容。
  useEffect(() => {
    let mounted = true
    getStoredItem(STORAGE_KEY).then((stored) => {
      if (mounted && stored) {
        try {
          const state = JSON.parse(stored)
          if (typeof state.jsonCode === "string") {
            jsonCodeRef.current = state.jsonCode
            setJsonCode(state.jsonCode)
          }
          if (typeof state.yamlCode === "string") {
            yamlCodeRef.current = state.yamlCode
            setYamlCode(state.yamlCode)
          }
        } catch (e) {
          console.error("Failed to parse JsonYamlTab state", e)
        }
      }
      if (mounted) setIsLoaded(true)
    })
    return () => { mounted = false }
  }, [])

  const updateJsonCode = (value: string) => {
    jsonCodeRef.current = value
    setJsonCode(value)
  }

  const updateYamlCode = (value: string) => {
    yamlCodeRef.current = value
    setYamlCode(value)
  }

  const handleJsonToYaml = async (currentJson: string) => {
    if (!currentJson) return
    setIsProcessing(true)
    try {
      const yamlStr = await convert("jsonToYaml", currentJson)
      updateYamlCode(yamlStr)
      addLog({
        method: "JSON to YAML",
        input: currentJson,
        output: yamlStr
      }, "success")
      addToast({ title: t("tools.converter.convertSuccessfully"), severity: "success" })
    } catch (e) {
      addToast({ title: `${t("tools.converter.invalidJson")}: ${(e as Error).message}`, severity: "danger" })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleYamlToJson = async (_currentJson: string, currentYaml: string) => {
    if (!currentYaml) return
    setIsProcessing(true)
    try {
      const json = await convert("yamlToJson", currentYaml)
      updateJsonCode(json)
      addLog({
        method: "YAML to JSON",
        input: currentYaml,
        output: json
      }, "success")
      addToast({ title: t("tools.converter.convertSuccessfully"), severity: "success" })
    } catch (e) {
      addToast({ title: `${t("tools.converter.invalidYaml")}: ${(e as Error).message}`, severity: "danger" })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleLoadExample = () => {
    const example = {
      project: {
        name: "TroveKit",
        version: "1.0.0",
        description: "Developer Utility Belt",
        features: [
          "Hash Generator",
          "Encoder/Decoder",
          "Formatters",
          "Converters"
        ],
        settings: {
          offline: true,
          secure: true,
          theme: "dynamic"
        }
      }
    }
    const jsonStr = JSON.stringify(example, null, 2)
    updateJsonCode(jsonStr)
    
    void convert("jsonToYaml", jsonStr).then(updateYamlCode).catch((e) => console.error("Failed to generate YAML example", e))
  }

  const copyToClipboard = (text: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    addToast({ title: t("tools.converter.copiedToClipboard"), severity: "success" })
  }

  const handleClearAll = () => {
    updateJsonCode("")
    updateYamlCode("")
    persistence.remove()
  }

  return (
    <ConverterWorkbench
      left={{ id: "json-yaml-json", label: "JSON", language: "json", value: jsonCode, onChange: updateJsonCode, onDispose: (value) => { jsonCodeRef.current = value; persistence.flush({ jsonCode: value, yamlCode: yamlCodeRef.current }) }, onClear: () => updateJsonCode(""), onCopy: copyToClipboard, jsonDiagnostics: true }}
      right={{ id: "json-yaml-yaml", label: "YAML", language: "yaml", value: yamlCode, onChange: updateYamlCode, onDispose: (value) => { yamlCodeRef.current = value; persistence.flush({ jsonCode: jsonCodeRef.current, yamlCode: value }) }, onClear: () => updateYamlCode(""), onCopy: copyToClipboard }}
      onLeftToRight={handleJsonToYaml}
      onRightToLeft={handleYamlToJson}
      leftToRightLabel={t("tools.converter.jsonToYaml")}
      rightToLeftLabel={t("tools.converter.yamlToJson")}
      onExample={handleLoadExample}
      onClearAll={handleClearAll}
      isProcessing={isProcessing}
    />
  )
}
