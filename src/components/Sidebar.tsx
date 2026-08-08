import {
  Bell,
  ChevronDown,
  CircleHelp,
  FileText,
  FolderClosed,
  Search,
  Settings,
  SquarePen,
} from "lucide-react"
import { useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useFeaturePreferences } from "../contexts/FeaturePreferencesContext"
import { useLogUI } from "../contexts/LogContext"
import { usePersistentState } from "../hooks/usePersistentState"
import { useFeatures } from "../hooks/useFeatures"
import { cn } from "../lib/utils"
import { Tooltip } from "./ui/base-ui"

export type ToolId = "home" | "encoder" | "crypto" | "classical" | "formatters" | "generators" | "converter" | "others" | "logManagement" | "settings"

interface SidebarProps {
  activeTool: ToolId
  activeTab?: string
  onToolChange: (id: ToolId) => void
  onNavigate: (toolId: ToolId, tabId?: string) => void
}

const groupOrder: ToolId[] = ["encoder", "crypto", "classical", "formatters", "generators", "converter", "others"]

export function Sidebar({ activeTool, activeTab, onToolChange, onNavigate }: SidebarProps) {
  const { t } = useTranslation()
  const [isCollapsed, setIsCollapsed] = usePersistentState<boolean>("sidebar-collapsed", false)
  const [expandedGroups, setExpandedGroups] = usePersistentState<Record<string, boolean>>("sidebar-expanded-groups", {
    encoder: true,
    crypto: true,
  })
  const features = useFeatures()
  const { getPreference } = useFeaturePreferences()
  const { togglePanel } = useLogUI()

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

  return (
    <aside className={cn(
      "relative h-full shrink-0 overflow-hidden bg-[#f3f3f3] transition-[width] duration-200 dark:bg-[#202020]",
      isCollapsed ? "w-0" : "w-[clamp(250px,18.65vw,382px)]",
    )}>
      <div className="flex h-full w-[clamp(250px,18.65vw,382px)] flex-col">
        <div className="flex h-[74px] shrink-0 items-center justify-between px-4">
          <button type="button" className="flex min-w-0 items-center gap-2 rounded-lg px-1.5 py-2 hover:bg-black/[0.045] dark:hover:bg-white/[0.06]" onClick={() => onToolChange("home")}>
            <img src="/t_bgw.svg" alt="TroveKit" className="h-7 w-7 shrink-0" />
            <span className="truncate text-[17px] font-semibold tracking-[-0.02em]">TroveKit</span>
            <ChevronDown className="h-3.5 w-3.5 text-default-400" />
          </button>
          <div className="flex items-center gap-0.5">
            <SidebarIcon label={t("common.search", "搜索")} onClick={() => window.dispatchEvent(new Event("trovekit:open-search"))}><Search className="h-[18px] w-[18px]" /></SidebarIcon>
            <SidebarIcon label={t("log.toggle", "日志")} onClick={togglePanel}><Bell className="h-[18px] w-[18px]" /></SidebarIcon>
          </div>
        </div>

        <div className="border-b border-black/[0.055] px-3 pb-3 dark:border-white/[0.07]">
          <button
            type="button"
            className={cn(
              "flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-[14px] transition-colors hover:bg-black/[0.045] dark:hover:bg-white/[0.06]",
              activeTool === "home" && "bg-black/[0.055] dark:bg-white/[0.08]",
            )}
            onClick={() => onToolChange("home")}
          >
            <SquarePen className="h-[18px] w-[18px] text-default-600" />
            <span>{t("nav.home")}</span>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-hide" aria-label="Tools">
          <div className="space-y-4">
            {groups.map(group => {
              const expanded = expandedGroups[group.id] ?? false
              const activeGroup = activeTool === group.id
              return (
                <section key={group.id}>
                  <button
                    type="button"
                    className="group flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-[14px] text-default-600 hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
                    onClick={() => setExpandedGroups(current => ({ ...current, [group.id]: !current[group.id] }))}
                    aria-expanded={expanded}
                  >
                    <FolderClosed className="h-[17px] w-[17px] shrink-0" />
                    <span className="min-w-0 flex-1 truncate font-medium">{group.label}</span>
                    <ChevronDown className={cn("h-3.5 w-3.5 text-default-400 transition-transform", !expanded && "-rotate-90")} />
                  </button>

                  {expanded && (
                    <div className="mt-1 space-y-0.5 pl-6">
                      {group.children.map((child, index) => {
                        const active = activeGroup && (activeTab === child.tabId || (!activeTab && index === 0))
                        return (
                          <button
                            key={child.id}
                            type="button"
                            className={cn(
                              "flex min-h-9 w-full items-center rounded-xl px-3 py-1.5 text-left text-[14px] leading-5 text-default-600 transition-colors hover:bg-black/[0.045] hover:text-foreground dark:hover:bg-white/[0.06]",
                              active && "bg-black/[0.06] font-medium text-foreground dark:bg-white/[0.09]",
                            )}
                            onClick={() => onNavigate(group.id, child.tabId)}
                          >
                            <span className="truncate">{child.label}</span>
                          </button>
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
          <div className="mt-2 flex items-center gap-3 px-2 py-1.5 text-default-500">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-[9px] font-semibold text-white">TK</div>
            <span className="flex-1 text-[13px]">TroveKit</span>
            <CircleHelp className="h-[17px] w-[17px]" />
          </div>
        </div>
      </div>
    </aside>
  )
}

function SidebarIcon({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return <Tooltip content={label}><button type="button" aria-label={label} onClick={onClick} className="flex h-8 w-8 items-center justify-center rounded-lg text-default-500 hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.07]">{children}</button></Tooltip>
}

function BottomAction({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={cn("flex h-9 w-full items-center gap-3 rounded-xl px-3 text-[13px] text-default-600 hover:bg-black/[0.045] dark:hover:bg-white/[0.06]", active && "bg-black/[0.06] text-foreground dark:bg-white/[0.09]")}>{icon}<span className="truncate">{label}</span></button>
}
