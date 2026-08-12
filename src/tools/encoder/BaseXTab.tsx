import { useEffect, useRef, useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import { useTranslation } from "react-i18next"
import { Select, SelectItem } from "../../components/ui/base-ui"
import { useLogActions } from "../../contexts/LogContext"
import { getStoredItem, removeStoredItem, setStoredItem } from "../../lib/store"
import { EncoderWorkbench } from "./EncoderWorkbench"

const STORAGE_KEY = "basex-tool-state"

type BaseXMode = "encode" | "decode"

export function BaseXTab() {
  const { t } = useTranslation()
  const { addLog } = useLogActions()
  const [baseXInput, setBaseXInput] = useState("")
  const [baseXOutput, setBaseXOutput] = useState("")
  const [activeMode, setActiveMode] = useState<BaseXMode>("encode")
  const [autoTransform, setAutoTransform] = useState(false)
  const [selectedBase, setSelectedBase] = useState("base16")
  const [customAlphabet, setCustomAlphabet] = useState("")
  const [transformError, setTransformError] = useState("")
  const [isLoaded, setIsLoaded] = useState(false)
  const isCustomAlphabet = false
  const latestAutoResult = useRef({ activeMode, autoTransform, transformError, baseXInput, baseXOutput, selectedBase })
  const addLogRef = useRef(addLog)
  const requestIdRef = useRef(0)

  addLogRef.current = addLog
  latestAutoResult.current = { activeMode, autoTransform, transformError, baseXInput, baseXOutput, selectedBase }

  const baseOptions = [
    { key: "base16", label: t("tools.encoder.base16") },
    { key: "base32", label: t("tools.encoder.base32") },
    { key: "base58", label: t("tools.encoder.base58") },
    { key: "base62", label: t("tools.encoder.base62") },
    { key: "base64", label: t("tools.encoder.base64") },
    { key: "base91", label: t("tools.encoder.base91") },
  ]

  useEffect(() => {
    let mounted = true
    getStoredItem(STORAGE_KEY).then((stored) => {
      if (mounted && stored) {
        try {
          const state = JSON.parse(stored)
          if (state.baseXInput) setBaseXInput(state.baseXInput)
          if (state.baseXOutput) setBaseXOutput(state.baseXOutput)
          if (state.activeMode === "encode" || state.activeMode === "decode") setActiveMode(state.activeMode)
          if (typeof state.autoTransform === "boolean") setAutoTransform(state.autoTransform)
          if (state.selectedBase) setSelectedBase(state.selectedBase)
          if (state.customAlphabet) setCustomAlphabet(state.customAlphabet)
        } catch (e) {
          console.error("Failed to parse BaseXTab state", e)
        }
      }
      if (mounted) setIsLoaded(true)
    })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (isLoaded) {
      setStoredItem(STORAGE_KEY, JSON.stringify({
        baseXInput,
        baseXOutput,
        activeMode,
        autoTransform,
        selectedBase,
        isCustomAlphabet,
        customAlphabet,
      }))
    }
  }, [activeMode, autoTransform, baseXInput, baseXOutput, customAlphabet, isLoaded, selectedBase])

  const transformBaseX = (value: string, mode: BaseXMode) => invoke<string>(
    mode === "encode" ? "basex_encode" : "basex_decode",
    { input: value, base: selectedBase, alphabet: isCustomAlphabet ? customAlphabet : null },
  )

  useEffect(() => {
    if (!isLoaded || !autoTransform) return
    if (!baseXInput) {
      setBaseXOutput("")
      setTransformError("")
      return
    }

    const requestId = ++requestIdRef.current
    const timer = window.setTimeout(async () => {
      try {
        const result = await transformBaseX(baseXInput, activeMode)
        if (requestId !== requestIdRef.current) return
        setBaseXOutput(result)
        setTransformError("")
      } catch (e) {
        if (requestId !== requestIdRef.current) return
        setBaseXOutput("")
        setTransformError(String(e))
      }
    }, 180)

    return () => {
      window.clearTimeout(timer)
      requestIdRef.current++
    }
  }, [activeMode, autoTransform, baseXInput, customAlphabet, isLoaded, selectedBase])

  useEffect(() => () => {
    const state = latestAutoResult.current
    if (!state.autoTransform || !state.baseXInput || !state.baseXOutput || state.transformError) return
    addLogRef.current({
      method: `BaseX ${state.activeMode === "encode" ? "Encode" : "Decode"} (${state.selectedBase})`,
      input: state.baseXInput,
      output: state.baseXOutput,
      cryptoParams: { algorithm: state.selectedBase },
    }, "success")
  }, [])

  const runTransform = async (writeLog: boolean) => {
    if (!baseXInput) return
    const method = `BaseX ${activeMode === "encode" ? "Encode" : "Decode"} (${selectedBase})`
    try {
      const result = await transformBaseX(baseXInput, activeMode)
      setBaseXOutput(result)
      setTransformError("")
      if (writeLog) addLog({
        method,
        input: baseXInput,
        output: result,
        cryptoParams: { algorithm: selectedBase },
      }, "success")
    } catch (e) {
      const message = String(e)
      setBaseXOutput("")
      setTransformError(message)
      if (writeLog) addLog({
        method,
        input: baseXInput,
        output: message,
        cryptoParams: { algorithm: selectedBase },
      }, "error")
    }
  }

  const swapBaseX = () => {
    setBaseXInput(baseXOutput)
    setBaseXOutput(baseXInput)
    if (autoTransform) setActiveMode(activeMode === "encode" ? "decode" : "encode")
    setTransformError("")
  }

  const clearAll = () => {
    setBaseXInput("")
    setBaseXOutput("")
    setSelectedBase("base16")
    setCustomAlphabet("")
    setTransformError("")
    removeStoredItem(STORAGE_KEY)
  }

  return (
    <EncoderWorkbench
      id="basex"
      modes={[
        { key: "encode", label: t("tools.encoder.encode") },
        { key: "decode", label: t("tools.encoder.decode") },
      ]}
      activeMode={activeMode}
      onModeChange={setActiveMode}
      autoTransform={autoTransform}
      onAutoTransformChange={setAutoTransform}
      onTransform={() => { void runTransform(!autoTransform) }}
      onSwap={swapBaseX}
      onClear={clearAll}
      input={baseXInput}
      onInputChange={setBaseXInput}
      inputPlaceholder={t("tools.encoder.baseXPlaceholder")}
      output={baseXOutput}
      error={transformError}
      toolbarContent={(
        <Select
          aria-label={t("tools.encoder.base")}
          className="w-36"
          classNames={{ trigger: "h-8 bg-background px-2.5 text-xs" }}
          selectedKeys={[selectedBase]}
          onChange={(event) => setSelectedBase(event.target.value)}
        >
          {baseOptions.map((option) => <SelectItem key={option.key}>{option.label}</SelectItem>)}
        </Select>
      )}
    />
  )
}
