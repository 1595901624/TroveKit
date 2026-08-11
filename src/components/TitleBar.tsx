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
import { detectDesktopPlatform, detectHostPlatform, DesktopPlatform } from "../lib/platform"
import { CommandMenu } from "./CommandMenu"
import { ToolId } from "./Sidebar"
import { Button } from "./ui/base-ui"

interface TitleBarProps {
  onNavigate?: (toolId: ToolId, tabId?: string) => void
  onToggleSidebar: () => void
}

export default function TitleBar({ onNavigate, onToggleSidebar }: TitleBarProps) {
  const { t } = useTranslation()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const [platform] = useState<DesktopPlatform>(detectDesktopPlatform)
  const [hostPlatform] = useState<DesktopPlatform>(detectHostPlatform)
  const [appWindow] = useState(() =>
    typeof window !== "undefined" && "__TAURI_INTERNALS__" in window ? getCurrentWindow() : null,
  )

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

  useEffect(() => {
    if (!appWindow) return

    const updateMaximized = async () => setIsMaximized(await appWindow.isMaximized())
    void updateMaximized()
    const unlisten = appWindow.onResized(updateMaximized)
    return () => {
      void unlisten.then((stopListening) => stopListening())
    }
  }, [appWindow])

  const toggleMaximize = async () => {
    if (!appWindow) return
    await appWindow.toggleMaximize()
    setIsMaximized(await appWindow.isMaximized())
  }

  return (
    <>
      <CommandMenu
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={(toolId, tabId) => onNavigate?.(toolId, tabId)}
      />

      {platform === "macos" ? (
        // The native overlay titlebar supplies the traffic lights. This small
        // overlay keeps the sidebar toggle available without adding a title row.
        <div data-tauri-drag-region className="absolute left-0 top-0 z-50 flex h-10 w-[124px] select-none items-center pl-[76px] text-[#5f5f5f] dark:text-default-400">
          {hostPlatform !== "macos" && (
            <MacPreviewWindowControls
              onClose={() => appWindow?.close()}
              onMinimize={() => appWindow?.minimize()}
              onMaximize={toggleMaximize}
            />
          )}
          <TitleButton label={t("common.sidebar", "侧栏")} onClick={onToggleSidebar}>
            <PanelLeft className="h-[15px] w-[15px]" />
          </TitleButton>
        </div>
      ) : (
        <div data-tauri-drag-region className="flex h-[var(--titlebar-height)] shrink-0 select-none items-center bg-[#f3f3f3] text-[#5f5f5f] dark:bg-[#202020] dark:text-default-400">
          <div className="flex h-full items-center gap-0.5 px-2">
            <TitleButton label={t("common.sidebar", "侧栏")} onClick={onToggleSidebar}>
              <PanelLeft className="h-[17px] w-[17px]" />
            </TitleButton>
            <TitleButton label={t("common.back", "返回")} disabled><ArrowLeft className="h-[17px] w-[17px]" /></TitleButton>
            <TitleButton label={t("common.forward", "前进")} disabled><ArrowRight className="h-[17px] w-[17px]" /></TitleButton>
          </div>

          <div className="flex h-full items-center gap-0.5 text-[13px]" data-tauri-drag-region>
            {[t("menu.file", "文件"), t("menu.edit", "编辑"), t("menu.view", "视图"), t("menu.help", "帮助")].map((label) => (
              <Button key={label} variant="light" className="h-auto min-w-0 rounded-md px-3 py-1.5 text-[13px] hover:bg-black/[0.055] dark:hover:bg-white/[0.07]">{label}</Button>
            ))}
          </div>

          <div className="flex-1" data-tauri-drag-region />

          <Button
            variant="light"
            className="mr-2 flex h-7 items-center gap-2 rounded-xl border border-black/[0.06] bg-white/70 px-3 text-[11px] text-[#666] shadow-sm hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-default-400"
            onPress={() => setIsSearchOpen(true)}
          >
            <Search className="h-3.5 w-3.5" />
            <span>{t("common.search", "搜索")}</span>
            <span className="rounded border border-black/10 px-1 font-mono text-[9px] dark:border-white/10">Ctrl K</span>
            <ChevronDown className="h-3 w-3" />
          </Button>

          <div className={platform === "linux" ? "flex h-full items-center gap-1 pr-2" : "flex h-full items-stretch"}>
            <WindowButton platform={platform} label={t("window.minimize", "最小化")} onClick={() => appWindow?.minimize()}><Minus className="h-4 w-4" /></WindowButton>
            <WindowButton platform={platform} label={t("window.maximize", "最大化")} onClick={toggleMaximize}>{isMaximized ? <Copy className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}</WindowButton>
            <WindowButton platform={platform} label={t("window.close", "关闭")} danger onClick={() => appWindow?.close()}><X className="h-4 w-4" /></WindowButton>
          </div>
        </div>
      )}
    </>
  )
}

function TitleButton({ children, label, onClick, disabled }: { children: React.ReactNode; label: string; onClick?: () => void; disabled?: boolean }) {
  return <Button isIconOnly size="sm" variant="light" title={label} aria-label={label} isDisabled={disabled} onPress={onClick} className="w-9 min-w-9 rounded-md hover:bg-black/[0.055] disabled:opacity-35 dark:hover:bg-white/[0.07]">{children}</Button>
}

function WindowButton({ children, label, onClick, danger, platform }: { children: React.ReactNode; label: string; onClick: () => void; danger?: boolean; platform: Exclude<DesktopPlatform, "macos"> }) {
  const shape = platform === "linux" ? "h-8 w-8 min-w-8 rounded-lg" : "h-full w-11 min-w-11 rounded-none"
  return <Button isIconOnly variant="light" title={label} aria-label={label} onPress={onClick} className={`${shape} ${danger ? "hover:bg-red-500 hover:text-white" : "hover:bg-black/[0.055] dark:hover:bg-white/[0.07]"}`}>{children}</Button>
}

function MacPreviewWindowControls({ onClose, onMinimize, onMaximize }: { onClose: () => void; onMinimize: () => void; onMaximize: () => void }) {
  return (
    <div className="group absolute left-[14px] top-[14px] flex items-center gap-2">
      <MacPreviewButton label="Close" color="bg-[#ff5f57] border-[#e0443e]" onClick={onClose} glyph="×" />
      <MacPreviewButton label="Minimize" color="bg-[#febc2e] border-[#dea123]" onClick={onMinimize} glyph="−" />
      <MacPreviewButton label="Maximize" color="bg-[#28c840] border-[#1aab29]" onClick={onMaximize} glyph="+" />
    </div>
  )
}

function MacPreviewButton({ label, color, glyph, onClick }: { label: string; color: string; glyph: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} title={`${label} (preview)`} onClick={onClick} className={`flex h-3 w-3 items-center justify-center rounded-full border ${color} text-[9px] font-bold leading-none text-black/55 active:brightness-90`}>
      <span className="opacity-0 transition-opacity group-hover:opacity-100">{glyph}</span>
    </button>
  )
}
