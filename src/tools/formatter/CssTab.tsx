import { useState, useRef, useEffect } from "react"
import { Button, Card, CardBody, ButtonGroup } from "@heroui/react"
import Editor, { OnMount } from "@monaco-editor/react"
import { Copy, Trash2, CheckCircle2, AlertCircle, Minimize2, Maximize2, BookOpen } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useTheme } from "../../components/theme-provider"
import { css as formatCss } from 'js-beautify'
import { getStoredItem, setStoredItem, removeStoredItem } from "../../lib/store"

const STORAGE_KEY = "css-tool-state"

export function CssTab() {
  const { t } = useTranslation()
  const { theme } = useTheme()

  const [code, setCode] = useState("")
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [errorMsg, setErrorMsg] = useState<string>("")
  const [isLoaded, setIsLoaded] = useState(false)

  const editorRef = useRef<any>(null)

  useEffect(() => {
    let mounted = true
    getStoredItem(STORAGE_KEY).then((stored) => {
      if (mounted && stored) {
        try {
          const state = JSON.parse(stored)
          if (state.code) setCode(state.code)
          if (state.isValid !== undefined) setIsValid(state.isValid)
          if (state.errorMsg) setErrorMsg(state.errorMsg)
        } catch (e) {
          console.error("Failed to parse CssTab state", e)
        }
      }
      if (mounted) setIsLoaded(true)
    })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (isLoaded) {
      setStoredItem(STORAGE_KEY, JSON.stringify({ code, isValid, errorMsg }))
    }
  }, [code, isValid, errorMsg, isLoaded])

  // ... later replace clear handler

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor
  }

  const handleFormatEditor = () => {
    if (!code) return
    try {
      const formatted = formatCss(code, { 
        indent_size: 2,
        space_around_combinator: true,
        newline_between_rules: true,
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
      // Simple CSS minification using regex for offline usage without heavy deps
      // or use a minifier lib if available. js-beautify doesn't minify.
      // But we can just use a simple regex approach which is often enough for simple tools.
      
      let minified = code
        .replace(/\/\*[\s\S]*?\*\//g, "") // Remove comments
        .replace(/\s+/g, " ") // Collapse whitespace
        .replace(/\s*([{}:;,])\s*/g, "$1") // Remove space around separators
        .replace(/;\}/g, "}") // Remove last semicolon
        .trim();
        
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

  // --- Example Operation ---
  const handleLoadExample = () => {
    const example = `/* TroveKit CSS Example */
.trove_kit {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #1a1a1a;
  color: #ffffff;
  padding: 20px;
  border-radius: 8px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.header {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 16px;
  color: #00d4ff;
  text-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
}

.body {
  font-size: 16px;
  line-height: 1.6;
  max-width: 600px;
  text-align: center;
  color: #cccccc;
}

.footer {
  margin-top: 20px;
  font-size: 12px;
  color: #888888;
}

.button {
  background: linear-gradient(135deg, #00d4ff, #0099cc);
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  transition: transform 0.2s;
}

.button:hover {
  transform: scale(1.05);
}

.container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 20px;
}

.item {
  background: #2a2a2a;
  padding: 10px;
  border-radius: 4px;
  text-align: center;
}

/* TroveKit Theme Variables */
:root {
  --trove-primary: #00d4ff;
  --trove-secondary: #0099cc;
  --trove-bg: #1a1a1a;
  --trove-text: #ffffff;
  --trove-border: #333333;
}`
    setCode(example)
    setIsValid(true)
    setErrorMsg("")
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
                <Button
                    color="warning"
                    variant="flat"
                    onPress={handleLoadExample}
                    startContent={<BookOpen className="w-4 h-4" />}
                >
                    {t("tools.formatter.example")}
                </Button>
            </ButtonGroup>
        </div>
        
        <div className="flex gap-2">
          <Button isIconOnly variant="light" onPress={copyToClipboard} title={t("tools.encoder.copy")}>
            <Copy className="w-4 h-4" />
          </Button>
          <Button isIconOnly variant="light" color="danger" onPress={() => { setCode(""); setIsValid(null); setErrorMsg(""); removeStoredItem(STORAGE_KEY); }} title={t("tools.encoder.clearAll")}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 border border-default-200 rounded-xl overflow-hidden shadow-sm relative group bg-content1 flex flex-row">
        <div className="w-full h-full">
            <Editor
            height="100%"
            defaultLanguage="css"
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
              {t("tools.formatter.invalidCss")}: {errorMsg}
            </p>
          </CardBody>
        </Card>
      )}

      {isValid === true && (
        <Card className="border-success bg-success-50 dark:bg-success-900/20" shadow="sm">
          <CardBody className="flex flex-row items-center gap-3 py-2">
            <CheckCircle2 className="w-5 h-5 text-success" />
            <p className="text-success font-medium text-xs">
              {t("tools.formatter.validCss")}
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
