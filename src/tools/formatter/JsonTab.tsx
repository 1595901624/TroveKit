import { useState, useRef, useEffect } from "react"
import { Button, Card, CardBody, ButtonGroup } from "@heroui/react"
import Editor, { OnMount } from "@monaco-editor/react"
import { Copy, Trash2, CheckCircle2, AlertCircle, Minimize2, Maximize2, AlignLeft, Network, ChevronsUpDown, ChevronsDownUp } from "lucide-react"
import { useTranslation } from "react-i18next"
import ReactJson from 'react-json-view'
import { useTheme } from "../../components/theme-provider"

const STORAGE_KEY = "json-tool-state"

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

export function JsonTab() {
  const { t } = useTranslation()
  const { theme } = useTheme()

  const savedState = loadStateFromStorage()

  const [code, setCode] = useState(savedState.code || "")
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [errorMsg, setErrorMsg] = useState<string>("")
  const [viewMode, setViewMode] = useState<"text" | "graph">(savedState.viewMode || "text")
  const [collapsed, setCollapsed] = useState<boolean | number>(savedState.collapsed !== undefined ? savedState.collapsed : false)

  const editorRef = useRef<any>(null)

  useEffect(() => {
    saveStateToStorage({ code, viewMode, collapsed })
  }, [code, viewMode, collapsed])

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

  // --- Editor Operations ---
  const handleFormatEditor = () => {
    if (!code) return
    try {
      const parsed = JSON.parse(code)
      const formatted = JSON.stringify(parsed, null, 2)
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
      const parsed = JSON.parse(code)
      const minified = JSON.stringify(parsed)
      setCode(minified)
      setIsValid(true)
      setErrorMsg("")
    } catch (e) {
      setIsValid(false)
      setErrorMsg((e as Error).message)
    }
  }

  const handleValidateEditor = () => {
    if (!code) {
      setIsValid(null)
      setErrorMsg("")
      return
    }
    try {
      JSON.parse(code)
      setIsValid(true)
      setErrorMsg("")
    } catch (e) {
      setIsValid(false)
      setErrorMsg((e as Error).message)
    }
  }

  // --- Graph Operations ---
  const handleExpandGraph = () => {
    setCollapsed(false)
  }

  const handleCollapseGraph = () => {
    setCollapsed(true)
  }

  const handleValidateGraph = () => {
    // In graph mode, the source is always the 'code' state.
    // If 'code' is invalid JSON, the graph might behave weirdly or show error,
    // but here we just re-run validation to show the feedback card.
    handleValidateEditor()
  }

  const toggleView = (mode: "text" | "graph") => {
    if (mode === "graph") {
      try {
        if (code) {
            JSON.parse(code)
            setViewMode("graph")
            setIsValid(true)
            setErrorMsg("")
        } else {
             // Let's just allow switching if empty
             setViewMode("graph")
        }
      } catch (e) {
        setIsValid(false)
        setErrorMsg((e as Error).message)
        // Keep in text mode to fix error
      }
    } else {
      setViewMode("text")
    }
  }

  const handleGraphEdit = (edit: any) => {
    try {
        const newCode = JSON.stringify(edit.updated_src, null, 2)
        setCode(newCode)
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

  const getJsonObject = () => {
      try {
          return code ? JSON.parse(code) : {}
      } catch {
          return {}
      }
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex gap-2 items-center">
            {/* View Switcher */}
            <ButtonGroup variant="flat">
                <Button 
                    color={viewMode === "text" ? "primary" : "default"}
                    onPress={() => toggleView("text")}
                    startContent={<AlignLeft className="w-4 h-4" />}
                >
                    {t("tools.formatter.text")}
                </Button>
                <Button 
                    color={viewMode === "graph" ? "primary" : "default"}
                    onPress={() => toggleView("graph")}
                    startContent={<Network className="w-4 h-4" />}
                >
                    {t("tools.formatter.graph")}
                </Button>
            </ButtonGroup>

            <div className="w-px h-6 bg-default-300 mx-2"></div>

            {/* Editor Controls */}
            <ButtonGroup variant="flat">
                <Button
                    color="primary"
                    variant="flat"
                    onPress={handleFormatEditor}
                    startContent={<Maximize2 className="w-4 h-4" />}
                    title={t("tools.formatter.format")} // Tooltip since we might want compact buttons? No, stick to label
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
                <Button
                    color="success"
                    variant="flat"
                    onPress={handleValidateEditor}
                    startContent={<CheckCircle2 className="w-4 h-4" />}
                >
                    {t("tools.formatter.validate")}
                </Button>
            </ButtonGroup>

            {/* Graph Controls (Visible only in Graph View) */}
            {viewMode === "graph" && (
                <>
                    <div className="w-px h-6 bg-default-300 mx-2"></div>
                    <ButtonGroup variant="flat">
                        <Button
                            color="primary"
                            variant="flat"
                            onPress={handleExpandGraph}
                            startContent={<ChevronsUpDown className="w-4 h-4" />}
                        >
                            {t("tools.formatter.expand")}
                        </Button>
                        <Button
                            color="secondary"
                            variant="flat"
                            onPress={handleCollapseGraph}
                            startContent={<ChevronsDownUp className="w-4 h-4" />}
                        >
                            {t("tools.formatter.collapse")}
                        </Button>
                        <Button
                            color="success"
                            variant="flat"
                            onPress={handleValidateGraph}
                            startContent={<CheckCircle2 className="w-4 h-4" />}
                        >
                            {t("tools.formatter.validateGraphStructure")}
                        </Button>
                    </ButtonGroup>
                </>
            )}
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
        <div className={`h-full ${viewMode === "graph" ? "w-1/2 border-r border-default-200" : "w-full"}`}>
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
        
        {viewMode === "graph" && (
            <div className="w-1/2 h-full overflow-auto p-4 text-left bg-content1">
                <ReactJson 
                    src={getJsonObject()} 
                    theme={theme === "dark" ? "monokai" : "rjv-default"}
                    onEdit={handleGraphEdit}
                    onAdd={handleGraphEdit}
                    onDelete={handleGraphEdit}
                    displayDataTypes={false}
                    collapsed={collapsed}
                    style={{ backgroundColor: 'transparent' }}
                />
            </div>
        )}
      </div>

      {isValid === false && (
        <Card className="border-danger bg-danger-50 dark:bg-danger-900/20" shadow="sm">
          <CardBody className="flex flex-row items-center gap-3 py-2">
            <AlertCircle className="w-5 h-5 text-danger" />
            <p className="text-danger font-medium text-sm">
              {t("tools.formatter.invalidJson")}: {errorMsg}
            </p>
          </CardBody>
        </Card>
      )}

      {isValid === true && (
        <Card className="border-success bg-success-50 dark:bg-success-900/20" shadow="sm">
          <CardBody className="flex flex-row items-center gap-3 py-2">
            <CheckCircle2 className="w-5 h-5 text-success" />
            <p className="text-success font-medium text-sm">
              {t("tools.formatter.validJson")}
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
