import { useEffect, useRef, useState, type ReactNode } from "react"
import { open, save } from "@tauri-apps/plugin-dialog"
import { exists, stat } from "@tauri-apps/plugin-fs"
import { getCurrentWebview } from "@tauri-apps/api/webview"
import { CheckCircle2, FileUp, FolderOutput, LoaderCircle, Play, RotateCcw, XCircle } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button, Card, CardBody, CardHeader, Input } from "./ui/base-ui"
import { fileNameFromPath, formatFileSize, replaceFileName, type FileProgress } from "../lib/fileOperations"

interface FileFilter {
  name: string
  extensions: string[]
}

export interface FileWorkbenchRunContext {
  inputPath: string
  outputPath?: string
  onProgress: (progress: FileProgress) => void
}

export interface FileWorkbenchResult {
  message: string
  outputPath?: string
}

interface FileWorkbenchProps {
  title: string
  description?: string
  operationLabel: string
  inputFilters?: FileFilter[]
  outputFilters?: FileFilter[]
  requiresOutput?: boolean
  defaultOutputName?: (inputName: string) => string
  canRun?: boolean
  validationMessage?: string
  controls?: ReactNode
  resultContent?: ReactNode
  onInputPathChange?: (path: string) => void
  onRun: (context: FileWorkbenchRunContext) => Promise<FileWorkbenchResult>
}

type Status = { type: "success" | "error" | "info"; message: string } | null

export function FileWorkbench({
  title,
  description,
  operationLabel,
  inputFilters,
  outputFilters,
  requiresOutput = false,
  defaultOutputName,
  canRun = true,
  validationMessage,
  controls,
  resultContent,
  onInputPathChange,
  onRun,
}: FileWorkbenchProps) {
  const { t } = useTranslation()
  const [inputPath, setInputPath] = useState("")
  const [inputSize, setInputSize] = useState<number | null>(null)
  const [outputPath, setOutputPath] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState<FileProgress | null>(null)
  const [status, setStatus] = useState<Status>(null)
  const mountedRef = useRef(true)

  const selectPath = async (path: string) => {
    if (!path) return
    try {
      const metadata = await stat(path)
      if (!metadata.isFile) throw new Error(t("tools.fileWorkbench.notAFile"))
      setInputPath(path)
      setInputSize(metadata.size)
      setProgress(null)
      setStatus({ type: "info", message: t("tools.fileWorkbench.fileSelected") })
      onInputPathChange?.(path)
      if (requiresOutput && defaultOutputName) {
        setOutputPath(replaceFileName(path, defaultOutputName(fileNameFromPath(path))))
      }
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : String(error) })
    }
  }

  useEffect(() => {
    mountedRef.current = true
    let unlisten: (() => void) | undefined
    let disposed = false
    getCurrentWebview().onDragDropEvent((event) => {
      if (!mountedRef.current || isRunning) return
      if (event.payload.type === "enter" || event.payload.type === "over") {
        setIsDragging(true)
      } else if (event.payload.type === "leave") {
        setIsDragging(false)
      } else if (event.payload.type === "drop") {
        setIsDragging(false)
        const path = event.payload.paths[0]
        if (path) void selectPath(path)
      }
    }).then((dispose) => {
      if (disposed) dispose()
      else unlisten = dispose
    }).catch(() => {})
    return () => {
      disposed = true
      mountedRef.current = false
      unlisten?.()
    }
  }, [isRunning])

  const chooseInput = async () => {
    const selected = await open({ multiple: false, directory: false, filters: inputFilters })
    if (typeof selected === "string") await selectPath(selected)
  }

  const chooseOutput = async () => {
    const selected = await save({ defaultPath: outputPath || undefined, filters: outputFilters })
    if (typeof selected === "string") setOutputPath(selected)
  }

  const run = async () => {
    if (!inputPath) {
      setStatus({ type: "error", message: t("tools.fileWorkbench.selectFileFirst") })
      return
    }
    if (requiresOutput && !outputPath) {
      setStatus({ type: "error", message: t("tools.fileWorkbench.selectOutputFirst") })
      return
    }
    if (!canRun) {
      setStatus({ type: "error", message: validationMessage || t("common.error") })
      return
    }

    let resolvedOutputPath = outputPath
    if (requiresOutput && resolvedOutputPath && await exists(resolvedOutputPath)) {
      const confirmed = await save({ defaultPath: resolvedOutputPath, filters: outputFilters })
      if (typeof confirmed !== "string") return
      resolvedOutputPath = confirmed
      setOutputPath(confirmed)
    }

    setIsRunning(true)
    setProgress({ processedBytes: 0, totalBytes: inputSize ?? 0, percent: 0 })
    setStatus({ type: "info", message: t("tools.fileWorkbench.processing") })
    try {
      const result = await onRun({ inputPath, outputPath: resolvedOutputPath || undefined, onProgress: setProgress })
      setProgress((current) => ({
        processedBytes: current?.totalBytes || inputSize || 0,
        totalBytes: current?.totalBytes || inputSize || 0,
        percent: 100,
      }))
      setStatus({ type: "success", message: result.message })
      if (result.outputPath) setOutputPath(result.outputPath)
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : String(error) })
    } finally {
      setIsRunning(false)
    }
  }

  const clear = () => {
    setInputPath("")
    setInputSize(null)
    setOutputPath("")
    setProgress(null)
    setStatus(null)
    onInputPathChange?.("")
  }

  return (
    <Card className="border border-default-200 bg-background shadow-none">
      <CardHeader className="flex items-start justify-between gap-3 border-b border-default-200 px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && <p className="mt-1 text-xs leading-relaxed text-default-500">{description}</p>}
        </div>
        <Button isIconOnly size="sm" variant="light" onPress={clear} isDisabled={isRunning || !inputPath} title={t("common.clear")}>
          <RotateCcw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardBody className="gap-4 p-4">
        <button
          type="button"
          className={`flex min-h-36 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-5 py-6 text-center transition-colors ${isDragging ? "border-primary bg-primary/10" : "border-default-300 bg-default-50/60 hover:border-primary/60 hover:bg-primary/5"}`}
          onClick={() => void chooseInput()}
          disabled={isRunning}
        >
          <FileUp className={`mb-3 h-8 w-8 ${isDragging ? "text-primary" : "text-default-400"}`} />
          <span className="text-sm font-medium">{t("tools.fileWorkbench.dropOrChoose")}</span>
          <span className="mt-1 max-w-full truncate text-xs text-default-500">
            {inputPath ? fileNameFromPath(inputPath) : t("tools.fileWorkbench.anySize")}
          </span>
          {inputPath && inputSize !== null && <span className="mt-1 text-[11px] text-default-400">{formatFileSize(inputSize)}</span>}
        </button>

        {inputPath && (
          <Input
            label={t("tools.fileWorkbench.inputPath")}
            value={inputPath}
            isReadOnly
            classNames={{ input: "font-mono text-xs" }}
          />
        )}

        {requiresOutput && (
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <Input
              label={t("tools.fileWorkbench.outputPath")}
              value={outputPath}
              isReadOnly
              classNames={{ input: "font-mono text-xs" }}
            />
            <Button variant="flat" onPress={() => void chooseOutput()} isDisabled={isRunning || !inputPath} startContent={<FolderOutput className="h-4 w-4" />}>
              {t("tools.fileWorkbench.chooseOutput")}
            </Button>
          </div>
        )}

        {controls}

        {progress && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] text-default-500">
              <span>{formatFileSize(progress.processedBytes)} / {formatFileSize(progress.totalBytes)}</span>
              <span>{Math.max(0, Math.min(100, progress.percent)).toFixed(1)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-default-200">
              <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${Math.max(0, Math.min(100, progress.percent))}%` }} />
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            color="primary"
            onPress={() => void run()}
            isDisabled={!inputPath || !canRun || isRunning}
            startContent={isRunning ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          >
            {isRunning ? t("tools.fileWorkbench.processing") : operationLabel}
          </Button>
          {!canRun && validationMessage && <span className="text-xs text-danger">{validationMessage}</span>}
        </div>

        {status && (
          <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${status.type === "success" ? "bg-success/10 text-success" : status.type === "error" ? "bg-danger/10 text-danger" : "bg-default-100 text-default-700"}`}>
            {status.type === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : status.type === "error" ? <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> : null}
            <span className="min-w-0 break-all">{status.message}</span>
          </div>
        )}

        {resultContent}
      </CardBody>
    </Card>
  )
}
