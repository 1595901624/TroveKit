import React, { createContext, forwardRef, useContext, useMemo, useState } from "react"
import { Button as BaseButton } from "@base-ui/react/button"
import { Input as BaseInput } from "@base-ui/react/input"
import { Select as BaseSelect } from "@base-ui/react/select"
import { Tabs as BaseTabs } from "@base-ui/react/tabs"
import { Dialog as BaseDialog } from "@base-ui/react/dialog"
import { Menu as BaseMenu } from "@base-ui/react/menu"
import { Popover as BasePopover } from "@base-ui/react/popover"
import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip"
import { Switch as BaseSwitch } from "@base-ui/react/switch"
import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox"
import { Radio as BaseRadio } from "@base-ui/react/radio"
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group"
import { ScrollArea } from "@base-ui/react/scroll-area"
import { CalendarDateTime } from "@internationalized/date"
import { Check, ChevronDown, LoaderCircle, X } from "lucide-react"
import { twMerge } from "tailwind-merge"

export { addToast, ToastProvider } from "./toast"
export type { ToastOptions, ToastSeverity } from "./toast"

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

const solidColorClasses: Record<string, string> = {
  default: "bg-default-100 text-foreground hover:bg-default-200 disabled:bg-default-100 disabled:text-default-500 disabled:opacity-100",
  primary: "bg-primary-solid text-primary-solid-foreground hover:bg-primary-solid/90 disabled:bg-default-100 disabled:text-default-500 disabled:opacity-100",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90 disabled:bg-default-100 disabled:text-default-500 disabled:opacity-100",
  success: "bg-success text-success-foreground hover:bg-success/90 disabled:bg-default-100 disabled:text-default-500 disabled:opacity-100",
  warning: "bg-warning text-warning-foreground hover:bg-warning/90 disabled:bg-default-100 disabled:text-default-500 disabled:opacity-100",
  danger: "bg-danger text-danger-foreground hover:bg-danger/90 disabled:bg-default-100 disabled:text-default-500 disabled:opacity-100",
}

const flatColorClasses: Record<string, string> = {
  default: "bg-default-100 text-foreground hover:bg-default-200",
  primary: "bg-primary/15 text-primary hover:bg-primary/25",
  secondary: "bg-secondary/15 text-secondary hover:bg-secondary/25",
  success: "bg-success/15 text-success hover:bg-success/25",
  warning: "bg-warning/20 text-warning hover:bg-warning/30",
  danger: "bg-danger/15 text-danger hover:bg-danger/25",
}

const lightColorClasses: Record<string, string> = {
  default: "bg-transparent text-foreground hover:bg-default-100",
  primary: "bg-transparent text-primary hover:bg-primary/10",
  secondary: "bg-transparent text-secondary hover:bg-secondary/10",
  success: "bg-transparent text-success hover:bg-success/10",
  warning: "bg-transparent text-warning hover:bg-warning/10",
  danger: "bg-transparent text-danger hover:bg-danger/10",
}

const borderedColorClasses: Record<string, string> = {
  default: "border border-default-300 bg-transparent text-foreground hover:bg-default-100",
  primary: "border border-primary/50 bg-transparent text-primary hover:bg-primary/10",
  secondary: "border border-secondary/50 bg-transparent text-secondary hover:bg-secondary/10",
  success: "border border-success/50 bg-transparent text-success hover:bg-success/10",
  warning: "border border-warning/60 bg-transparent text-warning hover:bg-warning/10",
  danger: "border border-danger/50 bg-transparent text-danger hover:bg-danger/10",
}

const textColorClasses: Record<string, string> = {
  default: "text-foreground",
  primary: "text-primary",
  secondary: "text-secondary",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
}

function buttonClasses({ color = "default", variant = "solid", size = "md", isIconOnly, radius }: AnyProps) {
  const resolvedColor = color in solidColorClasses ? color : "default"
  const variants: Record<string, string> = {
    solid: solidColorClasses[resolvedColor],
    flat: flatColorClasses[resolvedColor],
    bordered: borderedColorClasses[resolvedColor],
    faded: cx("border border-default-200 bg-default-50 hover:bg-default-100", textColorClasses[resolvedColor]),
    light: lightColorClasses[resolvedColor],
    ghost: cx("border border-current", lightColorClasses[resolvedColor]),
  }
  return cx(
    "inline-flex shrink-0 select-none items-center justify-center gap-2 font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-60",
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
      type={native.type ?? "button"}
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

export function ButtonGroup({ children, className, variant, color, size, radius, isDisabled }: AnyProps) {
  const sharedProps = { variant, color, size, radius, isDisabled }
  return (
    <div className={cx("inline-flex [&>button:not(:first-child)]:rounded-l-none [&>button:not(:last-child)]:rounded-r-none", className)}>
      {React.Children.map(children, child => React.isValidElement<AnyProps>(child)
        ? React.cloneElement(child, Object.fromEntries(Object.entries(sharedProps).filter(([key, value]) => value !== undefined && child.props[key] === undefined)))
        : child)}
    </div>
  )
}

function FieldShell({ label, description, errorMessage, startContent, endContent, className, classNames, children }: AnyProps) {
  return (
    <label className={cx("flex min-w-0 flex-col gap-1 text-sm", className, classNames?.base)}>
      {label && <span className={cx("text-xs text-default-600", classNames?.label)}>{label}</span>}
      <span className={cx("flex min-h-10 items-center gap-2 rounded-lg border border-default-200 bg-default-50 px-3 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/50", classNames?.inputWrapper)}>
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
    <FieldShell {...{ label, description, errorMessage, startContent, className, classNames }} endContent={<>{endContent}{isClearable && value ? <Button isIconOnly size="sm" variant="light" className="h-5 min-w-5 w-5 p-0 text-default-400 hover:text-foreground" onPress={() => onValueChange?.("")} aria-label="Clear"><X className="h-3.5 w-3.5" /></Button> : null}</>}>
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
      <span className={cx("flex min-h-24 flex-1 rounded-lg border border-default-200 bg-default-50 p-3 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/50", classNames?.inputWrapper)}>
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

// React.Children.toArray() rewrites explicit keys (for example "ja" becomes
// ".$ja"). HeroUI exposed the original key to onSelectionChange, so keep the
// elements' keys intact when adapting collection components to Base UI.
export function collectionElements(children: React.ReactNode) {
  const elements: React.ReactElement<AnyProps>[] = []
  React.Children.forEach(children, child => {
    if (React.isValidElement<AnyProps>(child)) elements.push(child)
  })
  return elements
}

export function collectionValue(child: React.ReactElement<AnyProps>) {
  return String(child.props.value ?? child.key ?? "")
}

export function Select({ children, label, placeholder, className, classNames, selectedKeys, defaultSelectedKeys, onSelectionChange, onChange, startContent, isDisabled, ...props }: SelectProps) {
  const items = collectionElements(children).map((child): ItemData => ({
    value: collectionValue(child),
    label: child.props.children,
    startContent: child.props.startContent,
    disabled: child.props.isDisabled,
  }))
  const isControlled = selectedKeys !== undefined
  const selected = selectedKeys === "all" ? items[0]?.value : Array.from(selectedKeys ?? [])[0] as string | undefined
  const defaultSelected = Array.from(defaultSelectedKeys ?? [])[0] as string | undefined
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultSelected)
  const currentValue = isControlled ? selected : uncontrolledValue
  const current = items.find(item => item.value === currentValue)
  const { variant: _variant, size: _size, color: _color, ...rootProps } = props
  return (
    <BaseSelect.Root
      {...rootProps}
      items={items}
      value={isControlled ? selected : undefined}
      defaultValue={isControlled ? undefined : defaultSelected}
      disabled={isDisabled}
      onValueChange={(value) => {
        const nextValue = value == null ? "" : String(value)
        if (!isControlled) setUncontrolledValue(nextValue || undefined)
        onSelectionChange?.(new Set(nextValue ? [nextValue] : []))
        onChange?.({ target: { value: nextValue }, currentTarget: { value: nextValue } } as unknown as React.ChangeEvent<HTMLSelectElement>)
      }}
    >
      <div className={cx("flex min-w-0 flex-col gap-1 text-sm", className, classNames?.base)}>
        {label && <BaseSelect.Label className={cx("text-xs text-default-600", classNames?.label)}>{label}</BaseSelect.Label>}
        <BaseSelect.Trigger className={cx("flex h-10 w-full items-center gap-2 rounded-lg border border-default-200 bg-default-50 px-3 text-left outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/50", classNames?.trigger)}>
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
  const tabs = collectionElements(children).map(child => ({
    value: collectionValue(child), title: child.props.title, content: child.props.children,
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

export function Card({ children, className, isPressable, onPress, shadow: _shadow, ...props }: AnyProps) {
  return <div {...props} role={isPressable ? "button" : undefined} tabIndex={isPressable ? 0 : undefined} onClick={onPress} onKeyDown={isPressable ? (event) => { if (event.key === "Enter" || event.key === " ") onPress?.() } : undefined} className={cx("rounded-xl bg-content1 text-foreground", isPressable && "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background", className)}>{children}</div>
}
export function CardHeader({ children, className, ...props }: AnyProps) { return <div {...props} className={cx("flex p-4", className)}>{children}</div> }
export function CardBody({ children, className, ...props }: AnyProps) { return <div {...props} className={cx("flex flex-col p-4", className)}>{children}</div> }
export function Chip({ children, className, color = "default", variant: _variant, size: _size, ...props }: AnyProps) { return <span {...props} className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-xs", flatColorClasses[color] ?? flatColorClasses.default, className)}>{children}</span> }
export function Spinner({ className, size = "md", ...props }: AnyProps) { return <LoaderCircle {...props} className={cx("animate-spin text-primary", size === "sm" ? "h-4 w-4" : "h-6 w-6", className)} /> }

export function ScrollShadow({ children, className, ...props }: AnyProps) {
  const { hideScrollBar: _hide, orientation: _orientation, ...native } = props
  return <ScrollArea.Root {...native} className={cx("min-h-0 min-w-0 overflow-hidden", className)}><ScrollArea.Viewport className="h-full w-full"><ScrollArea.Content>{children}</ScrollArea.Content></ScrollArea.Viewport></ScrollArea.Root>
}

export function RadioGroup({ children, value, defaultValue, onValueChange, className, label, ...props }: RadioGroupProps) {
  const { orientation: _orientation, size: _size, color: _color, ...native } = props
  const accessibleLabel = native["aria-label"] ?? (typeof label === "string" ? label : undefined)
  const group = (
    <BaseRadioGroup
      {...native}
      aria-label={accessibleLabel}
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      className={cx("flex flex-wrap gap-3", className)}
    >
      {children}
    </BaseRadioGroup>
  )

  if (!label) return group

  return (
    <div className="flex min-h-8 shrink-0 items-center gap-2 rounded-lg border border-default-200 bg-background px-2.5">
      <span className="whitespace-nowrap text-[11px] font-medium text-default-500">
        {label}
      </span>
      {group}
    </div>
  )
}
export function Radio({ children, value, className, isDisabled, ...props }: AnyProps) {
  const { size: _size, color: _color, ...native } = props
  return <label className={cx("inline-flex items-center gap-2 text-sm", isDisabled && "opacity-50", className)}><BaseRadio.Root {...native} value={value} disabled={isDisabled} className="flex h-4 w-4 items-center justify-center rounded-full border border-default-400 data-[checked]:border-primary"><BaseRadio.Indicator className="h-2 w-2 rounded-full bg-primary" /></BaseRadio.Root>{children}</label>
}
export function Switch({ children, isSelected, defaultSelected, onValueChange, className, classNames, isDisabled, ...props }: ToggleProps) {
  const { size = "md", color: _color, ...native } = props
  const isSmall = size === "sm"
  return (
    <label className={cx("inline-flex cursor-pointer items-center gap-2 text-sm text-default-600", isDisabled && "cursor-not-allowed opacity-50", className, classNames?.base)}>
      <BaseSwitch.Root
        {...native}
        checked={isSelected}
        defaultChecked={defaultSelected}
        onCheckedChange={onValueChange}
        disabled={isDisabled}
        className={cx(
          "relative inline-flex shrink-0 items-center rounded-full border border-default-300 bg-default-200 outline-none transition-[background-color,border-color,box-shadow] data-[checked]:border-primary data-[checked]:bg-primary data-[focused]:ring-2 data-[focused]:ring-primary/50",
          isSmall ? "h-4 w-7" : "h-5 w-9",
          classNames?.root,
        )}
      >
        <BaseSwitch.Thumb
          className={cx(
            "block translate-x-0.5 rounded-full bg-white shadow-sm transition-transform dark:data-[checked]:bg-primary-foreground",
            isSmall ? "h-3 w-3 data-[checked]:translate-x-[14px]" : "h-4 w-4 data-[checked]:translate-x-[18px]",
            classNames?.thumb,
          )}
        />
      </BaseSwitch.Root>
      {children}
    </label>
  )
}
export function Checkbox({ children, isSelected, defaultSelected, onValueChange, className, isDisabled, ...props }: ToggleProps) {
  const { size: _size, color: _color, ...native } = props
  return <label className={cx("inline-flex items-center gap-2 text-sm", className)}><BaseCheckbox.Root {...native} checked={isSelected} defaultChecked={defaultSelected} onCheckedChange={onValueChange} disabled={isDisabled} className="flex h-4 w-4 items-center justify-center rounded border border-default-400 data-[checked]:border-primary data-[checked]:bg-primary"><BaseCheckbox.Indicator><Check className="h-3 w-3 text-primary-foreground" /></BaseCheckbox.Indicator></BaseCheckbox.Root>{children}</label>
}

export function Tooltip({ children, content, placement = "top", delay = 300, closeDelay = 0, className, ...props }: AnyProps) {
  const child = React.Children.only(children) as React.ReactElement
  const [side, align] = String(placement).split("-")
  return <BaseTooltip.Provider delay={delay} closeDelay={closeDelay}><BaseTooltip.Root><BaseTooltip.Trigger render={child} /><BaseTooltip.Portal><BaseTooltip.Positioner side={side as any} align={(align ?? "center") as any} sideOffset={6}><BaseTooltip.Popup {...props} className={cx("z-[110] max-w-xs rounded-md bg-foreground px-2 py-1 text-xs text-background shadow-lg", className)}>{content}</BaseTooltip.Popup></BaseTooltip.Positioner></BaseTooltip.Portal></BaseTooltip.Root></BaseTooltip.Provider>
}

export function Dropdown({ children, isOpen, onOpenChange, ...props }: AnyProps) { return <BaseMenu.Root {...props} open={isOpen} onOpenChange={onOpenChange}>{children}</BaseMenu.Root> }
export function DropdownTrigger({ children }: AnyProps) { return <BaseMenu.Trigger render={React.Children.only(children) as React.ReactElement} /> }
export function DropdownItem(_props: AnyProps) { return null }
export function DropdownSeparator(_props: AnyProps) { return null }
export function DropdownSubmenu(_props: AnyProps) { return null }
export function DropdownMenu({ children, className, selectedKeys, onSelectionChange, ...props }: DropdownMenuProps) {
  const items = collectionElements(children)
  const { selectionMode: _selectionMode, disallowEmptySelection: _disallow, ...native } = props
  const renderItems = (menuItems: React.ReactElement<AnyProps>[]) => menuItems.map((item, index) => {
    if (item.type === DropdownSeparator) return <BaseMenu.Separator key={`separator-${index}`} className="-mx-1 my-1 h-px bg-default-200" />
    if (item.type === DropdownSubmenu) return (
      <BaseMenu.SubmenuRoot key={collectionValue(item)}>
        <BaseMenu.SubmenuTrigger openOnHover delay={80} className={cx("flex cursor-default items-center gap-2 rounded-md px-2 py-2 outline-none data-[highlighted]:bg-default-100", item.props.className)}>
          {item.props.startContent}<span className="min-w-0 flex-1">{item.props.label}</span>{item.props.endContent}
        </BaseMenu.SubmenuTrigger>
        <BaseMenu.Portal>
          <BaseMenu.Positioner className="z-[101]" side="right" align="start" sideOffset={4} alignOffset={-6}>
            <BaseMenu.Popup className={cx("min-w-36 rounded-lg border border-default-200 bg-background p-1 text-sm shadow-xl outline-none", item.props.menuClassName)}>
              {renderItems(collectionElements(item.props.children))}
            </BaseMenu.Popup>
          </BaseMenu.Positioner>
        </BaseMenu.Portal>
      </BaseMenu.SubmenuRoot>
    )
    const value = collectionValue(item)
    return <BaseMenu.Item key={value} disabled={item.props.isDisabled} onClick={(event) => { item.props.onClick?.(event); item.props.onPress?.(); onSelectionChange?.(new Set([value])) }} className={cx("flex cursor-default items-center gap-2 rounded-md px-2 py-2 outline-none data-[highlighted]:bg-default-100 data-[disabled]:opacity-40", item.props.className)}>{item.props.startContent}<span className="min-w-0 flex-1">{item.props.children}</span>{item.props.endContent}{selectedKeys && Array.from(selectedKeys).map(String).includes(value) && <Check className="ml-auto h-4 w-4" />}</BaseMenu.Item>
  })
  return <BaseMenu.Portal><BaseMenu.Positioner className="z-[100]" sideOffset={4} align="start"><BaseMenu.Popup {...native} className={cx("min-w-36 rounded-lg border border-default-200 bg-background p-1 text-sm shadow-xl outline-none", className)}>{renderItems(items)}</BaseMenu.Popup></BaseMenu.Positioner></BaseMenu.Portal>
}

export function Popover({ children, isOpen, defaultOpen, onOpenChange, placement = "bottom", ...props }: AnyProps) { const [side, align] = String(placement).split("-"); return <PopoverContext.Provider value={{ side, align, props }}><BasePopover.Root open={isOpen} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>{children}</BasePopover.Root></PopoverContext.Provider> }
const PopoverContext = createContext<AnyProps>({ side: "bottom", align: "center", props: {} })
export function PopoverTrigger({ children }: AnyProps) { return <BasePopover.Trigger render={React.Children.only(children) as React.ReactElement} /> }
export function PopoverContent({ children, className, ...props }: AnyProps) { const context = useContext(PopoverContext); return <BasePopover.Portal><BasePopover.Positioner className="z-[100]" side={context.side} align={context.align ?? "center"} sideOffset={6}><BasePopover.Popup {...props} className={cx("rounded-lg border border-default-200 bg-background p-3 shadow-xl outline-none", className)}>{context.props.showArrow && <BasePopover.Arrow className="fill-background" />}{children}</BasePopover.Popup></BasePopover.Positioner></BasePopover.Portal> }

export function useDisclosure() {
  const [isOpen, setOpen] = useState(false)
  return useMemo(() => ({ isOpen, onOpen: () => setOpen(true), onClose: () => setOpen(false), onOpenChange: setOpen }), [isOpen])
}
const ModalContext = createContext({ onClose: () => {}, baseClassName: undefined as string | undefined })
export function Modal({ children, isOpen, onClose, onOpenChange, classNames, ...props }: AnyProps) {
  const { size: _size, scrollBehavior: _scroll, placement: _placement, ...root } = props
  const close = () => { onOpenChange?.(false); onClose?.() }
  return <ModalContext.Provider value={{ onClose: close, baseClassName: classNames?.base }}><BaseDialog.Root {...root} open={isOpen} onOpenChange={(open) => { onOpenChange?.(open); if (!open) onClose?.() }}>{children}</BaseDialog.Root></ModalContext.Provider>
}
export function ModalContent({ children, className, classNames, hideCloseButton, ...props }: ModalContentProps) { const { onClose, baseClassName } = useContext(ModalContext); return <BaseDialog.Portal><BaseDialog.Backdrop className="fixed inset-0 z-[120] bg-black/45 backdrop-blur-sm data-[starting-style]:opacity-0 data-[ending-style]:opacity-0" /><BaseDialog.Viewport className="fixed inset-0 z-[121] flex items-center justify-center p-4"><BaseDialog.Popup {...props} className={cx("relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-default-200 bg-background shadow-2xl outline-none", baseClassName, classNames?.base, className)}>{!hideCloseButton && <BaseDialog.Close aria-label="Close" className="absolute right-4 top-4 z-10 rounded-md p-1 text-default-400 hover:bg-default-100 hover:text-foreground"><X className="h-4 w-4" /></BaseDialog.Close>}{typeof children === "function" ? children(onClose) : children}</BaseDialog.Popup></BaseDialog.Viewport></BaseDialog.Portal> }
export function ModalHeader({ children, className, ...props }: AnyProps) { return <BaseDialog.Title {...props} className={cx("px-6 pt-5 text-lg font-semibold", className)}>{children}</BaseDialog.Title> }
export function ModalBody({ children, className, ...props }: AnyProps) { return <div {...props} className={cx("min-h-0 overflow-auto px-6 py-4", className)}>{children}</div> }
export function ModalFooter({ children, className, ...props }: AnyProps) { return <div {...props} className={cx("flex justify-end gap-2 px-6 pb-5", className)}>{children}</div> }

export function DatePicker({ label, className, classNames, onChange, isDisabled, ...props }: AnyProps) {
  const { granularity: _granularity, hideTimeZone: _hide, hourCycle: _hour, showMonthAndYearPickers: _show, selectorIcon, ...native } = props
  return <Input {...native} type="datetime-local" label={label} className={cx(className, classNames?.base)} classNames={classNames} isDisabled={isDisabled} endContent={selectorIcon} onChange={(event: React.ChangeEvent<HTMLInputElement>) => { const match = event.target.value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/); if (match) onChange?.(new CalendarDateTime(+match[1], +match[2], +match[3], +match[4], +match[5], +(match[6] ?? 0))) }} />
}

export function BaseUIProvider({ children }: { children: React.ReactNode }) { return <BaseTooltip.Provider>{children}</BaseTooltip.Provider> }
