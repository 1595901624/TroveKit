import { useTranslation } from "react-i18next"

function SkeletonLine({ className }: { className: string }) {
  return <div className={`h-2 rounded-full bg-default-200/80 ${className}`} />
}

function EditorSkeletonVisual({ className = "", animated = true }: { className?: string; animated?: boolean }) {
  return (
    <div className={`flex h-full min-h-0 overflow-hidden bg-background ${className}`}>
      <div className="w-10 shrink-0 border-r border-default-200/70 bg-default-50/70" />
      <div className={`flex-1 space-y-4 p-4 ${animated ? "animate-pulse motion-reduce:animate-none" : ""}`}>
        <SkeletonLine className="w-2/5" />
        <SkeletonLine className="w-4/5" />
        <SkeletonLine className="w-3/5" />
        <SkeletonLine className="w-1/2" />
        <SkeletonLine className="w-3/4" />
        <SkeletonLine className="w-1/3" />
      </div>
    </div>
  )
}

export function EditorLoadingSkeleton({ className = "" }: { className?: string }) {
  const { t } = useTranslation()

  return (
    <div role="status" aria-live="polite" aria-busy="true" className="h-full min-h-0">
      <span className="sr-only">{t("common.loading", "Loading")}</span>
      <EditorSkeletonVisual className={className} />
    </div>
  )
}

function WorkspacePanelSkeleton() {
  return (
    <div className="flex min-h-0 min-w-0 flex-col">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-default-200 px-3.5">
        <SkeletonLine className="w-20" />
        <div className="h-7 w-16 rounded-md bg-default-100" />
      </div>
      <EditorSkeletonVisual animated={false} />
    </div>
  )
}

export function WorkspaceLoadingSkeleton() {
  const { t } = useTranslation()

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex h-full min-h-0 flex-col gap-3 animate-pulse motion-reduce:animate-none"
    >
      <span className="sr-only">{t("common.loading", "Loading")}</span>
      <div className="flex min-h-[46px] shrink-0 items-center gap-2 rounded-xl border border-default-200 bg-default-50/70 p-1.5">
        <div className="h-8 w-24 rounded-lg bg-default-200/80" />
        <div className="h-8 w-20 rounded-lg bg-default-100" />
        <div className="h-8 w-16 rounded-lg bg-default-100" />
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_48px_minmax(0,1fr)] overflow-hidden rounded-xl border border-default-200 bg-background">
        <WorkspacePanelSkeleton />
        <div className="border-x border-default-200 bg-default-50/60" />
        <WorkspacePanelSkeleton />
      </div>
    </div>
  )
}
