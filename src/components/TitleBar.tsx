import { useEffect, useState } from "react"
import { getCurrentWindow } from "@tauri-apps/api/window"
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Copy,
  Minus,
  PanelLeft,
  Search,
  Square,
  X,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { CommandMenu } from "./CommandMenu"
import { ToolId } from "./Sidebar"

interface TitleBarProps {
  onNavigate?: (toolId: ToolId, tabId?: string) => void
}

export default function TitleBar({ onNavigate }: TitleBarProps) {
  const { t } = useTranslation()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window
  const appWindow = isTauri ? getCurrentWindow() : null

  useEffect(() => {
    const openSearch = () => setIsSearchOpen(true)
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        openSearch()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("trovekit:open-search", openSearch)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("trovekit:open-search", openSearch)
    }
  }, [])

  const toggleMaximize = async () => {
    if (!appWindow) return
    const maximized = await appWindow.isMaximized()
    await appWindow.toggleMaximize()
    setIsMaximized(!maximized)
  }

  return (
    <>
      <CommandMenu
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={(toolId, tabId) => onNavigate?.(toolId, tabId)}
      />

      <div data-tauri-drag-region className="flex h-[clamp(40px,4.8vh,56px)] shrink-0 select-none items-center bg-[#f3f3f3] text-[#5f5f5f] dark:bg-[#202020] dark:text-default-400">
        <div className="flex h-full items-center gap-0.5 px-2">
          <TitleButton label={t("common.sidebar", "侧栏")} onClick={() => window.dispatchEvent(new Event("trovekit:toggle-sidebar"))}>
            <PanelLeft className="h-[17px] w-[17px]" />
          </TitleButton>
          <TitleButton label={t("common.back", "返回")} disabled><ArrowLeft className="h-[17px] w-[17px]" /></TitleButton>
          <TitleButton label={t("common.forward", "前进")} disabled><ArrowRight className="h-[17px] w-[17px]" /></TitleButton>
        </div>

        <div className="flex h-full items-center gap-0.5 text-[13px]" data-tauri-drag-region>
          {[t("menu.file", "文件"), t("menu.edit", "编辑"), t("menu.view", "视图"), t("menu.help", "帮助")].map(label => (
            <button key={label} type="button" className="rounded-md px-3 py-1.5 hover:bg-black/[0.055] dark:hover:bg-white/[0.07]">{label}</button>
          ))}
        </div>

        <div className="flex-1" data-tauri-drag-region />

        <button
          type="button"
          className="mr-2 flex h-7 items-center gap-2 rounded-xl border border-black/[0.06] bg-white/70 px-3 text-[11px] text-[#666] shadow-sm hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-default-400"
          onClick={() => setIsSearchOpen(true)}
        >
          <Search className="h-3.5 w-3.5" />
          <span>{t("common.search", "搜索")}</span>
          <span className="rounded border border-black/10 px-1 font-mono text-[9px] dark:border-white/10">Ctrl K</span>
          <ChevronDown className="h-3 w-3" />
        </button>

        <div className="flex h-full items-stretch">
          <WindowButton label={t("window.minimize", "最小化")} onClick={() => appWindow?.minimize()}><Minus className="h-4 w-4" /></WindowButton>
          <WindowButton label={t("window.maximize", "最大化")} onClick={toggleMaximize}>{isMaximized ? <Copy className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}</WindowButton>
          <WindowButton label={t("window.close", "关闭")} danger onClick={() => appWindow?.close()}><X className="h-4 w-4" /></WindowButton>
        </div>
      </div>
    </>
  )
}

function TitleButton({ children, label, onClick, disabled }: { children: React.ReactNode; label: string; onClick?: () => void; disabled?: boolean }) {
  return <button type="button" title={label} aria-label={label} disabled={disabled} onClick={onClick} className="flex h-8 w-9 items-center justify-center rounded-md hover:bg-black/[0.055] disabled:opacity-35 dark:hover:bg-white/[0.07]">{children}</button>
}

function WindowButton({ children, label, onClick, danger }: { children: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return <button type="button" title={label} aria-label={label} onClick={onClick} className={`flex w-11 items-center justify-center transition-colors ${danger ? "hover:bg-red-500 hover:text-white" : "hover:bg-black/[0.055] dark:hover:bg-white/[0.07]"}`}>{children}</button>
}
