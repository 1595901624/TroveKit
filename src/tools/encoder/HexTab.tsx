import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Select, SelectItem } from "../../components/ui/base-ui"
import { useLogActions } from "../../contexts/LogContext"
import { useStorageLoader } from "../../hooks/usePersistentState"
import { removeStoredItem, setStoredItem } from "../../lib/store"
import { EncoderWorkbench } from "./EncoderWorkbench"

const STORAGE_KEY = "hex-tool-state"

type HexMode = "encode" | "decode"
type NewlineMode = "lf" | "crlf"

function transformHex(value: string, mode: HexMode, newlineMode: NewlineMode) {
  if (mode === "encode") {
    const normalized = newlineMode === "crlf"
      ? value.replace(/\r\n/g, "\n").replace(/\n/g, "\r\n")
      : value.replace(/\r\n/g, "\n")
    return Array.from(new TextEncoder().encode(normalized))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")
  }

  const cleanHex = value.replace(/\s+/g, "")
  if (cleanHex.length % 2 !== 0) throw new Error("Invalid hex string length")
  const bytes = new Uint8Array(cleanHex.length / 2)
  for (let index = 0; index < cleanHex.length; index += 2) {
    bytes[index / 2] = parseInt(cleanHex.substring(index, index + 2), 16)
  }
  return new TextDecoder().decode(bytes)
}

export function HexTab() {
  const { t } = useTranslation()
  const { addLog } = useLogActions()
  const [savedState, isLoaded] = useStorageLoader<any>(STORAGE_KEY)
  const [hexInput, setHexInput] = useState("")
  const [hexOutput, setHexOutput] = useState("")
  const [activeMode, setActiveMode] = useState<HexMode>("encode")
  const [autoTransform, setAutoTransform] = useState(false)
  const [newlineMode, setNewlineMode] = useState<NewlineMode>("lf")
  const [transformError, setTransformError] = useState("")
  const latestAutoResult = useRef({ activeMode, autoTransform, transformError, hexInput, hexOutput, method: "" })
  const addLogRef = useRef(addLog)

  addLogRef.current = addLog
  latestAutoResult.current = {
    activeMode,
    autoTransform,
    transformError,
    hexInput,
    hexOutput,
    method: activeMode === "encode" ? t("tools.encoder.hexEncode") : t("tools.encoder.hexDecode"),
  }

  useEffect(() => {
    if (isLoaded && savedState) {
      if (savedState.hexInput) setHexInput(savedState.hexInput)
      if (savedState.hexOutput) setHexOutput(savedState.hexOutput)
      if (savedState.activeMode === "encode" || savedState.activeMode === "decode") setActiveMode(savedState.activeMode)
      if (typeof savedState.autoTransform === "boolean") setAutoTransform(savedState.autoTransform)
      if (savedState.newlineMode === "lf" || savedState.newlineMode === "crlf") setNewlineMode(savedState.newlineMode)
    }
  }, [isLoaded, savedState])

  useEffect(() => {
    if (isLoaded) {
      setStoredItem(STORAGE_KEY, JSON.stringify({ hexInput, hexOutput, activeMode, autoTransform, newlineMode }))
    }
  }, [activeMode, autoTransform, hexInput, hexOutput, isLoaded, newlineMode])

  useEffect(() => {
    if (!isLoaded || !autoTransform) return
    if (!hexInput) {
      setHexOutput("")
      setTransformError("")
      return
    }
    try {
      setHexOutput(transformHex(hexInput, activeMode, newlineMode))
      setTransformError("")
    } catch (e) {
      setHexOutput("")
      setTransformError((e as Error).message)
    }
  }, [activeMode, autoTransform, hexInput, isLoaded, newlineMode])

  useEffect(() => () => {
    const state = latestAutoResult.current
    if (!state.autoTransform || !state.hexInput || !state.hexOutput || state.transformError) return
    addLogRef.current({ method: state.method, input: state.hexInput, output: state.hexOutput }, "success")
  }, [])

  const runTransform = (writeLog: boolean) => {
    if (!hexInput) return
    const method = activeMode === "encode" ? t("tools.encoder.hexEncode") : t("tools.encoder.hexDecode")
    try {
      const result = transformHex(hexInput, activeMode, newlineMode)
      setHexOutput(result)
      setTransformError("")
      if (writeLog) addLog({ method, input: hexInput, output: result }, "success")
    } catch (e) {
      const message = (e as Error).message
      setTransformError(message)
      if (writeLog) addLog({ method, input: hexInput, output: message }, "error")
    }
  }

  const swapHex = () => {
    setHexInput(hexOutput)
    setHexOutput(hexInput)
    if (autoTransform) setActiveMode(activeMode === "encode" ? "decode" : "encode")
    setTransformError("")
  }

  const clearAll = () => {
    setHexInput("")
    setHexOutput("")
    setTransformError("")
    removeStoredItem(STORAGE_KEY)
  }

  return (
    <EncoderWorkbench
      id="hex"
      modes={[
        { key: "encode", label: t("tools.encoder.encode") },
        { key: "decode", label: t("tools.encoder.decode") },
      ]}
      activeMode={activeMode}
      onModeChange={setActiveMode}
      autoTransform={autoTransform}
      onAutoTransformChange={setAutoTransform}
      onTransform={() => runTransform(!autoTransform)}
      onSwap={swapHex}
      onClear={clearAll}
      input={hexInput}
      onInputChange={setHexInput}
      inputPlaceholder={t("tools.encoder.hexPlaceholder")}
      output={hexOutput}
      error={transformError}
      toolbarContent={(
        <Select
          aria-label={t("tools.encoder.newlineMode")}
          className="w-28"
          classNames={{ trigger: "h-8 bg-background px-2.5 text-xs" }}
          selectedKeys={[newlineMode]}
          onChange={(event) => setNewlineMode(event.target.value as NewlineMode)}
        >
          <SelectItem key="lf">{t("tools.encoder.lf")}</SelectItem>
          <SelectItem key="crlf">{t("tools.encoder.crlf")}</SelectItem>
        </Select>
      )}
    />
  )
}
