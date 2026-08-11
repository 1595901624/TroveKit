import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import format from 'xml-formatter'
import { getStoredItem, setStoredItem, removeStoredItem } from "../../lib/store"
import { FormatterWorkbench } from "./FormatterWorkbench"

const STORAGE_KEY = "xml-tool-state"

export function XmlTab() {
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
          console.error("Failed to parse XmlTab state", e)
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

  // ... later in the file, replace clear handler (handled below)

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
    const example = `<?xml version="1.0" encoding="UTF-8"?>
<troveKit>
  <version>1.0.0</version>
  <features>
    <feature>Encoders</feature>
    <feature>Hash & Crypto</feature>
    <feature>Classical Ciphers</feature>
    <feature>QR Generator</feature>
    <feature>Formatters</feature>
    <feature>Generators</feature>
    <feature>Log Manager</feature>
    <feature>Settings</feature>
    <feature>Language Support</feature>
    <feature>Theme Toggle</feature>
  </features>
  <settings>
    <theme>dark</theme>
    <language>en</language>
    <offline>true</offline>
  </settings>
  <metadata>
    <author>TroveKit Team</author>
    <license>MIT</license>
    <repository>https://github.com/trovekit/trovekit</repository>
  </metadata>
</troveKit>`
    setCode(example)
    setIsValid(true)
    setErrorMsg("")
  }

  return (
    <FormatterWorkbench
      id="xml"
      label={t("tools.formatter.xml")}
      language="xml"
      code={code}
      onCodeChange={handleCodeChange}
      onFormat={handleFormatEditor}
      onMinify={handleMinifyEditor}
      onExample={handleLoadExample}
      onClear={handleClear}
      status={isValid}
      errorMessage={errorMsg}
      validMessage={t("tools.formatter.validXml")}
      invalidMessage={t("tools.formatter.invalidXml")}
    />
  )
}
