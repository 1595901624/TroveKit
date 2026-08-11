import {
  Bell,
  ChevronDown,
  FileText,
  House,
  Search,
  Settings,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useFeaturePreferences } from "../contexts/FeaturePreferencesContext"
import { useLogUI } from "../contexts/LogContext"
import { usePersistentState } from "../hooks/usePersistentState"
import { useFeatures } from "../hooks/useFeatures"
import { cn } from "../lib/utils"
import { Button, Tooltip } from "./ui/base-ui"

export type ToolId = "home" | "encoder" | "crypto" | "classical" | "formatters" | "generators" | "converter" | "others" | "logManagement" | "settings"

interface SidebarProps {
  activeTool: ToolId
  activeTab?: string
  onToolChange: (id: ToolId) => void
  onNavigate: (toolId: ToolId, tabId?: string) => void
}

const groupOrder: ToolId[] = ["encoder", "crypto", "classical", "formatters", "generators", "converter", "others"]
const SIDEBAR_MIN_WIDTH = 240
const SIDEBAR_MAX_WIDTH = 480
const SIDEBAR_DEFAULT_WIDTH = 280

const clampSidebarWidth = (width: number) => Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, width))

export function Sidebar({ activeTool, activeTab, onToolChange, onNavigate }: SidebarProps) {
  const { t } = useTranslation()
  const [isCollapsed, setIsCollapsed] = usePersistentState<boolean>("sidebar-collapsed", false)
  const [storedWidth, setStoredWidth, , isStoredWidthLoaded] = usePersistentState<number>("sidebar-width", SIDEBAR_DEFAULT_WIDTH)
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH)
  const [isResizing, setIsResizing] = useState(false)
  const sidebarWidthRef = useRef(SIDEBAR_DEFAULT_WIDTH)
  const [expandedGroups, setExpandedGroups] = usePersistentState<Record<string, boolean>>("sidebar-expanded-groups", {
    encoder: true,
    crypto: true,
  })
  const features = useFeatures()
  const { getPreference } = useFeaturePreferences()
  const { togglePanel } = useLogUI()

  const updateSidebarWidth = (width: number) => {
    const nextWidth = clampSidebarWidth(width)
    sidebarWidthRef.current = nextWidth
    setSidebarWidth(nextWidth)
  }

  useEffect(() => {
    if (isStoredWidthLoaded) {
      updateSidebarWidth(typeof storedWidth === "number" && Number.isFinite(storedWidth) ? storedWidth : SIDEBAR_DEFAULT_WIDTH)
    }
  }, [isStoredWidthLoaded, storedWidth])

  useEffect(() => () => {
    document.body.style.cursor = ""
    document.body.style.userSelect = ""
  }, [])

  const groups = useMemo(() => groupOrder.map(id => {
    const topLevel = features.find(feature => feature.toolId === id && !feature.tabId)
    const children = features.filter(feature => feature.toolId === id && feature.tabId && getPreference(feature.id).visible)
    return {
      id,
      label: topLevel?.label ?? id,
      children,
      visible: (!topLevel || getPreference(topLevel.id).visible) && children.length > 0,
    }
  }).filter(group => group.visible), [features, getPreference])

  useEffect(() => {
    const toggleSidebar = () => setIsCollapsed(current => !current)
    window.addEventListener("trovekit:toggle-sidebar", toggleSidebar)
    return () => window.removeEventListener("trovekit:toggle-sidebar", toggleSidebar)
  }, [setIsCollapsed])

  const getWidthFromPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const sidebarLeft = event.currentTarget.parentElement?.getBoundingClientRect().left ?? 0
    return event.clientX - sidebarLeft
  }

  const startResize = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isCollapsed) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
    setIsResizing(true)
    updateSidebarWidth(getWidthFromPointer(event))
  }

  const resize = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isResizing) updateSidebarWidth(getWidthFromPointer(event))
  }

  const finishResize = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isResizing) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    document.body.style.cursor = ""
    document.body.style.userSelect = ""
    setIsResizing(false)
    setStoredWidth(sidebarWidthRef.current)
    window.dispatchEvent(new Event("resize"))
  }

  const resizeWithKeyboard = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
    event.preventDefault()
    const direction = event.key === "ArrowRight" ? 1 : -1
    const step = event.shiftKey ? 40 : 10
    const nextWidth = clampSidebarWidth(sidebarWidthRef.current + direction * step)
    updateSidebarWidth(nextWidth)
    setStoredWidth(nextWidth)
    window.dispatchEvent(new Event("resize"))
  }

  return (
    <aside className={cn(
      "relative h-full shrink-0 overflow-hidden bg-[#f3f3f3] dark:bg-[#202020]",
      !isResizing && "transition-[width] duration-200",
    )} style={{ width: isCollapsed ? 0 : sidebarWidth }}>
      <div className="flex h-full flex-col" style={{ width: sidebarWidth }}>
        <div className="flex h-[45px] shrink-0 items-center gap-0.5 border-b border-black/[0.055] px-2 dark:border-white/[0.07]">
          <Button
            variant="light"
            className={cn(
              "h-8 min-w-0 flex-1 justify-start gap-2.5 rounded-lg px-2 text-left text-[13px] hover:bg-black/[0.045] dark:hover:bg-white/[0.06]",
              activeTool === "home" && "bg-black/[0.055] dark:bg-white/[0.08]",
            )}
            onPress={() => onToolChange("home")}
          >
            <House className="h-[15px] w-[15px] text-default-600" />
            <span>{t("nav.home")}</span>
          </Button>
          <div className="flex shrink-0 items-center gap-0.5">
            <SidebarIcon label={t("common.search", "搜索")} onClick={() => window.dispatchEvent(new Event("trovekit:open-search"))}><Search className="h-[15px] w-[15px]" /></SidebarIcon>
            <SidebarIcon label={t("log.toggle", "日志")} onClick={togglePanel}><Bell className="h-[15px] w-[15px]" /></SidebarIcon>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-hide" aria-label="Tools">
          <div className="space-y-4">
            {groups.map(group => {
              const expanded = expandedGroups[group.id] ?? false
              const activeGroup = activeTool === group.id
              return (
                <section key={group.id}>
                  <Button
                    variant="light"
                    className="group flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-[14px] text-default-600 hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
                    onPress={() => setExpandedGroups(current => ({ ...current, [group.id]: !current[group.id] }))}
                    aria-expanded={expanded}
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">{group.label}</span>
                    <ChevronDown className={cn("h-3.5 w-3.5 text-default-400 transition-transform", !expanded && "-rotate-90")} />
                  </Button>

                  {expanded && (
                    <div className="mt-1 space-y-0.5 pl-6">
                      {group.children.map((child, index) => {
                        const active = activeGroup && (activeTab === child.tabId || (!activeTab && index === 0))
                        return (
                          <Button
                            key={child.id}
                            variant="light"
                            className={cn(
                              "flex min-h-9 w-full items-center rounded-xl px-3 py-1.5 text-left text-[14px] leading-5 text-default-600 transition-colors hover:bg-black/[0.045] hover:text-foreground dark:hover:bg-white/[0.06]",
                              active && "bg-black/[0.06] font-medium text-foreground dark:bg-white/[0.09]",
                            )}
                            onPress={() => onNavigate(group.id, child.tabId)}
                          >
                            <span className="truncate">{child.label}</span>
                          </Button>
                        )
                      })}
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        </nav>

        <div className="shrink-0 border-t border-black/[0.055] px-3 py-3 dark:border-white/[0.07]">
          <BottomAction active={activeTool === "logManagement"} icon={<FileText className="h-[17px] w-[17px]" />} label={t("nav.logManagement", "日志管理")} onClick={() => onToolChange("logManagement")} />
          <BottomAction active={activeTool === "settings"} icon={<Settings className="h-[17px] w-[17px]" />} label={t("nav.settings")} onClick={() => onToolChange("settings")} />
        </div>
      </div>

      {!isCollapsed && (
        <div
          className="group absolute inset-y-0 right-0 z-20 w-2 cursor-col-resize touch-none outline-none"
          role="separator"
          aria-label={t("common.resizeSidebar", "调整侧栏宽度")}
          aria-orientation="vertical"
          aria-valuemin={SIDEBAR_MIN_WIDTH}
          aria-valuemax={SIDEBAR_MAX_WIDTH}
          aria-valuenow={Math.round(sidebarWidth)}
          tabIndex={0}
          onPointerDown={startResize}
          onPointerMove={resize}
          onPointerUp={finishResize}
          onPointerCancel={finishResize}
          onKeyDown={resizeWithKeyboard}
        >
          <div className={cn(
            "absolute inset-y-0 right-0 w-px bg-transparent transition-colors group-hover:bg-primary/50 group-focus-visible:bg-primary/70",
            isResizing && "bg-primary/70",
          )} />
        </div>
      )}
    </aside>
  )
}

function SidebarIcon({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return <Tooltip content={label}><Button isIconOnly size="sm" variant="light" aria-label={label} onPress={onClick} className="h-8 w-8 min-w-8 text-default-500 hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.07]">{children}</Button></Tooltip>
}

function BottomAction({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return <Button variant="light" onPress={onClick} className={cn("h-9 w-full justify-start gap-3 rounded-xl px-3 text-[13px] text-default-600 hover:bg-black/[0.045] dark:hover:bg-white/[0.06]", active && "bg-black/[0.06] text-foreground dark:bg-white/[0.09]")}>{icon}<span className="truncate">{label}</span></Button>
}
