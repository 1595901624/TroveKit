import { useState } from "react"
import { Copy, Hash } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button, Input, Select, SelectItem } from "../../components/ui/base-ui"
import { FileWorkbench } from "../../components/FileWorkbench"
import { fileNameFromPath, formatFileSize, runFileCommand, type FileHashResult } from "../../lib/fileOperations"
import { useLogActions } from "../../contexts/LogContext"

type FileHashAlgorithm = "MD5" | "SHA-1" | "SHA-256" | "SHA-512" | "HMAC-SHA256"

export function FileHashTab() {
  const { t } = useTranslation()
  const { addLog } = useLogActions()
  const [algorithm, setAlgorithm] = useState<FileHashAlgorithm>("SHA-256")
  const [hmacKey, setHmacKey] = useState("")
  const [result, setResult] = useState<FileHashResult | null>(null)
  const needsKey = algorithm === "HMAC-SHA256"

  return (
    <div className="h-full overflow-y-auto pb-2">
      <FileWorkbench
        title={t("tools.fileHash.title")}
        description={t("tools.fileHash.description")}
        operationLabel={t("tools.fileHash.calculate")}
        canRun={!needsKey || hmacKey.length > 0}
        validationMessage={needsKey && !hmacKey ? t("tools.fileHash.keyRequired") : undefined}
        onInputPathChange={() => setResult(null)}
        controls={(
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label={t("tools.hash.algorithm")}
              selectedKeys={[algorithm]}
              onChange={(event) => { setAlgorithm(event.target.value as FileHashAlgorithm); setResult(null) }}
            >
              <SelectItem key="MD5">MD5</SelectItem>
              <SelectItem key="SHA-1">SHA-1</SelectItem>
              <SelectItem key="SHA-256">SHA-256</SelectItem>
              <SelectItem key="SHA-512">SHA-512</SelectItem>
              <SelectItem key="HMAC-SHA256">HMAC-SHA256</SelectItem>
            </Select>
            {needsKey && (
              <Input
                label={t("tools.hash.key")}
                type="password"
                value={hmacKey}
                onValueChange={setHmacKey}
                autoComplete="off"
                placeholder={t("tools.fileHash.keyPlaceholder")}
              />
            )}
          </div>
        )}
        onRun={async ({ inputPath, onProgress }) => {
          setResult(null)
          const next = await runFileCommand<FileHashResult>("hash_file", {
            inputPath,
            algorithm,
            key: needsKey ? hmacKey : null,
          }, onProgress)
          setResult(next)
          addLog({
            method: `${next.algorithm} File Digest`,
            input: `${fileNameFromPath(inputPath)} (${formatFileSize(next.processedBytes)})`,
            output: next.digest,
            cryptoParams: { algorithm: next.algorithm },
          }, "success")
          return { message: t("tools.fileHash.completed", { algorithm: next.algorithm }) }
        }}
        resultContent={result && (
          <div className="rounded-xl border border-default-200 bg-default-50 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-medium text-default-600">
                <Hash className="h-4 w-4" /> {result.algorithm}
              </div>
              <Button isIconOnly size="sm" variant="light" onPress={() => void navigator.clipboard.writeText(result.digest)} title={t("common.copy")}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <code className="block break-all font-mono text-sm text-foreground">{result.digest}</code>
          </div>
        )}
      />
    </div>
  )
}
