import { useState } from "react"
import { Button } from "@heroui/react"
import Editor from "@monaco-editor/react"
import { ArrowRight, ArrowLeft, Copy, Trash2, BookOpen } from "lucide-react"
import { useTranslation } from "react-i18next"
import { XMLParser, XMLBuilder } from "fast-xml-parser"
import { useTheme } from "../../components/theme-provider"
import { useToast } from "../../contexts/ToastContext"

export function JsonXmlTab() {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const { addToast } = useToast()

  const [jsonCode, setJsonCode] = useState("")
  const [xmlCode, setXmlCode] = useState("")

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
      addToast(t("tools.converter.convertSuccessfully"), "success")
    } catch (e) {
      addToast(`${t("tools.converter.invalidJson")}: ${(e as Error).message}`, "error")
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
      setJsonCode(JSON.stringify(jsonObj, null, 2))
      addToast(t("tools.converter.convertSuccessfully"), "success")
    } catch (e) {
      addToast(`${t("tools.converter.invalidXml")}: ${(e as Error).message}`, "error")
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

  const copyToClipboard = (text: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    addToast(t("tools.converter.copiedToClipboard"), "success")
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Controls */}
      <div className="flex justify-center items-center gap-4 py-2 relative">
         <div className="flex gap-4">
            <Button 
                color="primary" 
                endContent={<ArrowRight className="w-4 h-4" />}
                onPress={handleJsonToXml}
            >
                {t("tools.converter.jsonToXml")}
            </Button>
            
            <Button 
                color="secondary"
                startContent={<ArrowLeft className="w-4 h-4" />}
                onPress={handleXmlToJson}
            >
                {t("tools.converter.xmlToJson")}
            </Button>
         </div>

         <div className="absolute right-0 top-1/2 -translate-y-1/2">
            <Button
                variant="flat"
                color="warning"
                onPress={handleLoadExample}
                startContent={<BookOpen className="w-4 h-4" />}
                size="sm"
            >
                {t("tools.formatter.example")}
            </Button>
         </div>
      </div>

      {/* Editors Area */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-4">
        {/* JSON Editor */}
        <div className="flex-1 flex flex-col gap-2 min-w-0">
            <div className="flex justify-between items-center px-1">
                <span className="text-sm font-medium text-default-600">JSON</span>
                <div className="flex gap-1">
                    <Button isIconOnly size="sm" variant="light" onPress={() => copyToClipboard(jsonCode)} title={t("tools.converter.copy")}>
                        <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => setJsonCode("")} title={t("tools.converter.clear")}>
                        <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>
            <div className="flex-1 border border-default-200 rounded-xl overflow-hidden shadow-sm bg-content1">
                <Editor
                    height="100%"
                    defaultLanguage="json"
                    value={jsonCode}
                    onChange={(value) => setJsonCode(value || "")}
                    theme={theme === "dark" ? "vs-dark" : "light"}
                    options={{
                        minimap: { enabled: false },
                        fontSize: 13,
                        wordWrap: "on",
                        scrollBeyondLastLine: false,
                        padding: { top: 12, bottom: 12 },
                    }}
                />
            </div>
        </div>

        {/* XML Editor */}
        <div className="flex-1 flex flex-col gap-2 min-w-0">
            <div className="flex justify-between items-center px-1">
                <span className="text-sm font-medium text-default-600">XML</span>
                <div className="flex gap-1">
                    <Button isIconOnly size="sm" variant="light" onPress={() => copyToClipboard(xmlCode)} title={t("tools.converter.copy")}>
                        <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => setXmlCode("")} title={t("tools.converter.clear")}>
                        <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>
            <div className="flex-1 border border-default-200 rounded-xl overflow-hidden shadow-sm bg-content1">
                <Editor
                    height="100%"
                    defaultLanguage="xml"
                    value={xmlCode}
                    onChange={(value) => setXmlCode(value || "")}
                    theme={theme === "dark" ? "vs-dark" : "light"}
                    options={{
                        minimap: { enabled: false },
                        fontSize: 13,
                        wordWrap: "on",
                        scrollBeyondLastLine: false,
                        padding: { top: 12, bottom: 12 },
                    }}
                />
            </div>
        </div>
      </div>
    </div>
  )
}