import type { ReactNode } from "react"
import { ArrowDownUp, ArrowLeft, ArrowLeftRight, ArrowRight, BookOpen, Copy, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "../../components/ui/base-ui"
import CodeEditor, { type CodeEditorLanguage } from "../../components/CodeEditor"

interface ConverterPanel {
  id: string
  label: string
  language: CodeEditorLanguage
  value: string
  onChange: (value: string) => void
  onClear: () => void
  onCopy?: () => void
  jsonDiagnostics?: boolean
}

interface ConverterWorkbenchProps {
  left: ConverterPanel
  right: ConverterPanel
  onLeftToRight: () => void
  onRightToLeft: () => void
  leftToRightLabel: string
  rightToLeftLabel: string
  onExample: () => void
  onClearAll: () => void
  toolbarStart?: ReactNode
}

function stats(value: string) {
  return { lines: value ? value.split(/\r\n|\r|\n/).length : 0, characters: value.length }
}

function EditorPanel({ panel }: { panel: ConverterPanel }) {
  const { t } = useTranslation()
  const valueStats = stats(panel.value)

  const copy = () => {
    if (!panel.value) return
    if (panel.onCopy) panel.onCopy()
    else navigator.clipboard.writeText(panel.value)
  }

  return (
    <section className="flex min-h-0 min-w-0 flex-col" aria-labelledby={`${panel.id}-heading`}>
      <div className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-default-200 px-3.5">
        <div className="flex min-w-0 items-baseline gap-3">
          <h2 id={`${panel.id}-heading`} className="shrink-0 text-sm font-semibold text-foreground">{panel.label}</h2>
          <span className="truncate text-[11px] text-default-400">
            {valueStats.lines} {t("tools.formatter.lines")} · {valueStats.characters} {t("tools.formatter.characters")}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button isIconOnly size="sm" variant="light" className="h-8 w-8 min-w-8 text-default-500" onPress={copy} isDisabled={!panel.value} title={t("tools.converter.copy")} aria-label={`${t("tools.converter.copy")} ${panel.label}`}>
            <Copy className="h-4 w-4" />
          </Button>
          <Button isIconOnly size="sm" variant="light" className="h-8 w-8 min-w-8 text-default-500 hover:bg-danger/10 hover:text-danger" onPress={panel.onClear} isDisabled={!panel.value} title={t("tools.converter.clear")} aria-label={`${t("tools.converter.clear")} ${panel.label}`}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <CodeEditor
          language={panel.language}
          value={panel.value}
          onChange={panel.onChange}
          fontSize={13}
          contentPadding={16}
          jsonDiagnostics={panel.jsonDiagnostics}
          ariaLabel={panel.label}
        />
      </div>
    </section>
  )
}

export function ConverterWorkbench({
  left,
  right,
  onLeftToRight,
  onRightToLeft,
  leftToRightLabel,
  rightToLeftLabel,
  onExample,
  onClearAll,
  toolbarStart,
}: ConverterWorkbenchProps) {
  const { t } = useTranslation()

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <div className="flex min-h-[46px] shrink-0 flex-wrap items-center gap-2 rounded-xl border border-default-200 bg-default-50/70 p-1.5">
        {toolbarStart}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          <Button size="sm" color="primary" className="h-8" onPress={onLeftToRight} isDisabled={!left.value} endContent={<ArrowRight className="h-4 w-4" />}>
            {leftToRightLabel}
          </Button>
          <Button size="sm" variant="flat" className="h-8" onPress={onRightToLeft} isDisabled={!right.value} startContent={<ArrowLeft className="h-4 w-4" />}>
            {rightToLeftLabel}
          </Button>
          <Button size="sm" variant="light" className="h-8" onPress={onExample} startContent={<BookOpen className="h-4 w-4" />}>
            {t("tools.formatter.example")}
          </Button>
        </div>
        <Button size="sm" variant="light" className="h-8 shrink-0 text-default-500 hover:bg-danger/10 hover:text-danger" onPress={onClearAll} isDisabled={!left.value && !right.value} startContent={<Trash2 className="h-4 w-4" />}>
          {t("tools.converter.clearAll")}
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_40px_minmax(0,1fr)] overflow-hidden rounded-xl border border-default-200 bg-background md:grid-cols-[minmax(0,1fr)_48px_minmax(0,1fr)] md:grid-rows-1">
        <EditorPanel panel={left} />
        <div className="flex items-center justify-center border-y border-default-200 bg-default-50/60 md:border-x md:border-y-0">
          <ArrowDownUp className="h-4 w-4 text-default-400 md:hidden" />
          <ArrowLeftRight className="hidden h-4 w-4 text-default-400 md:block" />
        </div>
        <EditorPanel panel={right} />
      </div>
    </div>
  )
}
