import type { ReactNode } from "react"
import { AlertCircle, BookOpen, CheckCircle2, Copy, Maximize2, Minimize2, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "../../components/ui/base-ui"
import CodeEditor, { type CodeEditorLanguage } from "../../components/CodeEditor"

interface FormatterWorkbenchProps {
  id: string
  label: string
  language: CodeEditorLanguage
  code: string
  onCodeChange: (value: string) => void
  onFormat: () => void
  onMinify: () => void
  onValidate?: () => void
  onExample: () => void
  onClear: () => void
  status: boolean | null
  errorMessage: string
  validMessage: string
  invalidMessage: string
  toolbarStart?: ReactNode
  secondaryContent?: ReactNode
  secondaryLabel?: string
  secondaryActions?: ReactNode
  jsonDiagnostics?: boolean
}

function textStats(value: string) {
  return {
    lines: value ? value.split(/\r\n|\r|\n/).length : 0,
    characters: value.length,
  }
}

export function FormatterWorkbench({
  id,
  label,
  language,
  code,
  onCodeChange,
  onFormat,
  onMinify,
  onValidate,
  onExample,
  onClear,
  status,
  errorMessage,
  validMessage,
  invalidMessage,
  toolbarStart,
  secondaryContent,
  secondaryLabel,
  secondaryActions,
  jsonDiagnostics,
}: FormatterWorkbenchProps) {
  const { t } = useTranslation()
  const stats = textStats(code)

  const copyCode = () => {
    if (code) navigator.clipboard.writeText(code)
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <div className="flex min-h-[46px] shrink-0 flex-wrap items-center gap-2 rounded-xl border border-default-200 bg-default-50/70 p-1.5">
        {toolbarStart && (
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {toolbarStart}
            <div className="hidden h-5 w-px bg-default-200 sm:block" />
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          <Button size="sm" color="primary" className="h-8" onPress={onFormat} isDisabled={!code} startContent={<Maximize2 className="h-4 w-4" />}>
            {t("tools.formatter.format")}
          </Button>
          <Button size="sm" variant="flat" className="h-8" onPress={onMinify} isDisabled={!code} startContent={<Minimize2 className="h-4 w-4" />}>
            {t("tools.formatter.minify")}
          </Button>
          {onValidate && (
            <Button size="sm" variant="light" className="h-8" onPress={onValidate} isDisabled={!code} startContent={<CheckCircle2 className="h-4 w-4" />}>
              {t("tools.formatter.validate")}
            </Button>
          )}
          <Button size="sm" variant="light" className="h-8" onPress={onExample} startContent={<BookOpen className="h-4 w-4" />}>
            {t("tools.formatter.example")}
          </Button>
        </div>

        <Button
          size="sm"
          variant="light"
          className="h-8 shrink-0 text-default-500 hover:bg-danger/10 hover:text-danger"
          onPress={onClear}
          isDisabled={!code}
          startContent={<Trash2 className="h-4 w-4" />}
        >
          {t("tools.encoder.clearAll")}
        </Button>
      </div>

      <div className={`grid min-h-0 flex-1 overflow-hidden rounded-xl border border-default-200 bg-background ${secondaryContent ? "grid-rows-2 md:grid-cols-2 md:grid-rows-1" : "grid-cols-1"}`}>
        <section className="flex min-h-0 min-w-0 flex-col" aria-labelledby={`${id}-editor-heading`}>
          <div className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-default-200 px-3.5">
            <div className="flex min-w-0 items-baseline gap-3">
              <h2 id={`${id}-editor-heading`} className="shrink-0 text-sm font-semibold text-foreground">
                {label}
              </h2>
              <span className="truncate text-[11px] text-default-400">
                {stats.lines} {t("tools.formatter.lines")} · {stats.characters} {t("tools.formatter.characters")}
              </span>
            </div>

            <div className="flex min-w-0 items-center gap-2">
              {status !== null && (
                <div
                  className={`hidden min-w-0 items-center gap-1.5 text-[11px] sm:flex ${status ? "text-success" : "text-danger"}`}
                  title={status ? validMessage : `${invalidMessage}: ${errorMessage}`}
                >
                  {status ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
                  <span className="max-w-72 truncate">
                    {status ? validMessage : `${invalidMessage}: ${errorMessage}`}
                  </span>
                </div>
              )}
              <Button size="sm" variant="light" color="primary" className="h-8 min-w-0 px-2.5" onPress={copyCode} isDisabled={!code} startContent={<Copy className="h-4 w-4" />}>
                {t("tools.encoder.copy")}
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1">
            <CodeEditor
              language={language}
              value={code}
              onChange={onCodeChange}
              fontSize={13}
              contentPadding={16}
              jsonDiagnostics={jsonDiagnostics}
              ariaLabel={label}
            />
          </div>
        </section>

        {secondaryContent && (
          <section className="flex min-h-0 min-w-0 flex-col border-t border-default-200 md:border-l md:border-t-0" aria-label={secondaryLabel}>
            <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-default-200 px-3.5">
              <h2 className="text-sm font-semibold text-foreground">{secondaryLabel}</h2>
              <div className="flex items-center gap-1">{secondaryActions}</div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-default-50/35 p-4 text-left">
              {secondaryContent}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
