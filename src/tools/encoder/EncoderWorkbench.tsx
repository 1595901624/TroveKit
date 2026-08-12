import type { ReactNode } from "react"
import { ArrowDownUp, ArrowLeftRight, Copy, Play, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button, ButtonGroup, Select, SelectItem, Switch, Textarea } from "../../components/ui/base-ui"

export interface WorkbenchMode<T extends string> {
  key: T
  label: string
}

interface EncoderWorkbenchProps<T extends string> {
  id: string
  modes: WorkbenchMode<T>[]
  activeMode: T
  onModeChange: (mode: T) => void
  autoTransform: boolean
  onAutoTransformChange: (selected: boolean) => void
  onTransform: () => void
  onSwap: () => void
  onClear: () => void
  input: string
  onInputChange: (value: string) => void
  inputPlaceholder: string
  output: string
  error?: string
  toolbarContent?: ReactNode
}

function getByteLength(value: string) {
  return new TextEncoder().encode(value).length
}

export function EncoderWorkbench<T extends string>({
  id,
  modes,
  activeMode,
  onModeChange,
  autoTransform,
  onAutoTransformChange,
  onTransform,
  onSwap,
  onClear,
  input,
  onInputChange,
  inputPlaceholder,
  output,
  error,
  toolbarContent,
}: EncoderWorkbenchProps<T>) {
  const { t } = useTranslation()
  const activeModeLabel = modes.find((mode) => mode.key === activeMode)?.label ?? ""
  const inputBytes = getByteLength(input)
  const outputBytes = getByteLength(output)

  const copyToClipboard = () => {
    if (output) navigator.clipboard.writeText(output)
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-default-200 bg-default-50/70 p-1.5">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <Select
            aria-label={t("tools.encoder.transformMode")}
            className="w-36 sm:hidden"
            classNames={{ trigger: "h-8 bg-background px-2.5 text-xs" }}
            selectedKeys={[activeMode]}
            onChange={(event) => onModeChange(event.target.value as T)}
          >
            {modes.map((mode) => <SelectItem key={mode.key}>{mode.label}</SelectItem>)}
          </Select>

          <ButtonGroup
            aria-label={t("tools.encoder.transformMode")}
            className="hidden rounded-lg bg-default-100 p-0.5 sm:inline-flex"
          >
            {modes.map((mode) => {
              const selected = mode.key === activeMode
              return (
                <Button
                  key={mode.key}
                  size="sm"
                  variant={selected ? "flat" : "light"}
                  color={selected ? "primary" : "default"}
                  className={selected
                    ? "h-8 min-w-[72px] bg-primary/10 text-primary hover:bg-primary/15 dark:bg-primary/15 dark:hover:bg-primary/20"
                    : "h-8 min-w-[72px] text-default-600"}
                  aria-pressed={selected}
                  onPress={() => onModeChange(mode.key)}
                >
                  {mode.label}
                </Button>
              )
            })}
          </ButtonGroup>

          {toolbarContent}

          <Switch
            size="sm"
            isSelected={autoTransform}
            onValueChange={onAutoTransformChange}
            className="gap-1.5 text-xs"
          >
            {t("tools.encoder.autoTransform")}
          </Switch>

          <Button
            size="sm"
            color="primary"
            variant="solid"
            className="h-8 min-w-[84px]"
            onPress={onTransform}
            isDisabled={!input}
            startContent={<Play className="h-3.5 w-3.5" />}
          >
            {activeModeLabel}
          </Button>
        </div>

        <Button
          size="sm"
          variant="light"
          className="h-8 text-default-500 hover:bg-danger/10 hover:text-danger"
          onPress={onClear}
          startContent={<Trash2 className="h-4 w-4" />}
        >
          {t("tools.encoder.clearAll")}
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_40px_minmax(0,1fr)] overflow-hidden rounded-xl border border-default-200 bg-background md:grid-cols-[minmax(0,1fr)_48px_minmax(0,1fr)] md:grid-rows-1">
        <section className="flex min-h-0 min-w-0 flex-col" aria-labelledby={`${id}-input-heading`}>
          <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-default-200 px-4">
            <div className="flex min-w-0 items-baseline gap-3">
              <h2 id={`${id}-input-heading`} className="shrink-0 text-sm font-semibold text-foreground">
                {t("tools.encoder.input")}
              </h2>
              <span className="truncate text-[11px] text-default-400">
                {t("tools.encoder.characterCount", { count: input.length })}
                <span className="px-1.5">·</span>
                {t("tools.encoder.byteCount", { count: inputBytes })}
              </span>
            </div>
          </div>

          <Textarea
            aria-label={t("tools.encoder.input")}
            placeholder={inputPlaceholder}
            value={input}
            onValueChange={onInputChange}
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
            className="h-9 w-9 min-w-9 border-default-200 bg-background text-default-500 shadow-sm hover:border-primary/50 hover:text-primary"
            onPress={onSwap}
            title={t("tools.encoder.swap")}
            aria-label={t("tools.encoder.swap")}
          >
            <ArrowDownUp className="h-4 w-4 md:hidden" />
            <ArrowLeftRight className="hidden h-4 w-4 md:block" />
          </Button>
        </div>

        <section className="flex min-h-0 min-w-0 flex-col" aria-labelledby={`${id}-output-heading`}>
          <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-default-200 px-4">
            <div className="flex min-w-0 items-baseline gap-3">
              <h2 id={`${id}-output-heading`} className="shrink-0 text-sm font-semibold text-foreground">
                {t("tools.encoder.output")}
              </h2>
              <span className="truncate text-[11px] text-default-400">
                {t("tools.encoder.characterCount", { count: output.length })}
                <span className="px-1.5">·</span>
                {t("tools.encoder.byteCount", { count: outputBytes })}
              </span>
            </div>
            {error && <span className="max-w-[45%] truncate text-[11px] text-danger" title={error}>{error}</span>}
            <Button
              size="sm"
              variant="light"
              color="primary"
              className="h-8 min-w-0 px-2.5 text-primary hover:bg-primary/15"
              onPress={copyToClipboard}
              isDisabled={!output}
              startContent={<Copy className="h-4 w-4" />}
            >
              {t("tools.encoder.copy")}
            </Button>
          </div>

          <Textarea
            aria-label={t("tools.encoder.output")}
            readOnly
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
