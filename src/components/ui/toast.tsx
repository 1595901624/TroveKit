import React from "react"
import { Toast as BaseToast } from "@base-ui/react/toast"
import { AlertTriangle, Check, Info, X, XCircle } from "lucide-react"

export type ToastSeverity = "default" | "success" | "warning" | "danger"

export interface ToastOptions {
  title: React.ReactNode
  description?: React.ReactNode
  severity?: ToastSeverity
  timeout?: number
  actionLabel?: React.ReactNode
  onAction?: () => void
}

interface ToastData {
  actionLabel?: React.ReactNode
}

interface ToastProviderProps {
  placement?: "top-right" | "bottom-right" | "top-center" | "bottom-center"
}

const toastManager = BaseToast.createToastManager<ToastData>()

const severityConfig = {
  default: { timeout: 4500, icon: Info, iconClassName: "bg-primary/15 text-primary" },
  success: { timeout: 3200, icon: Check, iconClassName: "bg-success/15 text-success" },
  warning: { timeout: 6000, icon: AlertTriangle, iconClassName: "bg-warning/20 text-warning" },
  danger: { timeout: 7000, icon: XCircle, iconClassName: "bg-danger/15 text-danger" },
} satisfies Record<ToastSeverity, {
  timeout: number
  icon: React.ComponentType<{ className?: string }>
  iconClassName: string
}>

export function addToast({ title, description, severity = "default", timeout, actionLabel, onAction }: ToastOptions) {
  const duration = timeout ?? severityConfig[severity].timeout

  return toastManager.add({
    title,
    description,
    type: severity,
    timeout: duration,
    priority: severity === "danger" ? "high" : "low",
    data: { actionLabel },
    actionProps: actionLabel ? { children: actionLabel, onClick: onAction } : undefined,
  })
}

export function ToastProvider({ placement = "bottom-right" }: ToastProviderProps) {
  return (
    <BaseToast.Provider toastManager={toastManager} timeout={4500} limit={4}>
      <BaseToast.Portal>
        <BaseToast.Viewport
          data-placement={placement}
          className="trove-toast-viewport fixed z-[200] w-[min(23rem,calc(100vw-1.5rem))] outline-none"
        >
          <ToastList />
        </BaseToast.Viewport>
      </BaseToast.Portal>
    </BaseToast.Provider>
  )
}

function ToastList() {
  const { toasts } = BaseToast.useToastManager<ToastData>()

  return toasts.map((toast) => {
    const severity = normalizeSeverity(toast.type)
    const config = severityConfig[severity]
    const Icon = config.icon
    const duration = toast.timeout ?? config.timeout

    return (
      <BaseToast.Root
        key={toast.id}
        toast={toast}
        swipeDirection="right"
        className="trove-toast group relative w-full overflow-hidden rounded-[14px] border border-default-200/90 bg-content1/95 text-foreground shadow-[0_12px_36px_rgba(0,0,0,0.16),0_2px_8px_rgba(0,0,0,0.08)] backdrop-blur-xl"
        style={{ "--toast-duration": `${duration}ms` } as React.CSSProperties}
      >
        <BaseToast.Content className="flex min-h-[64px] items-start gap-3 px-3.5 py-3.5 pr-11">
          <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${config.iconClassName}`}>
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <BaseToast.Title className="break-words text-[13px] font-semibold leading-5" />
            <BaseToast.Description className="mt-0.5 break-words text-xs leading-[1.125rem] text-default-500" />
            {toast.actionProps && (
              <BaseToast.Action
                {...toast.actionProps}
                className="mt-2 inline-flex h-7 items-center rounded-md bg-default-100 px-2.5 text-xs font-medium text-foreground outline-none transition-colors hover:bg-default-200 focus-visible:ring-2 focus-visible:ring-primary/45"
              />
            )}
          </div>
        </BaseToast.Content>
        <BaseToast.Close
          aria-label="Close notification"
          className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-md text-default-400 opacity-70 outline-none transition hover:bg-default-100 hover:text-foreground hover:opacity-100 focus-visible:ring-2 focus-visible:ring-primary/45 group-hover:opacity-100"
        >
          <X className="h-3.5 w-3.5" />
        </BaseToast.Close>
        {duration > 0 && <span aria-hidden="true" className="trove-toast__progress absolute inset-x-0 bottom-0 h-0.5 origin-left opacity-45" />}
      </BaseToast.Root>
    )
  })
}

function normalizeSeverity(type: string | undefined): ToastSeverity {
  return type === "success" || type === "warning" || type === "danger" ? type : "default"
}
