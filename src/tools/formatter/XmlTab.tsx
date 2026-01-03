import { useState, useRef, useEffect } from "react"
import { Button, Card, CardBody, ButtonGroup } from "@heroui/react"
import Editor, { OnMount } from "@monaco-editor/react"
import { Copy, Trash2, CheckCircle2, AlertCircle, Minimize2, Maximize2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useTheme } from "../../components/theme-provider"
import format from 'xml-formatter'

const STORAGE_KEY = "xml-tool-state"

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

export function XmlTab() {
  const { t } = useTranslation()
  const { theme } = useTheme()

  const savedState = loadStateFromStorage()

  const [code, setCode] = useState(savedState.code || "")
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [errorMsg, setErrorMsg] = useState<string>("")

  const editorRef = useRef<any>(null)

  useEffect(() => {
    saveStateToStorage({ code })
  }, [code])

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor
  }

  const handleFormatEditor = () => {
    if (!code) return
    try {
      const formatted = format(code, { 
        indentation: '  ', 
        filter: (node) => node.type !== 'Comment',
        collapseContent: true, 
        lineSeparator: '\n' 
      })
      setCode(formatted)
      setIsValid(true)
      setErrorMsg("")
    } catch (e) {
      setIsValid(false)
      setErrorMsg((e as Error).message)
    }
  }

  const handleMinifyEditor = () => {
    if (!code) return
    try {
      const minified = format(code, { 
        indentation: '', 
        lineSeparator: '',
        collapseContent: true
      })
      setCode(minified)
      setIsValid(true)
      setErrorMsg("")
    } catch (e) {
      setIsValid(false)
      setErrorMsg((e as Error).message)
    }
  }

  const copyToClipboard = () => {
    if (!code) return
    navigator.clipboard.writeText(code)
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex gap-2 items-center">
            <ButtonGroup variant="flat">
                <Button
                    color="primary"
                    variant="flat"
                    onPress={handleFormatEditor}
                    startContent={<Maximize2 className="w-4 h-4" />}
                >
                    {t("tools.formatter.format")}
                </Button>
                <Button
                    color="secondary"
                    variant="flat"
                    onPress={handleMinifyEditor}
                    startContent={<Minimize2 className="w-4 h-4" />}
                >
                    {t("tools.formatter.minify")}
                </Button>
            </ButtonGroup>
        </div>
        
        <div className="flex gap-2">
          <Button isIconOnly variant="light" onPress={copyToClipboard} title={t("tools.encoder.copy")}>
            <Copy className="w-4 h-4" />
          </Button>
          <Button isIconOnly variant="light" color="danger" onPress={() => { setCode(""); setIsValid(null); setErrorMsg(""); localStorage.removeItem(STORAGE_KEY); }} title={t("tools.encoder.clearAll")}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 border border-default-200 rounded-xl overflow-hidden shadow-sm relative group bg-content1 flex flex-row">
        <div className="w-full h-full">
            <Editor
            height="100%"
            defaultLanguage="xml"
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
      </div>

      {isValid === false && (
        <Card className="border-danger bg-danger-50 dark:bg-danger-900/20" shadow="sm">
          <CardBody className="flex flex-row items-center gap-3 py-2">
            <AlertCircle className="w-5 h-5 text-danger" />
            <p className="text-danger font-medium text-xs">
              {t("tools.formatter.invalidXml")}: {errorMsg}
            </p>
          </CardBody>
        </Card>
      )}

      {isValid === true && (
        <Card className="border-success bg-success-50 dark:bg-success-900/20" shadow="sm">
          <CardBody className="flex flex-row items-center gap-3 py-2">
            <CheckCircle2 className="w-5 h-5 text-success" />
            <p className="text-success font-medium text-xs">
              {t("tools.formatter.validXml")}
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
