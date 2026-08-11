import type { ReactNode } from "react"
import { ArrowDown, ArrowRight, Copy, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button, Textarea } from "../../components/ui/base-ui"

interface HashWorkbenchProps {
  id: string
  input: string
  onInputChange: (value: string) => void
  output: string
  onClear: () => void
  actions: ReactNode
  toolbarContent?: ReactNode
  configContent?: ReactNode
  inputPlaceholder?: string
  outputPlaceholder?: string
}

function byteLength(value: string) {
  return new TextEncoder().encode(value).length
}

export function HashWorkbench({
  id,
  input,
  onInputChange,
  output,
  onClear,
  actions,
  toolbarContent,
  configContent,
  inputPlaceholder,
  outputPlaceholder,
}: HashWorkbenchProps) {
  const { t } = useTranslation()

  const copyOutput = () => {
    if (output) navigator.clipboard.writeText(output)
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <div className="flex min-h-[46px] shrink-0 flex-wrap items-center gap-2 rounded-xl border border-default-200 bg-default-50/70 p-1.5">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {toolbarContent}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {actions}
          <Button
            size="sm"
            variant="light"
            className="h-8 text-default-500 hover:bg-danger/10 hover:text-danger"
            onPress={onClear}
            startContent={<Trash2 className="h-4 w-4" />}
          >
            {t("tools.hash.clearAll")}
          </Button>
        </div>
      </div>

      {configContent && (
        <div className="shrink-0 rounded-xl border border-default-200 bg-default-50/50 p-2.5">
          {configContent}
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_40px_minmax(0,1fr)] overflow-hidden rounded-xl border border-default-200 bg-background md:grid-cols-[minmax(0,1fr)_48px_minmax(0,1fr)] md:grid-rows-1">
        <section className="flex min-h-0 min-w-0 flex-col" aria-labelledby={`${id}-input-heading`}>
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-default-200 px-4">
            <div className="flex min-w-0 items-baseline gap-3">
              <h2 id={`${id}-input-heading`} className="shrink-0 text-sm font-semibold text-foreground">
                {t("tools.hash.inputLabel")}
              </h2>
              <span className="truncate text-[11px] text-default-400">
                {input.length} chars · {byteLength(input)} bytes
              </span>
            </div>
          </div>
          <Textarea
            aria-label={t("tools.hash.inputLabel")}
            placeholder={inputPlaceholder ?? t("tools.hash.inputPlaceholder")}
            value={input}
            onValueChange={onInputChange}
            className="min-h-0 flex-1"
            classNames={{
              inputWrapper: "min-h-0 flex-1 rounded-none border-0 bg-transparent p-4 focus-within:border-transparent focus-within:ring-0",
              input: "min-h-0 resize-none overflow-auto font-mono text-[13px] leading-6",
            }}
          />
        </section>

        <div className="flex items-center justify-center border-y border-default-200 bg-default-50/60 md:border-x md:border-y-0">
          <ArrowDown className="h-4 w-4 text-default-400 md:hidden" />
          <ArrowRight className="hidden h-4 w-4 text-default-400 md:block" />
        </div>

        <section className="flex min-h-0 min-w-0 flex-col" aria-labelledby={`${id}-output-heading`}>
          <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-default-200 px-4">
            <div className="flex min-w-0 items-baseline gap-3">
              <h2 id={`${id}-output-heading`} className="shrink-0 text-sm font-semibold text-foreground">
                {t("tools.hash.outputLabel")}
              </h2>
              <span className="truncate text-[11px] text-default-400">
                {output.length} chars · {byteLength(output)} bytes
              </span>
            </div>
            <Button
              size="sm"
              variant="light"
              color="primary"
              className="h-8 min-w-0 px-2.5"
              onPress={copyOutput}
              isDisabled={!output}
              startContent={<Copy className="h-4 w-4" />}
            >
              {t("tools.hash.copy")}
            </Button>
          </div>
          <Textarea
            aria-label={t("tools.hash.outputLabel")}
            isReadOnly
            placeholder={outputPlaceholder}
            value={output}
            className="min-h-0 flex-1"
            classNames={{
              inputWrapper: "min-h-0 flex-1 rounded-none border-0 bg-default-50/40 p-4 focus-within:border-transparent focus-within:ring-0",
              input: "min-h-0 resize-none overflow-auto font-mono text-[13px] leading-6",
            }}
          />
        </section>
      </div>
    </div>
  )
}
