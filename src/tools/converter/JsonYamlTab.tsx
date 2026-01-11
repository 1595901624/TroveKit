import { useState } from "react"
import { Button, addToast } from "@heroui/react"
import Editor from "@monaco-editor/react"
import { ArrowRight, ArrowLeft, Copy, Trash2, BookOpen } from "lucide-react"
import { useTranslation } from "react-i18next"
import yaml from "js-yaml"
import { useTheme } from "../../components/theme-provider"
import { useLog } from "../../contexts/LogContext"

export function JsonYamlTab() {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const { addLog } = useLog()

  const [jsonCode, setJsonCode] = useState("")
  const [yamlCode, setYamlCode] = useState("")

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

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Controls */}
      <div className="flex justify-center items-center gap-4 py-2 relative">
         <div className="flex gap-4">
            <Button 
                color="primary" 
                endContent={<ArrowRight className="w-4 h-4" />}
                onPress={handleJsonToYaml}
            >
                {t("tools.converter.jsonToYaml")}
            </Button>
            
            <Button 
                color="secondary"
                startContent={<ArrowLeft className="w-4 h-4" />}
                onPress={handleYamlToJson}
            >
                {t("tools.converter.yamlToJson")}
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

        {/* YAML Editor */}
        <div className="flex-1 flex flex-col gap-2 min-w-0">
            <div className="flex justify-between items-center px-1">
                <span className="text-sm font-medium text-default-600">YAML</span>
                <div className="flex gap-1">
                    <Button isIconOnly size="sm" variant="light" onPress={() => copyToClipboard(yamlCode)} title={t("tools.converter.copy")}>
                        <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => setYamlCode("")} title={t("tools.converter.clear")}>
                        <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>
            <div className="flex-1 border border-default-200 rounded-xl overflow-hidden shadow-sm bg-content1">
                <Editor
                    height="100%"
                    defaultLanguage="yaml"
                    value={yamlCode}
                    onChange={(value) => setYamlCode(value || "")}
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
