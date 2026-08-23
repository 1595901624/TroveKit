import { useEffect, useState } from "react"
import { Copy, QrCode } from "lucide-react"
import jsQR from "jsqr"
import { readFile } from "@tauri-apps/plugin-fs"
import { useTranslation } from "react-i18next"
import { Button } from "../../components/ui/base-ui"
import { FileWorkbench } from "../../components/FileWorkbench"
import { fileNameFromPath } from "../../lib/fileOperations"
import { useLogActions } from "../../contexts/LogContext"

interface ScanResult {
  text: string
  previewUrl: string
  width: number
  height: number
}

function mimeFromPath(path: string) {
  const extension = path.split(".").pop()?.toLowerCase()
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg"
  if (extension === "webp") return "image/webp"
  if (extension === "bmp") return "image/bmp"
  return "image/png"
}

async function decodeImage(path: string) {
  const bytes = await readFile(path)
  const blob = new Blob([new Uint8Array(bytes)], { type: mimeFromPath(path) })
  const bitmap = await createImageBitmap(blob)
  try {
    const maxDimension = 4096
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext("2d", { willReadFrequently: true })
    if (!context) throw new Error("Canvas is not available")
    context.drawImage(bitmap, 0, 0, width, height)
    const image = context.getImageData(0, 0, width, height)
    const decoded = jsQR(image.data, width, height, { inversionAttempts: "attemptBoth" })
    if (!decoded?.data) throw new Error("QR code was not found in this image")
    return { text: decoded.data, previewUrl: URL.createObjectURL(blob), width: bitmap.width, height: bitmap.height }
  } finally {
    bitmap.close()
  }
}

export function QrScannerTab() {
  const { t } = useTranslation()
  const { addLog } = useLogActions()
  const [result, setResult] = useState<ScanResult | null>(null)

  useEffect(() => () => {
    if (result?.previewUrl) URL.revokeObjectURL(result.previewUrl)
  }, [result?.previewUrl])

  const clearResult = () => {
    setResult((current) => {
      if (current?.previewUrl) URL.revokeObjectURL(current.previewUrl)
      return null
    })
  }

  return (
    <div className="h-full overflow-y-auto pb-2">
      <FileWorkbench
        title={t("tools.qrScanner.title")}
        description={t("tools.qrScanner.description")}
        operationLabel={t("tools.qrScanner.scan")}
        inputFilters={[{ name: t("tools.qr.images"), extensions: ["png", "jpg", "jpeg", "webp", "bmp"] }]}
        onInputPathChange={clearResult}
        onRun={async ({ inputPath }) => {
          clearResult()
          let decoded: ScanResult
          try {
            decoded = await decodeImage(inputPath)
          } catch (error) {
            if (error instanceof Error && error.message === "QR code was not found in this image") {
              throw new Error(t("tools.qrScanner.notFound"))
            }
            throw error
          }
          setResult(decoded)
          addLog({ method: "QR Code Scan", input: fileNameFromPath(inputPath), output: decoded.text }, "success")
          return { message: t("tools.qrScanner.completed") }
        }}
        resultContent={result && (
          <div className="grid gap-4 rounded-xl border border-default-200 bg-default-50/60 p-4 md:grid-cols-[minmax(180px,280px)_minmax(0,1fr)]">
            <div className="overflow-hidden rounded-lg border border-default-200 bg-white p-2">
              <img src={result.previewUrl} alt={t("tools.qrScanner.previewAlt")} className="mx-auto max-h-64 w-auto max-w-full object-contain" />
              <div className="mt-2 text-center text-[10px] text-default-400">{result.width} × {result.height}</div>
            </div>
            <div className="min-w-0 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold"><QrCode className="h-4 w-4" />{t("tools.qrScanner.result")}</div>
              <pre className="max-h-64 min-h-28 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-default-200 bg-background p-3 font-mono text-sm">{result.text}</pre>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="flat" startContent={<Copy className="h-4 w-4" />} onPress={() => void navigator.clipboard.writeText(result.text)}>{t("common.copy")}</Button>
              </div>
            </div>
          </div>
        )}
      />
    </div>
  )
}
