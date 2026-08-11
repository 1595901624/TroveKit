import { useEffect, useRef, useState } from "react"
import { ArrowDownUp, ArrowLeftRight, Copy, Play, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button, ButtonGroup, Switch, Textarea } from "../../components/ui/base-ui"
import { useLog } from "../../contexts/LogContext"
import { getStoredItem, removeStoredItem, setStoredItem } from "../../lib/store"

const STORAGE_KEY = "url-tool-state"

type UrlMode = "encode" | "decode"

function getByteLength(value: string) {
  return new TextEncoder().encode(value).length
}

function transformUrl(value: string, mode: UrlMode) {
  return mode === "encode" ? encodeURIComponent(value) : decodeURIComponent(value)
}

export function UrlTab() {
  const { t } = useTranslation()
  const { addLog } = useLog()

  const [urlInput, setUrlInput] = useState("")
  const [urlOutput, setUrlOutput] = useState("")
  const [activeMode, setActiveMode] = useState<UrlMode>("encode")
  const [autoTransform, setAutoTransform] = useState(true)
  const [transformError, setTransformError] = useState("")
  const [isLoaded, setIsLoaded] = useState(false)
  const latestAutoResult = useRef({
    activeMode,
    autoTransform,
    transformError,
    urlInput,
    urlOutput,
  })
  const addLogRef = useRef(addLog)

  addLogRef.current = addLog
  latestAutoResult.current = { activeMode, autoTransform, transformError, urlInput, urlOutput }

  useEffect(() => {
    let mounted = true
    getStoredItem(STORAGE_KEY).then((stored) => {
      if (mounted && stored) {
        try {
          const state = JSON.parse(stored)
          if (state.urlInput) setUrlInput(state.urlInput)
          if (state.urlOutput) setUrlOutput(state.urlOutput)
          if (state.activeMode === "encode" || state.activeMode === "decode") setActiveMode(state.activeMode)
          if (typeof state.autoTransform === "boolean") setAutoTransform(state.autoTransform)
        } catch (e) {
          console.error("Failed to parse UrlTab state", e)
        }
      }
      if (mounted) setIsLoaded(true)
    })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (isLoaded) {
      setStoredItem(STORAGE_KEY, JSON.stringify({ urlInput, urlOutput, activeMode, autoTransform }))
    }
  }, [urlInput, urlOutput, activeMode, autoTransform, isLoaded])

  useEffect(() => {
    if (!isLoaded || !autoTransform) return
    if (!urlInput) {
      setUrlOutput("")
      setTransformError("")
      return
    }
    try {
      setUrlOutput(transformUrl(urlInput, activeMode))
      setTransformError("")
    } catch (e) {
      setUrlOutput("")
      setTransformError((e as Error).message)
    }
  }, [activeMode, autoTransform, isLoaded, urlInput])

  useEffect(() => () => {
    const state = latestAutoResult.current
    if (!state.autoTransform || !state.urlInput || !state.urlOutput || state.transformError) return
    addLogRef.current({
      method: state.activeMode === "encode" ? "URL Encode" : "URL Decode",
      input: state.urlInput,
      output: state.urlOutput,
    }, "success")
  }, [])

  const handleUrlEncode = () => {
    if (!urlInput) return
    try {
      const result = transformUrl(urlInput, "encode")
      setUrlOutput(result)
      setTransformError("")
      addLog({ method: "URL Encode", input: urlInput, output: result }, "success")
    } catch (e) {
      setTransformError((e as Error).message)
      addLog({ method: "URL Encode", input: urlInput, output: (e as Error).message }, "error")
    }
  }

  const handleUrlDecode = () => {
    if (!urlInput) return
    try {
      const result = transformUrl(urlInput, "decode")
      setUrlOutput(result)
      setTransformError("")
      addLog({ method: "URL Decode", input: urlInput, output: result }, "success")
    } catch (e) {
      setTransformError((e as Error).message)
      addLog({ method: "URL Decode", input: urlInput, output: (e as Error).message }, "error")
    }
  }

  const handleTransform = (writeLog = true) => {
    if (!writeLog) {
      if (!urlInput) return
      try {
        setUrlOutput(transformUrl(urlInput, activeMode))
        setTransformError("")
      } catch (e) {
        setTransformError((e as Error).message)
      }
      return
    }
    if (activeMode === "encode") handleUrlEncode()
    else handleUrlDecode()
  }

  const swapUrl = () => {
    setUrlInput(urlOutput)
    setUrlOutput(urlInput)
    if (autoTransform) setActiveMode(activeMode === "encode" ? "decode" : "encode")
    setTransformError("")
  }

  const clearAll = () => {
    setUrlInput("")
    setUrlOutput("")
    setTransformError("")
    removeStoredItem(STORAGE_KEY)
  }

  const copyToClipboard = (text: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
  }

  const inputBytes = getByteLength(urlInput)
  const outputBytes = getByteLength(urlOutput)

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-default-200 bg-default-50/70 p-1.5">
        <div className="flex flex-wrap items-center gap-3">
          <ButtonGroup
            aria-label={t("tools.encoder.urlMode")}
            className="rounded-lg bg-default-100 p-0.5"
          >
            <Button
              size="sm"
              variant={activeMode === "encode" ? "flat" : "light"}
              color={activeMode === "encode" ? "primary" : "default"}
              className={activeMode === "encode"
                ? "h-8 min-w-[72px] bg-primary/10 text-primary dark:bg-blue-400/15 dark:text-blue-300 dark:hover:bg-blue-400/20"
                : "h-8 min-w-[72px] text-default-600"}
              aria-pressed={activeMode === "encode"}
              onPress={() => setActiveMode("encode")}
            >
              {t("tools.encoder.encode")}
            </Button>
            <Button
              size="sm"
              variant={activeMode === "decode" ? "flat" : "light"}
              color={activeMode === "decode" ? "primary" : "default"}
              className={activeMode === "decode"
                ? "h-8 min-w-[72px] bg-primary/10 text-primary dark:bg-blue-400/15 dark:text-blue-300 dark:hover:bg-blue-400/20"
                : "h-8 min-w-[72px] text-default-600"}
              aria-pressed={activeMode === "decode"}
              onPress={() => setActiveMode("decode")}
            >
              {t("tools.encoder.decode")}
            </Button>
          </ButtonGroup>

          <Switch
            size="sm"
            isSelected={autoTransform}
            onValueChange={setAutoTransform}
            className="gap-1.5 text-xs"
          >
            {t("tools.encoder.autoTransform")}
          </Switch>

          <Button
            size="sm"
            color="primary"
            variant="solid"
            className="h-8 min-w-[84px]"
            onPress={() => handleTransform(!autoTransform)}
            isDisabled={!urlInput}
            startContent={<Play className="h-3.5 w-3.5" />}
          >
            {activeMode === "encode" ? t("tools.encoder.encode") : t("tools.encoder.decode")}
          </Button>
        </div>

        <Button
          size="sm"
          variant="light"
          className="h-8 text-default-500 hover:bg-danger/10 hover:text-danger"
          onPress={clearAll}
          startContent={<Trash2 className="h-4 w-4" />}
        >
          {t("tools.encoder.clearAll")}
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_40px_minmax(0,1fr)] overflow-hidden rounded-xl border border-default-200 bg-background md:grid-cols-[minmax(0,1fr)_48px_minmax(0,1fr)] md:grid-rows-1">
        <section className="flex min-h-0 min-w-0 flex-col" aria-labelledby="url-input-heading">
          <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-default-200 px-4">
            <div className="flex min-w-0 items-baseline gap-3">
              <h2 id="url-input-heading" className="shrink-0 text-sm font-semibold text-foreground">
                {t("tools.encoder.input")}
              </h2>
              <span className="truncate text-[11px] text-default-400">
                {t("tools.encoder.characterCount", { count: urlInput.length })}
                <span className="px-1.5">·</span>
                {t("tools.encoder.byteCount", { count: inputBytes })}
              </span>
            </div>
          </div>

          <Textarea
            aria-label={t("tools.encoder.input")}
            placeholder={t("tools.encoder.urlPlaceholder")}
            value={urlInput}
            onValueChange={setUrlInput}
            className="min-h-0 flex-1"
            classNames={{
              inputWrapper: "min-h-0 flex-1 rounded-none border-0 bg-background p-4 focus-within:border-transparent focus-within:ring-0",
              input: "min-h-0 resize-none overflow-auto font-mono text-[13px] leading-6",
            }}
          />
        </section>

        <div className="relative flex items-center justify-center border-y border-default-200 bg-default-50/60 md:border-x md:border-y-0">
          <Button
            isIconOnly
            size="sm"
            variant="bordered"
            radius="full"
            className="h-9 w-9 min-w-9 border-default-200 bg-background text-default-500 shadow-sm hover:border-primary/40 hover:text-primary dark:hover:border-blue-300/50 dark:hover:text-blue-300"
            onPress={swapUrl}
            title={t("tools.encoder.swap")}
            aria-label={t("tools.encoder.swap")}
          >
            <ArrowDownUp className="h-4 w-4 md:hidden" />
            <ArrowLeftRight className="hidden h-4 w-4 md:block" />
          </Button>
        </div>

        <section className="flex min-h-0 min-w-0 flex-col" aria-labelledby="url-output-heading">
          <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-default-200 px-4">
            <div className="flex min-w-0 items-baseline gap-3">
              <h2 id="url-output-heading" className="shrink-0 text-sm font-semibold text-foreground">
                {t("tools.encoder.output")}
              </h2>
              <span className="truncate text-[11px] text-default-400">
                {t("tools.encoder.characterCount", { count: urlOutput.length })}
                <span className="px-1.5">·</span>
                {t("tools.encoder.byteCount", { count: outputBytes })}
              </span>
            </div>
            {transformError && (
              <span className="max-w-[45%] truncate text-[11px] text-danger" title={transformError}>
                {transformError}
              </span>
            )}
            <Button
              size="sm"
              variant="light"
              color="primary"
              className="h-8 min-w-0 px-2.5 text-primary hover:bg-primary/10 dark:text-blue-300 dark:hover:bg-blue-400/15"
              onPress={() => copyToClipboard(urlOutput)}
              isDisabled={!urlOutput}
              startContent={<Copy className="h-4 w-4" />}
            >
              {t("tools.encoder.copy")}
            </Button>
          </div>

          <Textarea
            aria-label={t("tools.encoder.output")}
            readOnly
            value={urlOutput}
            className="min-h-0 flex-1"
            classNames={{
              inputWrapper: "min-h-0 flex-1 rounded-none border-0 bg-background p-4 focus-within:border-transparent focus-within:ring-0",
              input: "min-h-0 resize-none overflow-auto font-mono text-[13px] leading-6",
            }}
          />
        </section>
      </div>
    </div>
  )
}
