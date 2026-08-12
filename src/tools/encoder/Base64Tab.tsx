import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useLogActions } from "../../contexts/LogContext"
import { getStoredItem, removeStoredItem, setStoredItem } from "../../lib/store"
import { EncoderWorkbench } from "./EncoderWorkbench"

const STORAGE_KEY = "base64-tool-state"

type Base64Mode = "encode" | "decode"

function transformBase64(value: string, mode: Base64Mode) {
  if (mode === "encode") {
    const data = new TextEncoder().encode(value)
    const binary = Array.from(data, (byte) => String.fromCodePoint(byte)).join("")
    return window.btoa(binary)
  }

  const binary = window.atob(value.trim())
  const bytes = Uint8Array.from(binary, (character) => character.codePointAt(0)!)
  return new TextDecoder().decode(bytes)
}

export function Base64Tab() {
  const { t } = useTranslation()
  const { addLog } = useLogActions()
  const [base64Input, setBase64Input] = useState("")
  const [base64Output, setBase64Output] = useState("")
  const [activeMode, setActiveMode] = useState<Base64Mode>("encode")
  const [autoTransform, setAutoTransform] = useState(false)
  const [transformError, setTransformError] = useState("")
  const [isLoaded, setIsLoaded] = useState(false)
  const latestAutoResult = useRef({ activeMode, autoTransform, transformError, base64Input, base64Output })
  const addLogRef = useRef(addLog)

  addLogRef.current = addLog
  latestAutoResult.current = { activeMode, autoTransform, transformError, base64Input, base64Output }

  useEffect(() => {
    let mounted = true
    getStoredItem(STORAGE_KEY).then((stored) => {
      if (mounted && stored) {
        try {
          const state = JSON.parse(stored)
          if (state.base64Input) setBase64Input(state.base64Input)
          if (state.base64Output) setBase64Output(state.base64Output)
          if (state.activeMode === "encode" || state.activeMode === "decode") setActiveMode(state.activeMode)
          if (typeof state.autoTransform === "boolean") setAutoTransform(state.autoTransform)
        } catch (e) {
          console.error("Failed to parse Base64Tab state", e)
        }
      }
      if (mounted) setIsLoaded(true)
    })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (isLoaded) {
      setStoredItem(STORAGE_KEY, JSON.stringify({ base64Input, base64Output, activeMode, autoTransform }))
    }
  }, [activeMode, autoTransform, base64Input, base64Output, isLoaded])

  useEffect(() => {
    if (!isLoaded || !autoTransform) return
    if (!base64Input) {
      setBase64Output("")
      setTransformError("")
      return
    }
    try {
      setBase64Output(transformBase64(base64Input, activeMode))
      setTransformError("")
    } catch (e) {
      setBase64Output("")
      setTransformError((e as Error).message)
    }
  }, [activeMode, autoTransform, base64Input, isLoaded])

  useEffect(() => () => {
    const state = latestAutoResult.current
    if (!state.autoTransform || !state.base64Input || !state.base64Output || state.transformError) return
    addLogRef.current({
      method: state.activeMode === "encode" ? "Base64 Encode" : "Base64 Decode",
      input: state.base64Input,
      output: state.base64Output,
    }, "success")
  }, [])

  const runTransform = (writeLog: boolean) => {
    if (!base64Input) return
    const method = activeMode === "encode" ? "Base64 Encode" : "Base64 Decode"
    try {
      const result = transformBase64(base64Input, activeMode)
      setBase64Output(result)
      setTransformError("")
      if (writeLog) addLog({ method, input: base64Input, output: result }, "success")
    } catch (e) {
      const message = (e as Error).message
      setTransformError(message)
      if (writeLog) addLog({ method, input: base64Input, output: message }, "error")
    }
  }

  const swapBase64 = () => {
    setBase64Input(base64Output)
    setBase64Output(base64Input)
    if (autoTransform) setActiveMode(activeMode === "encode" ? "decode" : "encode")
    setTransformError("")
  }

  const clearAll = () => {
    setBase64Input("")
    setBase64Output("")
    setTransformError("")
    removeStoredItem(STORAGE_KEY)
  }

  return (
    <EncoderWorkbench
      id="base64"
      modes={[
        { key: "encode", label: t("tools.encoder.encode") },
        { key: "decode", label: t("tools.encoder.decode") },
      ]}
      activeMode={activeMode}
      onModeChange={setActiveMode}
      autoTransform={autoTransform}
      onAutoTransformChange={setAutoTransform}
      onTransform={() => runTransform(!autoTransform)}
      onSwap={swapBase64}
      onClear={clearAll}
      input={base64Input}
      onInputChange={setBase64Input}
      inputPlaceholder={t("tools.encoder.base64Placeholder")}
      output={base64Output}
      error={transformError}
    />
  )
}
