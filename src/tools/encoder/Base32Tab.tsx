import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useLog } from "../../contexts/LogContext"
import { base32Decode, base32Encode } from "../../lib/base32"
import { getStoredItem, removeStoredItem, setStoredItem } from "../../lib/store"
import { EncoderWorkbench } from "./EncoderWorkbench"

const STORAGE_KEY = "base32-tool-state"

type Base32Mode = "encode" | "decode"

function transformBase32(value: string, mode: Base32Mode) {
  return mode === "encode" ? base32Encode(value) : base32Decode(value)
}

export function Base32Tab() {
  const { t } = useTranslation()
  const { addLog } = useLog()
  const [base32Input, setBase32Input] = useState("")
  const [base32Output, setBase32Output] = useState("")
  const [activeMode, setActiveMode] = useState<Base32Mode>("encode")
  const [autoTransform, setAutoTransform] = useState(false)
  const [transformError, setTransformError] = useState("")
  const [isLoaded, setIsLoaded] = useState(false)
  const latestAutoResult = useRef({ activeMode, autoTransform, transformError, base32Input, base32Output })
  const addLogRef = useRef(addLog)

  addLogRef.current = addLog
  latestAutoResult.current = { activeMode, autoTransform, transformError, base32Input, base32Output }

  useEffect(() => {
    let mounted = true
    getStoredItem(STORAGE_KEY).then((stored) => {
      if (mounted && stored) {
        try {
          const state = JSON.parse(stored)
          if (state.base32Input) setBase32Input(state.base32Input)
          if (state.base32Output) setBase32Output(state.base32Output)
          if (state.activeMode === "encode" || state.activeMode === "decode") setActiveMode(state.activeMode)
          if (typeof state.autoTransform === "boolean") setAutoTransform(state.autoTransform)
        } catch (e) {
          console.error("Failed to parse Base32Tab state", e)
        }
      }
      if (mounted) setIsLoaded(true)
    })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (isLoaded) {
      setStoredItem(STORAGE_KEY, JSON.stringify({ base32Input, base32Output, activeMode, autoTransform }))
    }
  }, [activeMode, autoTransform, base32Input, base32Output, isLoaded])

  useEffect(() => {
    if (!isLoaded || !autoTransform) return
    if (!base32Input) {
      setBase32Output("")
      setTransformError("")
      return
    }
    try {
      setBase32Output(transformBase32(base32Input, activeMode))
      setTransformError("")
    } catch (e) {
      setBase32Output("")
      setTransformError((e as Error).message)
    }
  }, [activeMode, autoTransform, base32Input, isLoaded])

  useEffect(() => () => {
    const state = latestAutoResult.current
    if (!state.autoTransform || !state.base32Input || !state.base32Output || state.transformError) return
    addLogRef.current({
      method: state.activeMode === "encode" ? "Base32 Encode" : "Base32 Decode",
      input: state.base32Input,
      output: state.base32Output,
    }, "success")
  }, [])

  const runTransform = (writeLog: boolean) => {
    if (!base32Input) return
    const method = activeMode === "encode" ? "Base32 Encode" : "Base32 Decode"
    try {
      const result = transformBase32(base32Input, activeMode)
      setBase32Output(result)
      setTransformError("")
      if (writeLog) addLog({ method, input: base32Input, output: result }, "success")
    } catch (e) {
      const message = (e as Error).message
      setTransformError(message)
      if (writeLog) addLog({ method, input: base32Input, output: message }, "error")
    }
  }

  const swapBase32 = () => {
    setBase32Input(base32Output)
    setBase32Output(base32Input)
    if (autoTransform) setActiveMode(activeMode === "encode" ? "decode" : "encode")
    setTransformError("")
  }

  const clearAll = () => {
    setBase32Input("")
    setBase32Output("")
    setTransformError("")
    removeStoredItem(STORAGE_KEY)
  }

  return (
    <EncoderWorkbench
      id="base32"
      modes={[
        { key: "encode", label: t("tools.encoder.encode") },
        { key: "decode", label: t("tools.encoder.decode") },
      ]}
      activeMode={activeMode}
      onModeChange={setActiveMode}
      autoTransform={autoTransform}
      onAutoTransformChange={setAutoTransform}
      onTransform={() => runTransform(!autoTransform)}
      onSwap={swapBase32}
      onClear={clearAll}
      input={base32Input}
      onInputChange={setBase32Input}
      inputPlaceholder={t("tools.encoder.base32Placeholder")}
      output={base32Output}
      error={transformError}
    />
  )
}
