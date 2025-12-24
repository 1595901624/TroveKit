import { useState, useRef } from "react"
import { Button, Card, CardBody } from "@heroui/react"
import Editor, { OnMount } from "@monaco-editor/react"
import { Copy, Trash2, CheckCircle2, AlertCircle, Minimize2, Maximize2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLog } from "../contexts/LogContext"
import { useTheme } from "../components/theme-provider"

export function FormatterTool() {
  const { t } = useTranslation()
  const { addLog } = useLog()
  const { theme } = useTheme()
  const [code, setCode] = useState("")
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [errorMsg, setErrorMsg] = useState<string>("")
  
  const editorRef = useRef<any>(null)

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor
    // Configure JSON defaults if needed
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      allowComments: false,
      schemas: [],
      enableSchemaRequest: false,
    });
  }

  const handleFormat = () => {
    if (!code) return
    try {
      const parsed = JSON.parse(code)
      const formatted = JSON.stringify(parsed, null, 2)
      setCode(formatted)
      setIsValid(true)
      setErrorMsg("")
      // addLog({ method: "JSON Format", input: "JSON", output: "Formatted successfully" }, "success")
    } catch (e) {
      setIsValid(false)
      setErrorMsg((e as Error).message)
      // addLog({ method: "JSON Format", input: "JSON", output: (e as Error).message }, "error")
    }
  }

  const handleMinify = () => {
    if (!code) return
    try {
      const parsed = JSON.parse(code)
      const minified = JSON.stringify(parsed)
      setCode(minified)
      setIsValid(true)
      setErrorMsg("")
      // addLog({ method: "JSON Minify", input: "JSON", output: "Minified successfully" }, "success")
    } catch (e) {
      setIsValid(false)
      setErrorMsg((e as Error).message)
      // addLog({ method: "JSON Minify", input: "JSON", output: (e as Error).message }, "error")
    }
  }

  const handleValidate = () => {
    if (!code) {
      setIsValid(null)
      setErrorMsg("")
      return
    }
    try {
      JSON.parse(code)
      setIsValid(true)
      setErrorMsg("")
      // addLog({ method: "JSON Validate", input: "JSON", output: "Valid JSON" }, "success")
    } catch (e) {
      setIsValid(false)
      setErrorMsg((e as Error).message)
      // addLog({ method: "JSON Validate", input: "JSON", output: (e as Error).message }, "error")
    }
  }

  const copyToClipboard = () => {
    if (!code) return
    navigator.clipboard.writeText(code)
    addLog(t("tools.encoder.copiedToClipboard"), "info")
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex gap-2">
          <Button 
            color="primary" 
            variant="flat" 
            onPress={handleFormat} 
            startContent={<Maximize2 className="w-4 h-4" />}
          >
            Format
          </Button>
          <Button 
            color="secondary" 
            variant="flat" 
            onPress={handleMinify} 
            startContent={<Minimize2 className="w-4 h-4" />}
          >
            Minify
          </Button>
          <Button 
            color="success" 
            variant="flat" 
            onPress={handleValidate} 
            startContent={<CheckCircle2 className="w-4 h-4" />}
          >
            Validate
          </Button>
        </div>
        <div className="flex gap-2">
          <Button isIconOnly variant="light" onPress={copyToClipboard} title={t("tools.encoder.copy")}>
            <Copy className="w-4 h-4" />
          </Button>
          <Button isIconOnly variant="light" color="danger" onPress={() => { setCode(""); setIsValid(null); setErrorMsg(""); }} title={t("tools.encoder.clearAll")}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 border border-default-200 rounded-xl overflow-hidden shadow-sm relative group">
         <Editor
            height="100%"
            defaultLanguage="json"
            value={code}
            onChange={(value) => setCode(value || "")}
            onMount={handleEditorDidMount}
            theme={theme === "dark" ? "vs-dark" : "light"}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              wordWrap: "on",
              formatOnPaste: true,
              formatOnType: true,
              scrollBeyondLastLine: false,
              padding: { top: 16, bottom: 16 },
            }}
          />
      </div>

      {isValid === false && (
        <Card className="border-danger bg-danger-50 dark:bg-danger-900/20" shadow="sm">
          <CardBody className="flex flex-row items-center gap-3 py-2">
            <AlertCircle className="w-5 h-5 text-danger" />
            <p className="text-danger font-medium text-sm">
              Invalid JSON: {errorMsg}
            </p>
          </CardBody>
        </Card>
      )}
      
      {isValid === true && (
        <Card className="border-success bg-success-50 dark:bg-success-900/20" shadow="sm">
          <CardBody className="flex flex-row items-center gap-3 py-2">
            <CheckCircle2 className="w-5 h-5 text-success" />
            <p className="text-success font-medium text-sm">
              Valid JSON
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  )
}