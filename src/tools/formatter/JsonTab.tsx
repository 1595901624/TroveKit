import { useState, useEffect } from "react"
import { Button, ButtonGroup } from "../../components/ui/base-ui"
import { AlignLeft, Network, ChevronsUpDown, ChevronsDownUp } from "lucide-react"
import { useTranslation } from "react-i18next"
import ReactJson from 'react-json-view'
import { useTheme } from "../../components/theme-provider"
import { useStorageLoader } from "../../hooks/usePersistentState"
import { setStoredItem, removeStoredItem } from "../../lib/store"
import { FormatterWorkbench } from "./FormatterWorkbench"

const STORAGE_KEY = "json-tool-state"

export function JsonTab() {
  const { t } = useTranslation()
  const { theme } = useTheme()

  const [savedState, isLoaded] = useStorageLoader<any>(STORAGE_KEY)

  const [code, setCode] = useState("")
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [errorMsg, setErrorMsg] = useState<string>("")
  const [viewMode, setViewMode] = useState<"text" | "graph">("text")
  const [collapsed, setCollapsed] = useState<boolean | number>(false)

  useEffect(() => {
    if (isLoaded && savedState) {
        if (savedState.code) setCode(savedState.code)
        if (savedState.viewMode) setViewMode(savedState.viewMode)
        if (savedState.collapsed !== undefined) setCollapsed(savedState.collapsed)
    }
  }, [isLoaded, savedState])

  useEffect(() => {
    if (isLoaded) {
      setStoredItem(STORAGE_KEY, JSON.stringify({ code, viewMode, collapsed }))
    }
  }, [code, viewMode, collapsed, isLoaded])

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

  const handleCodeChange = (value: string) => {
    setCode(value)
    setIsValid(null)
    setErrorMsg("")
  }

  const handleClear = () => {
    setCode("")
    setIsValid(null)
    setErrorMsg("")
    setViewMode("text")
    setCollapsed(false)
    removeStoredItem(STORAGE_KEY)
  }

  const getJsonObject = () => {
      try {
          return code ? JSON.parse(code) : {}
      } catch {
          return {}
      }
  }

  // --- Example Operation ---
  const handleLoadExample = () => {
    const example = {
      troveKit: {
        version: "1.0.0",
        features: ["Encoders", "Hash & Crypto", "Classical Ciphers", "QR Generator", "Formatters", "Generators"],
        settings: {
          theme: "dark",
          language: "en",
          offline: true
        },
        tools: {
          formatter: {
            supported: ["JSON", "XML", "CSS"],
            example: true
          },
          encoder: {
            supported: ["Base64", "Base32", "URL", "BaseX"],
            customAlphabet: true
          }
        },
        metadata: {
          author: "TroveKit Team",
          license: "MIT",
          repository: "https://github.com/trovekit/trovekit"
        }
      }
    }
    const formatted = JSON.stringify(example, null, 2)
    setCode(formatted)
    setIsValid(true)
    setErrorMsg("")
  }

  return (
    <FormatterWorkbench
      id="json"
      label={t("tools.formatter.json")}
      language="json"
      code={code}
      onCodeChange={handleCodeChange}
      onFormat={handleFormatEditor}
      onMinify={handleMinifyEditor}
      onValidate={viewMode === "graph" ? handleValidateGraph : handleValidateEditor}
      onExample={handleLoadExample}
      onClear={handleClear}
      status={isValid}
      errorMessage={errorMsg}
      validMessage={t("tools.formatter.validJson")}
      invalidMessage={t("tools.formatter.invalidJson")}
      jsonDiagnostics
      toolbarStart={(
        <ButtonGroup aria-label={`${t("tools.formatter.text")} / ${t("tools.formatter.graph")}`} className="rounded-lg bg-default-100 p-0.5">
          <Button
            size="sm"
            variant={viewMode === "text" ? "flat" : "light"}
            color={viewMode === "text" ? "primary" : "default"}
            className={viewMode === "text" ? "h-8 bg-primary/10 text-primary" : "h-8 text-default-600"}
            aria-pressed={viewMode === "text"}
            onPress={() => toggleView("text")}
            startContent={<AlignLeft className="h-4 w-4" />}
          >
            {t("tools.formatter.text")}
          </Button>
          <Button
            size="sm"
            variant={viewMode === "graph" ? "flat" : "light"}
            color={viewMode === "graph" ? "primary" : "default"}
            className={viewMode === "graph" ? "h-8 bg-primary/10 text-primary" : "h-8 text-default-600"}
            aria-pressed={viewMode === "graph"}
            onPress={() => toggleView("graph")}
            startContent={<Network className="h-4 w-4" />}
          >
            {t("tools.formatter.graph")}
          </Button>
        </ButtonGroup>
      )}
      secondaryLabel={t("tools.formatter.graph")}
      secondaryActions={viewMode === "graph" ? (
        <>
          <Button size="sm" variant="light" className="h-8 px-2" onPress={handleExpandGraph} startContent={<ChevronsUpDown className="h-4 w-4" />}>
            {t("tools.formatter.expand")}
          </Button>
          <Button size="sm" variant="light" className="h-8 px-2" onPress={handleCollapseGraph} startContent={<ChevronsDownUp className="h-4 w-4" />}>
            {t("tools.formatter.collapse")}
          </Button>
        </>
      ) : undefined}
      secondaryContent={viewMode === "graph" ? (
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
      ) : undefined}
    />
  )
}
