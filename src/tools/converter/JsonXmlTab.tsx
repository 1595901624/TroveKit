import { useEffect, useState } from "react"
import { addToast } from "../../components/ui/base-ui"
import { useTranslation } from "react-i18next"
import { XMLParser, XMLBuilder } from "fast-xml-parser"
import { useLog } from "../../contexts/LogContext"
import { getStoredItem, removeStoredItem, setStoredItem } from "../../lib/store"
import { ConverterWorkbench } from "./ConverterWorkbench"

const STORAGE_KEY = "json-xml-tool-state"

export function JsonXmlTab() {
  const { t } = useTranslation()
  const { addLog } = useLog()

  const [jsonCode, setJsonCode] = useState("")
  const [xmlCode, setXmlCode] = useState("")
  const [isLoaded, setIsLoaded] = useState(false)

  // 组件会在切换 Tab 时卸载，因此挂载时从持久化存储恢复左右编辑器内容。
  useEffect(() => {
    let mounted = true
    getStoredItem(STORAGE_KEY).then((stored) => {
      if (mounted && stored) {
        try {
          const state = JSON.parse(stored)
          if (typeof state.jsonCode === "string") setJsonCode(state.jsonCode)
          if (typeof state.xmlCode === "string") setXmlCode(state.xmlCode)
        } catch (e) {
          console.error("Failed to parse JsonXmlTab state", e)
        }
      }
      if (mounted) setIsLoaded(true)
    })
    return () => { mounted = false }
  }, [])

  // 恢复完成后再写入，避免初次挂载时用空状态覆盖已有编辑内容。
  useEffect(() => {
    if (isLoaded) {
      setStoredItem(STORAGE_KEY, JSON.stringify({ jsonCode, xmlCode }))
    }
  }, [jsonCode, xmlCode, isLoaded])

  const handleJsonToXml = () => {
    if (!jsonCode) return
    try {
      const builder = new XMLBuilder({
        format: true,
        ignoreAttributes: false,
        suppressEmptyNode: true,
      })
      const jsonObj = JSON.parse(jsonCode)
      const xml = builder.build(jsonObj)
      setXmlCode(xml)
      addLog({
        method: "JSON to XML",
        input: jsonCode,
        output: xml
      }, "success")
      addToast({ title: t("tools.converter.convertSuccessfully"), severity: "success" })
    } catch (e) {
      addToast({ title: `${t("tools.converter.invalidJson")}: ${(e as Error).message}`, severity: "danger" })
    }
  }

  const handleXmlToJson = () => {
    if (!xmlCode) return
    try {
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_"
      })
      const jsonObj = parser.parse(xmlCode)
      const json = JSON.stringify(jsonObj, null, 2)
      setJsonCode(json)
      addLog({
        method: "XML to JSON",
        input: xmlCode,
        output: json
      }, "success")
      addToast({ title: t("tools.converter.convertSuccessfully"), severity: "success" })
    } catch (e) {
      addToast({ title: `${t("tools.converter.invalidXml")}: ${(e as Error).message}`, severity: "danger" })
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
    setJsonCode(JSON.stringify(example, null, 2))
    
    // Auto convert to XML for the example
    try {
      const builder = new XMLBuilder({
        format: true,
        ignoreAttributes: false,
        suppressEmptyNode: true,
      })
      const xml = builder.build(example)
      setXmlCode(xml)
    } catch (e) {
      console.error("Failed to generate XML example", e)
    }
  }

  const handleClearAll = () => {
    setJsonCode("")
    setXmlCode("")
    removeStoredItem(STORAGE_KEY)
  }

  return (
    <ConverterWorkbench
      left={{ id: "json-xml-json", label: "JSON", language: "json", value: jsonCode, onChange: setJsonCode, onClear: () => setJsonCode(""), jsonDiagnostics: true }}
      right={{ id: "json-xml-xml", label: "XML", language: "xml", value: xmlCode, onChange: setXmlCode, onClear: () => setXmlCode("") }}
      onLeftToRight={handleJsonToXml}
      onRightToLeft={handleXmlToJson}
      leftToRightLabel={t("tools.converter.jsonToXml")}
      rightToLeftLabel={t("tools.converter.xmlToJson")}
      onExample={handleLoadExample}
      onClearAll={handleClearAll}
    />
  )
}
