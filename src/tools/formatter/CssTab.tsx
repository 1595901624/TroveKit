import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { css as formatCss } from 'js-beautify'
import { getStoredItem, setStoredItem, removeStoredItem } from "../../lib/store"
import { FormatterWorkbench } from "./FormatterWorkbench"

const STORAGE_KEY = "css-tool-state"

export function CssTab() {
  const { t } = useTranslation()

  const [code, setCode] = useState("")
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [errorMsg, setErrorMsg] = useState<string>("")
  const [isLoaded, setIsLoaded] = useState(false)

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

  const handleCodeChange = (value: string) => {
    setCode(value)
    setIsValid(null)
    setErrorMsg("")
  }

  const handleClear = () => {
    setCode("")
    setIsValid(null)
    setErrorMsg("")
    removeStoredItem(STORAGE_KEY)
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
    <FormatterWorkbench
      id="css"
      label={t("tools.formatter.css")}
      language="css"
      code={code}
      onCodeChange={handleCodeChange}
      onFormat={handleFormatEditor}
      onMinify={handleMinifyEditor}
      onExample={handleLoadExample}
      onClear={handleClear}
      status={isValid}
      errorMessage={errorMsg}
      validMessage={t("tools.formatter.validCss")}
      invalidMessage={t("tools.formatter.invalidCss")}
    />
  )
}
