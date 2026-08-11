import type { ReactNode } from "react"
import { ArrowDown, ArrowDownUp, ArrowLeftRight, ArrowRight, Copy, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button, ButtonGroup, Textarea } from "../../components/ui/base-ui"

interface HashOperationSwitchProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: Array<{ value: T; label: string }>
  ariaLabel: string
}

export function HashOperationSwitch<T extends string>({ value, onChange, options, ariaLabel }: HashOperationSwitchProps<T>) {
  return (
    <ButtonGroup aria-label={ariaLabel} className="rounded-lg bg-default-100 p-0.5">
      {options.map((option) => {
        const selected = option.value === value
        return (
          <Button
            key={option.value}
            size="sm"
            variant={selected ? "flat" : "light"}
            color={selected ? "primary" : "default"}
            className={selected
              ? "h-8 min-w-[72px] bg-primary/10 text-primary dark:bg-blue-400/15 dark:text-blue-300"
              : "h-8 min-w-[72px] text-default-600"}
            aria-pressed={selected}
            onPress={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        )
      })}
    </ButtonGroup>
  )
}

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
  inputLabel?: string
  outputLabel?: string
  onSwap?: () => void
  onCopy?: () => void
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
  inputLabel,
  outputLabel,
  onSwap,
  onCopy,
}: HashWorkbenchProps) {
  const { t } = useTranslation()

  const copyOutput = () => {
    if (!output) return
    if (onCopy) onCopy()
    else navigator.clipboard.writeText(output)
  }

  const resolvedInputLabel = inputLabel ?? t("tools.hash.inputLabel")
  const resolvedOutputLabel = outputLabel ?? t("tools.hash.outputLabel")

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
                {resolvedInputLabel}
              </h2>
              <span className="truncate text-[11px] text-default-400">
                {input.length} chars · {byteLength(input)} bytes
              </span>
            </div>
          </div>
          <Textarea
            aria-label={resolvedInputLabel}
            placeholder={inputPlaceholder ?? t("tools.hash.inputPlaceholder")}
            value={input}
            onValueChange={onInputChange}
            className="min-h-0 flex-1"
            classNames={{
              inputWrapper: "min-h-0 flex-1 rounded-none border-0 bg-background p-4 focus-within:border-transparent focus-within:ring-0",
              input: "min-h-0 resize-none overflow-auto font-mono text-[13px] leading-6",
            }}
          />
        </section>

        <div className="flex items-center justify-center border-y border-default-200 bg-default-50/60 md:border-x md:border-y-0">
          {onSwap ? (
            <Button isIconOnly size="sm" variant="bordered" radius="full" className="h-9 w-9 min-w-9 border-default-200 bg-background text-default-500" onPress={onSwap} aria-label={t("tools.encoder.swap")} title={t("tools.encoder.swap")}>
              <ArrowDownUp className="h-4 w-4 md:hidden" />
              <ArrowLeftRight className="hidden h-4 w-4 md:block" />
            </Button>
          ) : (
            <>
              <ArrowDown className="h-4 w-4 text-default-400 md:hidden" />
              <ArrowRight className="hidden h-4 w-4 text-default-400 md:block" />
            </>
          )}
        </div>

        <section className="flex min-h-0 min-w-0 flex-col" aria-labelledby={`${id}-output-heading`}>
          <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-default-200 px-4">
            <div className="flex min-w-0 items-baseline gap-3">
              <h2 id={`${id}-output-heading`} className="shrink-0 text-sm font-semibold text-foreground">
                {resolvedOutputLabel}
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
            aria-label={resolvedOutputLabel}
            isReadOnly
            placeholder={outputPlaceholder}
            value={output}
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
