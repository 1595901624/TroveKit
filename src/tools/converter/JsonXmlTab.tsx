import { useEffect, useRef, useState } from "react"
import { addToast } from "../../components/ui/base-ui"
import { useTranslation } from "react-i18next"
import { useLogActions } from "../../contexts/LogContext"
import { getStoredItem } from "../../lib/store"
import { useConverterWorker } from "../../hooks/useConverterWorker"
import { useDebouncedStoredValue } from "../../hooks/useDebouncedStoredValue"
import { ConverterWorkbench } from "./ConverterWorkbench"

const STORAGE_KEY = "json-xml-tool-state"

export function JsonXmlTab() {
  const { t } = useTranslation()
  const { addLog } = useLogActions()

  const [jsonCode, setJsonCode] = useState("")
  const [xmlCode, setXmlCode] = useState("")
  const [isLoaded, setIsLoaded] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const convert = useConverterWorker()
  const jsonCodeRef = useRef("")
  const xmlCodeRef = useRef("")
  const persistence = useDebouncedStoredValue(STORAGE_KEY, { jsonCode, xmlCode }, isLoaded, 1500, false)

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
          if (typeof state.xmlCode === "string") {
            xmlCodeRef.current = state.xmlCode
            setXmlCode(state.xmlCode)
          }
        } catch (e) {
          console.error("Failed to parse JsonXmlTab state", e)
        }
      }
      if (mounted) {
        setIsLoaded(true)
      }
    })
    return () => { mounted = false }
  }, [])

  const updateJsonCode = (value: string) => {
    jsonCodeRef.current = value
    setJsonCode(value)
  }

  const updateXmlCode = (value: string) => {
    xmlCodeRef.current = value
    setXmlCode(value)
  }

  const handleJsonToXml = async (currentJson: string) => {
    if (!currentJson) return
    setIsProcessing(true)
    try {
      const xml = await convert("jsonToXml", currentJson)
      updateXmlCode(xml)
      addLog({
        method: "JSON to XML",
        input: currentJson,
        output: xml
      }, "success")
      addToast({ title: t("tools.converter.convertSuccessfully"), severity: "success" })
    } catch (e) {
      addToast({ title: `${t("tools.converter.invalidJson")}: ${(e as Error).message}`, severity: "danger" })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleXmlToJson = async (_currentJson: string, currentXml: string) => {
    if (!currentXml) return
    setIsProcessing(true)
    try {
      const json = await convert("xmlToJson", currentXml)
      updateJsonCode(json)
      addLog({
        method: "XML to JSON",
        input: currentXml,
        output: json
      }, "success")
      addToast({ title: t("tools.converter.convertSuccessfully"), severity: "success" })
    } catch (e) {
      addToast({ title: `${t("tools.converter.invalidXml")}: ${(e as Error).message}`, severity: "danger" })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleLoadExample = () => {
    const example = {
      library: {
        store: {
          name: "TroveKit Books",
          location: "Internet"
        },
        books: [
          {
            id: "1",
            title: "The Art of Code",
            author: "Anonymous",
            price: 29.99,
            tags: ["programming", "tech"]
          },
          {
            id: "2",
            title: "Rust for Beginners",
            author: "Ferris",
            price: 35.50,
            tags: ["rust", "system"]
          }
        ]
      }
    }
    const json = JSON.stringify(example, null, 2)
    updateJsonCode(json)
    void convert("jsonToXml", json).then(updateXmlCode).catch((e) => console.error("Failed to generate XML example", e))
  }

  const handleClearAll = () => {
    updateJsonCode("")
    updateXmlCode("")
    persistence.remove()
  }

  return (
    <ConverterWorkbench
      left={{ id: "json-xml-json", label: "JSON", language: "json", value: jsonCode, onChange: updateJsonCode, onDispose: (value) => { jsonCodeRef.current = value; persistence.flush({ jsonCode: value, xmlCode: xmlCodeRef.current }) }, onClear: () => updateJsonCode(""), jsonDiagnostics: true }}
      right={{ id: "json-xml-xml", label: "XML", language: "xml", value: xmlCode, onChange: updateXmlCode, onDispose: (value) => { xmlCodeRef.current = value; persistence.flush({ jsonCode: jsonCodeRef.current, xmlCode: value }) }, onClear: () => updateXmlCode("") }}
      onLeftToRight={handleJsonToXml}
      onRightToLeft={handleXmlToJson}
      leftToRightLabel={t("tools.converter.jsonToXml")}
      rightToLeftLabel={t("tools.converter.xmlToJson")}
      onExample={handleLoadExample}
      onClearAll={handleClearAll}
      isProcessing={isProcessing}
    />
  )
}
