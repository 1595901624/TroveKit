import React, { createContext, forwardRef, useContext, useMemo, useState } from "react"
import { Button as BaseButton } from "@base-ui/react/button"
import { Input as BaseInput } from "@base-ui/react/input"
import { Select as BaseSelect } from "@base-ui/react/select"
import { Tabs as BaseTabs } from "@base-ui/react/tabs"
import { Dialog as BaseDialog } from "@base-ui/react/dialog"
import { Menu as BaseMenu } from "@base-ui/react/menu"
import { Popover as BasePopover } from "@base-ui/react/popover"
import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip"
import { Toast as BaseToast } from "@base-ui/react/toast"
import { Switch as BaseSwitch } from "@base-ui/react/switch"
import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox"
import { Radio as BaseRadio } from "@base-ui/react/radio"
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group"
import { ScrollArea } from "@base-ui/react/scroll-area"
import { CalendarDateTime } from "@internationalized/date"
import { Check, ChevronDown, LoaderCircle, X } from "lucide-react"
import { twMerge } from "tailwind-merge"

type AnyProps = Record<string, any>
type Selection = Set<React.Key>
interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "color" | "onClick"> {
  color?: string; variant?: string; size?: string; radius?: string; isIconOnly?: boolean; isDisabled?: boolean; isLoading?: boolean
  startContent?: React.ReactNode; endContent?: React.ReactNode
  onPress?: React.MouseEventHandler<HTMLButtonElement>; onClick?: React.MouseEventHandler<HTMLButtonElement>
}
interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "color" | "onChange"> {
  label?: React.ReactNode; description?: React.ReactNode; errorMessage?: React.ReactNode; startContent?: React.ReactNode; endContent?: React.ReactNode
  classNames?: AnyProps; variant?: string; size?: string; color?: string; isDisabled?: boolean; isReadOnly?: boolean; isInvalid?: boolean; isClearable?: boolean
  onValueChange?: (value: string) => void; onChange?: React.ChangeEventHandler<HTMLInputElement>; onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>
}
interface TextareaProps extends AnyProps { onValueChange?: (value: string) => void; onChange?: React.ChangeEventHandler<HTMLTextAreaElement>; onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement> }
interface SelectProps extends AnyProps { onSelectionChange?: (keys: Selection) => void; onChange?: React.ChangeEventHandler<HTMLSelectElement> }
interface TabsProps extends AnyProps { onSelectionChange?: (key: React.Key) => void }
interface RadioGroupProps extends AnyProps { onValueChange?: (value: string) => void }
interface ToggleProps extends AnyProps { onValueChange?: (selected: boolean) => void }
interface DropdownMenuProps extends AnyProps { onSelectionChange?: (keys: Selection) => void }
interface ModalContentProps extends AnyProps { children?: React.ReactNode | ((onClose: () => void) => React.ReactNode) }
const cx = (...values: Array<string | undefined | false>) => twMerge(values.filter(Boolean).join(" "))

const colorClasses: Record<string, string> = {
  default: "bg-default-100 text-foreground hover:bg-default-200",
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
  success: "bg-success text-white hover:bg-success/90",
  warning: "bg-warning text-black hover:bg-warning/90",
  danger: "bg-danger text-white hover:bg-danger/90",
}

function buttonClasses({ color = "default", variant = "solid", size = "md", isIconOnly, radius }: AnyProps) {
  const variants: Record<string, string> = {
    solid: colorClasses[color],
    flat: cx(colorClasses[color], "bg-opacity-15 hover:bg-opacity-25", color === "default" && "bg-default-100"),
    bordered: "border border-default-300 bg-transparent hover:bg-default-100",
    light: "bg-transparent hover:bg-default-100",
    ghost: "border border-current bg-transparent hover:bg-default-100",
  }
  return cx(
    "inline-flex shrink-0 select-none items-center justify-center gap-2 font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-50",
    size === "sm" ? "h-8 min-w-8 px-3 text-xs" : size === "lg" ? "h-12 min-w-12 px-6 text-base" : "h-10 min-w-10 px-4 text-sm",
    isIconOnly && (size === "sm" ? "w-8 px-0" : size === "lg" ? "w-12 px-0" : "w-10 px-0"),
    radius === "full" ? "rounded-full" : radius === "none" ? "rounded-none" : "rounded-lg",
    variants[variant] ?? variants.solid,
  )
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { children, className, onPress, onClick, isDisabled, isLoading, startContent, endContent, ...props }, ref,
) {
  const { color, variant, size, isIconOnly, radius, ...native } = props
  return (
    <BaseButton
      {...native}
      ref={ref}
      disabled={isDisabled || isLoading}
      onClick={onPress ?? onClick}
      className={cx(buttonClasses({ color, variant, size, isIconOnly, radius }), className)}
    >
      {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : startContent}
      {children}
      {endContent}
    </BaseButton>
  )
})

export function ButtonGroup({ children, className }: AnyProps) {
  return <div className={cx("inline-flex [&>button:not(:first-child)]:rounded-l-none [&>button:not(:last-child)]:rounded-r-none", className)}>{children}</div>
}

function FieldShell({ label, description, errorMessage, startContent, endContent, className, classNames, children }: AnyProps) {
  return (
    <label className={cx("flex min-w-0 flex-col gap-1 text-sm", className, classNames?.base)}>
      {label && <span className={cx("text-xs text-default-600", classNames?.label)}>{label}</span>}
      <span className={cx("flex min-h-10 items-center gap-2 rounded-lg border border-default-200 bg-default-50 px-3 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30", classNames?.inputWrapper)}>
        {startContent}
        {children}
        {endContent}
      </span>
      {description && <span className="text-[11px] text-default-400">{description}</span>}
      {errorMessage && <span className="text-[11px] text-danger">{errorMessage}</span>}
    </label>
  )
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, description, errorMessage, startContent, endContent, className, classNames, onValueChange, onChange, isDisabled, isReadOnly, isClearable, value, ...props }, ref,
) {
  const { variant: _variant, size: _size, color: _color, isInvalid: _isInvalid, ...native } = props
  return (
    <FieldShell {...{ label, description, errorMessage, startContent, className, classNames }} endContent={<>{endContent}{isClearable && value ? <button type="button" className="rounded p-0.5 text-default-400 hover:text-foreground" onClick={() => onValueChange?.("")} aria-label="Clear"><X className="h-3.5 w-3.5" /></button> : null}</>}>
      <BaseInput
        {...native}
        value={value}
        ref={ref}
        disabled={isDisabled}
        readOnly={isReadOnly}
        onChange={(event) => { onChange?.(event); onValueChange?.(event.target.value) }}
        className={cx("h-8 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-default-400", classNames?.input)}
      />
    </FieldShell>
  )
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, description, errorMessage, className, classNames, onValueChange, onChange, isDisabled, isReadOnly, ...props }, ref,
) {
  const { variant: _variant, size: _size, minRows, maxRows, disableAutosize: _disableAutosize, ...native } = props
  return (
    <label className={cx("flex min-h-0 min-w-0 flex-col gap-1", className, classNames?.base)}>
      {label && <span className={cx("text-xs text-default-600", classNames?.label)}>{label}</span>}
      <span className={cx("flex min-h-24 flex-1 rounded-lg border border-default-200 bg-default-50 p-3 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30", classNames?.inputWrapper)}>
        <textarea
          {...native}
          ref={ref}
          disabled={isDisabled}
          readOnly={isReadOnly}
          rows={minRows}
          onChange={(event) => { onChange?.(event); onValueChange?.(event.target.value) }}
          className={cx("h-full min-h-20 w-full resize-none bg-transparent text-sm outline-none placeholder:text-default-400", classNames?.input)}
        />
      </span>
      {description && <span className="text-[11px] text-default-400">{description}</span>}
      {errorMessage && <span className="text-[11px] text-danger">{errorMessage}</span>}
    </label>
  )
})

type ItemData = { value: string; label: React.ReactNode; startContent?: React.ReactNode; disabled?: boolean }
export function SelectItem(_props: AnyProps) { return null }

export function Select({ children, label, placeholder, className, classNames, selectedKeys, defaultSelectedKeys, onSelectionChange, onChange, startContent, isDisabled, ...props }: SelectProps) {
  const items = React.Children.toArray(children).filter(React.isValidElement).map((child: any): ItemData => ({
    value: String(child.key ?? child.props.value ?? ""),
    label: child.props.children,
    startContent: child.props.startContent,
    disabled: child.props.isDisabled,
  }))
  const selected = selectedKeys === "all" ? items[0]?.value : Array.from(selectedKeys ?? [])[0] as string | undefined
  const defaultSelected = Array.from(defaultSelectedKeys ?? [])[0] as string | undefined
  const current = items.find(item => item.value === selected)
  const { variant: _variant, size: _size, color: _color, ...rootProps } = props
  return (
    <BaseSelect.Root
      {...rootProps}
      items={items}
      value={selected}
      defaultValue={defaultSelected}
      disabled={isDisabled}
      onValueChange={(value) => {
        onSelectionChange?.(new Set(value == null ? [] : [String(value)]))
        onChange?.({ target: { value: value == null ? "" : String(value) } } as unknown as React.ChangeEvent<HTMLSelectElement>)
      }}
    >
      <div className={cx("flex min-w-0 flex-col gap-1 text-sm", className, classNames?.base)}>
        {label && <BaseSelect.Label className={cx("text-xs text-default-600", classNames?.label)}>{label}</BaseSelect.Label>}
        <BaseSelect.Trigger className={cx("flex h-10 w-full items-center gap-2 rounded-lg border border-default-200 bg-default-50 px-3 text-left outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/30", classNames?.trigger)}>
          {startContent}
          <BaseSelect.Value className="min-w-0 flex-1 truncate" placeholder={placeholder}>
            {() => current?.label ?? placeholder}
          </BaseSelect.Value>
          <BaseSelect.Icon><ChevronDown className="h-4 w-4 text-default-400" /></BaseSelect.Icon>
        </BaseSelect.Trigger>
      </div>
      <BaseSelect.Portal>
        <BaseSelect.Positioner className="z-[100] outline-none" sideOffset={4} alignItemWithTrigger={false}>
          <BaseSelect.Popup className="max-h-72 min-w-[var(--anchor-width)] overflow-auto rounded-lg border border-default-200 bg-background p-1 text-sm shadow-xl outline-none">
            <BaseSelect.List>
              {items.map(item => (
                <BaseSelect.Item key={item.value} value={item.value} disabled={item.disabled} className="flex cursor-default items-center gap-2 rounded-md px-2 py-2 outline-none data-[highlighted]:bg-default-100 data-[selected]:text-primary data-[disabled]:opacity-40">
                  {item.startContent}<BaseSelect.ItemText className="flex-1">{item.label}</BaseSelect.ItemText><BaseSelect.ItemIndicator><Check className="h-4 w-4" /></BaseSelect.ItemIndicator>
                </BaseSelect.Item>
              ))}
            </BaseSelect.List>
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  )
}

export function Tab(_props: AnyProps) { return null }
export function Tabs({ children, selectedKey, defaultSelectedKey, onSelectionChange, className, classNames, ...props }: TabsProps) {
  const tabs = React.Children.toArray(children).filter(React.isValidElement).map((child: any) => ({
    value: String(child.key ?? child.props.value ?? ""), title: child.props.title, content: child.props.children,
  }))
  const { color: _color, variant: _variant, size: _size, ...rootProps } = props
  return (
    <BaseTabs.Root {...rootProps} value={selectedKey} defaultValue={defaultSelectedKey ?? tabs[0]?.value} onValueChange={(value) => onSelectionChange?.(value)} className={className}>
      <BaseTabs.List className={cx("relative flex w-max min-w-full gap-1 border-b border-default-200", classNames?.tabList)}>
        {tabs.map(tab => <BaseTabs.Tab key={tab.value} value={tab.value} className={cx("relative px-3 py-2 text-default-500 outline-none data-[selected]:text-primary", classNames?.tab)}>{tab.title}</BaseTabs.Tab>)}
        <BaseTabs.Indicator className={cx("absolute bottom-0 h-0.5 bg-primary transition-all", classNames?.cursor)} />
      </BaseTabs.List>
      {tabs.filter(tab => tab.content != null).map(tab => <BaseTabs.Panel key={tab.value} value={tab.value} className={cx("outline-none", classNames?.panel)}>{tab.content}</BaseTabs.Panel>)}
    </BaseTabs.Root>
  )
}

export function Card({ children, className, ...props }: AnyProps) { return <div {...props} className={cx("rounded-xl bg-content1 text-foreground", className)}>{children}</div> }
export function CardHeader({ children, className, ...props }: AnyProps) { return <div {...props} className={cx("flex p-4", className)}>{children}</div> }
export function CardBody({ children, className, ...props }: AnyProps) { return <div {...props} className={cx("flex flex-col p-4", className)}>{children}</div> }
export function Chip({ children, className, color = "default", variant: _variant, size: _size, ...props }: AnyProps) { return <span {...props} className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-xs", colorClasses[color], className)}>{children}</span> }
export function Spinner({ className, size = "md", ...props }: AnyProps) { return <LoaderCircle {...props} className={cx("animate-spin text-primary", size === "sm" ? "h-4 w-4" : "h-6 w-6", className)} /> }

export function ScrollShadow({ children, className, ...props }: AnyProps) {
  const { hideScrollBar: _hide, orientation: _orientation, ...native } = props
  return <ScrollArea.Root {...native} className={cx("min-h-0 min-w-0 overflow-hidden", className)}><ScrollArea.Viewport className="h-full w-full"><ScrollArea.Content>{children}</ScrollArea.Content></ScrollArea.Viewport></ScrollArea.Root>
}

export function RadioGroup({ children, value, defaultValue, onValueChange, className, ...props }: RadioGroupProps) {
  const { orientation: _orientation, size: _size, color: _color, ...native } = props
  return <BaseRadioGroup {...native} value={value} defaultValue={defaultValue} onValueChange={onValueChange} className={cx("flex flex-wrap gap-3", className)}>{children}</BaseRadioGroup>
}
export function Radio({ children, value, className, isDisabled, ...props }: AnyProps) {
  const { size: _size, color: _color, ...native } = props
  return <label className={cx("inline-flex items-center gap-2 text-sm", isDisabled && "opacity-50", className)}><BaseRadio.Root {...native} value={value} disabled={isDisabled} className="flex h-4 w-4 items-center justify-center rounded-full border border-default-400 data-[checked]:border-primary"><BaseRadio.Indicator className="h-2 w-2 rounded-full bg-primary" /></BaseRadio.Root>{children}</label>
}
export function Switch({ children, isSelected, defaultSelected, onValueChange, className, isDisabled, ...props }: ToggleProps) {
  const { size: _size, color: _color, ...native } = props
  return <label className={cx("inline-flex items-center gap-2", className)}><BaseSwitch.Root {...native} checked={isSelected} defaultChecked={defaultSelected} onCheckedChange={onValueChange} disabled={isDisabled} className="relative h-5 w-9 rounded-full bg-default-300 transition-colors data-[checked]:bg-primary"><BaseSwitch.Thumb className="block h-4 w-4 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[checked]:translate-x-[18px]" /></BaseSwitch.Root>{children}</label>
}
export function Checkbox({ children, isSelected, defaultSelected, onValueChange, className, isDisabled, ...props }: ToggleProps) {
  const { size: _size, color: _color, ...native } = props
  return <label className={cx("inline-flex items-center gap-2 text-sm", className)}><BaseCheckbox.Root {...native} checked={isSelected} defaultChecked={defaultSelected} onCheckedChange={onValueChange} disabled={isDisabled} className="flex h-4 w-4 items-center justify-center rounded border border-default-400 data-[checked]:border-primary data-[checked]:bg-primary"><BaseCheckbox.Indicator><Check className="h-3 w-3 text-white" /></BaseCheckbox.Indicator></BaseCheckbox.Root>{children}</label>
}

export function Tooltip({ children, content, placement = "top", delay = 300, closeDelay = 0, className, ...props }: AnyProps) {
  const child = React.Children.only(children) as React.ReactElement
  const [side, align] = String(placement).split("-")
  return <BaseTooltip.Provider delay={delay} closeDelay={closeDelay}><BaseTooltip.Root><BaseTooltip.Trigger render={child} /><BaseTooltip.Portal><BaseTooltip.Positioner side={side as any} align={(align ?? "center") as any} sideOffset={6}><BaseTooltip.Popup {...props} className={cx("z-[110] max-w-xs rounded-md bg-foreground px-2 py-1 text-xs text-background shadow-lg", className)}>{content}</BaseTooltip.Popup></BaseTooltip.Positioner></BaseTooltip.Portal></BaseTooltip.Root></BaseTooltip.Provider>
}

export function Dropdown({ children }: AnyProps) { return <BaseMenu.Root>{children}</BaseMenu.Root> }
export function DropdownTrigger({ children }: AnyProps) { return <BaseMenu.Trigger render={React.Children.only(children) as React.ReactElement} /> }
export function DropdownItem(_props: AnyProps) { return null }
export function DropdownMenu({ children, className, selectedKeys, onSelectionChange, ...props }: DropdownMenuProps) {
  const items = React.Children.toArray(children).filter(React.isValidElement) as React.ReactElement<AnyProps>[]
  const { selectionMode: _selectionMode, disallowEmptySelection: _disallow, ...native } = props
  return <BaseMenu.Portal><BaseMenu.Positioner className="z-[100]" sideOffset={4}><BaseMenu.Popup {...native} className={cx("min-w-36 rounded-lg border border-default-200 bg-background p-1 text-sm shadow-xl outline-none", className)}>{items.map(item => { const value = String(item.key ?? ""); return <BaseMenu.Item key={value} disabled={item.props.isDisabled} onClick={(event) => { item.props.onClick?.(event); item.props.onPress?.(); onSelectionChange?.(new Set([value])) }} className="flex cursor-default items-center gap-2 rounded-md px-2 py-2 outline-none data-[highlighted]:bg-default-100 data-[disabled]:opacity-40">{item.props.startContent}{item.props.children}{selectedKeys && Array.from(selectedKeys).includes(value) && <Check className="ml-auto h-4 w-4" />}</BaseMenu.Item> })}</BaseMenu.Popup></BaseMenu.Positioner></BaseMenu.Portal>
}

export function Popover({ children, isOpen, defaultOpen, onOpenChange, placement = "bottom", ...props }: AnyProps) { const [side, align] = String(placement).split("-"); return <PopoverContext.Provider value={{ side, align, props }}><BasePopover.Root open={isOpen} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>{children}</BasePopover.Root></PopoverContext.Provider> }
const PopoverContext = createContext<AnyProps>({ side: "bottom", align: "center", props: {} })
export function PopoverTrigger({ children }: AnyProps) { return <BasePopover.Trigger render={React.Children.only(children) as React.ReactElement} /> }
export function PopoverContent({ children, className, ...props }: AnyProps) { const context = useContext(PopoverContext); return <BasePopover.Portal><BasePopover.Positioner className="z-[100]" side={context.side} align={context.align ?? "center"} sideOffset={6}><BasePopover.Popup {...props} className={cx("rounded-lg border border-default-200 bg-background p-3 shadow-xl outline-none", className)}>{context.props.showArrow && <BasePopover.Arrow className="fill-background" />}{children}</BasePopover.Popup></BasePopover.Positioner></BasePopover.Portal> }

export function useDisclosure() {
  const [isOpen, setOpen] = useState(false)
  return useMemo(() => ({ isOpen, onOpen: () => setOpen(true), onClose: () => setOpen(false), onOpenChange: setOpen }), [isOpen])
}
const ModalContext = createContext({ onClose: () => {} })
export function Modal({ children, isOpen, onClose, onOpenChange, classNames, ...props }: AnyProps) {
  const { size: _size, scrollBehavior: _scroll, placement: _placement, ...root } = props
  return <ModalContext.Provider value={{ onClose }}><BaseDialog.Root {...root} open={isOpen} onOpenChange={(open) => { onOpenChange?.(open); if (!open) onClose?.() }}><div data-modal-base-class={classNames?.base}>{children}</div></BaseDialog.Root></ModalContext.Provider>
}
export function ModalContent({ children, className }: ModalContentProps) { const { onClose } = useContext(ModalContext); return <BaseDialog.Portal><BaseDialog.Backdrop className="fixed inset-0 z-[120] bg-black/45 backdrop-blur-sm data-[starting-style]:opacity-0 data-[ending-style]:opacity-0" /><BaseDialog.Viewport className="fixed inset-0 z-[121] flex items-center justify-center p-4"><BaseDialog.Popup className={cx("flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-default-200 bg-background shadow-2xl outline-none", className)}>{typeof children === "function" ? children(onClose) : children}</BaseDialog.Popup></BaseDialog.Viewport></BaseDialog.Portal> }
export function ModalHeader({ children, className, ...props }: AnyProps) { return <BaseDialog.Title {...props} className={cx("px-6 pt-5 text-lg font-semibold", className)}>{children}</BaseDialog.Title> }
export function ModalBody({ children, className, ...props }: AnyProps) { return <div {...props} className={cx("min-h-0 overflow-auto px-6 py-4", className)}>{children}</div> }
export function ModalFooter({ children, className, ...props }: AnyProps) { return <div {...props} className={cx("flex justify-end gap-2 px-6 pb-5", className)}>{children}</div> }

export function DatePicker({ label, className, classNames, onChange, isDisabled, ...props }: AnyProps) {
  const { granularity: _granularity, hideTimeZone: _hide, hourCycle: _hour, showMonthAndYearPickers: _show, selectorIcon, ...native } = props
  return <Input {...native} type="datetime-local" label={label} className={cx(className, classNames?.base)} classNames={classNames} isDisabled={isDisabled} endContent={selectorIcon} onChange={(event: React.ChangeEvent<HTMLInputElement>) => { const match = event.target.value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/); if (match) onChange?.(new CalendarDateTime(+match[1], +match[2], +match[3], +match[4], +match[5], +(match[6] ?? 0))) }} />
}

const toastManager = BaseToast.createToastManager()
export function addToast({ title, description, severity = "default", timeout }: AnyProps) { return toastManager.add({ title, description, type: severity, timeout }) }
export function ToastProvider({ placement = "bottom-right" }: AnyProps) {
  return <BaseToast.Provider toastManager={toastManager}><BaseToast.Portal><BaseToast.Viewport data-placement={placement} className="fixed bottom-4 right-4 z-[200] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 outline-none"><ToastList /></BaseToast.Viewport></BaseToast.Portal></BaseToast.Provider>
}
function ToastList() { const { toasts } = BaseToast.useToastManager(); return toasts.map(toast => <BaseToast.Root key={toast.id} toast={toast} className="flex items-start gap-3 rounded-xl border border-default-200 bg-background p-4 shadow-xl data-[type=danger]:border-danger/40 data-[type=success]:border-success/40"><BaseToast.Content className="min-w-0 flex-1"><BaseToast.Title className="font-medium" /><BaseToast.Description className="mt-1 text-sm text-default-500" /></BaseToast.Content><BaseToast.Close className="rounded p-1 hover:bg-default-100" aria-label="Close"><X className="h-4 w-4" /></BaseToast.Close></BaseToast.Root>) }
export function BaseUIProvider({ children }: { children: React.ReactNode }) { return <BaseTooltip.Provider>{children}</BaseTooltip.Provider> }
