import { useEffect, useState } from "react"
import { addToast } from "../../components/ui/base-ui"
import { useTranslation } from "react-i18next"
import yaml from "js-yaml"
import { useLog } from "../../contexts/LogContext"
import { getStoredItem, removeStoredItem, setStoredItem } from "../../lib/store"
import { ConverterWorkbench } from "./ConverterWorkbench"

const STORAGE_KEY = "json-yaml-tool-state"

export function JsonYamlTab() {
  const { t } = useTranslation()
  const { addLog } = useLog()

  const [jsonCode, setJsonCode] = useState("")
  const [yamlCode, setYamlCode] = useState("")
  const [isLoaded, setIsLoaded] = useState(false)

  // 组件会在切换 Tab 时卸载，因此挂载时从持久化存储恢复左右编辑器内容。
  useEffect(() => {
    let mounted = true
    getStoredItem(STORAGE_KEY).then((stored) => {
      if (mounted && stored) {
        try {
          const state = JSON.parse(stored)
          if (typeof state.jsonCode === "string") setJsonCode(state.jsonCode)
          if (typeof state.yamlCode === "string") setYamlCode(state.yamlCode)
        } catch (e) {
          console.error("Failed to parse JsonYamlTab state", e)
        }
      }
      if (mounted) setIsLoaded(true)
    })
    return () => { mounted = false }
  }, [])

  // 恢复完成后再写入，避免初次挂载时用空状态覆盖已有编辑内容。
  useEffect(() => {
    if (isLoaded) {
      setStoredItem(STORAGE_KEY, JSON.stringify({ jsonCode, yamlCode }))
    }
  }, [jsonCode, yamlCode, isLoaded])

  const handleJsonToYaml = () => {
    if (!jsonCode) return
    try {
      const jsonObj = JSON.parse(jsonCode)
      const yamlStr = yaml.dump(jsonObj, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
      })
      setYamlCode(yamlStr)
      addLog({
        method: "JSON to YAML",
        input: jsonCode,
        output: yamlStr
      }, "success")
      addToast({ title: t("tools.converter.convertSuccessfully"), severity: "success" })
    } catch (e) {
      addToast({ title: `${t("tools.converter.invalidJson")}: ${(e as Error).message}`, severity: "danger" })
    }
  }

  const handleYamlToJson = () => {
    if (!yamlCode) return
    try {
      const jsonObj = yaml.load(yamlCode)
      const json = JSON.stringify(jsonObj, null, 2)
      setJsonCode(json)
      addLog({
        method: "YAML to JSON",
        input: yamlCode,
        output: json
      }, "success")
      addToast({ title: t("tools.converter.convertSuccessfully"), severity: "success" })
    } catch (e) {
      addToast({ title: `${t("tools.converter.invalidYaml")}: ${(e as Error).message}`, severity: "danger" })
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
    setJsonCode(jsonStr)
    
    try {
      const yamlStr = yaml.dump(example)
      setYamlCode(yamlStr)
    } catch (e) {
      console.error("Failed to generate YAML example", e)
    }
  }

  const copyToClipboard = (text: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    addToast({ title: t("tools.converter.copiedToClipboard"), severity: "success" })
  }

  const handleClearAll = () => {
    setJsonCode("")
    setYamlCode("")
    removeStoredItem(STORAGE_KEY)
  }

  return (
    <ConverterWorkbench
      left={{ id: "json-yaml-json", label: "JSON", language: "json", value: jsonCode, onChange: setJsonCode, onClear: () => setJsonCode(""), onCopy: () => copyToClipboard(jsonCode), jsonDiagnostics: true }}
      right={{ id: "json-yaml-yaml", label: "YAML", language: "yaml", value: yamlCode, onChange: setYamlCode, onClear: () => setYamlCode(""), onCopy: () => copyToClipboard(yamlCode) }}
      onLeftToRight={handleJsonToYaml}
      onRightToLeft={handleYamlToJson}
      leftToRightLabel={t("tools.converter.jsonToYaml")}
      rightToLeftLabel={t("tools.converter.yamlToJson")}
      onExample={handleLoadExample}
      onClearAll={handleClearAll}
    />
  )
}
