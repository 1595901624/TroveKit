import {
  ArrowRightLeft,
  Binary,
  ChevronRight,
  FileJson,
  FileText,
  Home,
  Lock,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Shield,
  Wand2,
} from "lucide-react"
import { useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useFeaturePreferences } from "../contexts/FeaturePreferencesContext"
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

const groupIcons = {
  encoder: Binary,
  crypto: Lock,
  classical: Shield,
  formatters: FileJson,
  generators: Wand2,
  converter: ArrowRightLeft,
  others: MoreHorizontal,
} as const

const groupOrder: Array<keyof typeof groupIcons> = [
  "encoder",
  "crypto",
  "classical",
  "formatters",
  "generators",
  "converter",
  "others",
]

export function Sidebar({ activeTool, activeTab, onToolChange, onNavigate }: SidebarProps) {
  const { t } = useTranslation()
  const [isCollapsed, setIsCollapsed] = usePersistentState<boolean>("sidebar-collapsed", false)
  const [expandedGroups, setExpandedGroups] = usePersistentState<Record<string, boolean>>("sidebar-expanded-groups", {
    encoder: true,
    crypto: true,
  })
  const features = useFeatures()
  const { getPreference } = useFeaturePreferences()

  const groups = useMemo(() => groupOrder.map(id => {
    const topLevel = features.find(feature => feature.toolId === id && !feature.tabId)
    const children = features.filter(feature => feature.toolId === id && feature.tabId && getPreference(feature.id).visible)
    return {
      id,
      label: topLevel?.label ?? id,
      icon: groupIcons[id],
      children,
      visible: (!topLevel || getPreference(topLevel.id).visible) && children.length > 0,
    }
  }).filter(group => group.visible), [features, getPreference])

  useEffect(() => {
    if (activeTool in groupIcons && !expandedGroups[activeTool]) {
      setExpandedGroups(current => ({ ...current, [activeTool]: true }))
    }
  }, [activeTool, expandedGroups, setExpandedGroups])

  const toggleGroup = (id: ToolId) => {
    setExpandedGroups(current => ({ ...current, [id]: !current[id] }))
  }

  return (
    <aside className={cn(
      "relative flex h-full shrink-0 flex-col border-r border-divider bg-default-50/90 transition-[width] duration-200",
      isCollapsed ? "w-14" : "w-64",
    )}>
      <div className={cn("flex h-14 items-center border-b border-divider px-3", isCollapsed ? "justify-center" : "justify-between")}>
        <button
          type="button"
          className={cn("flex min-w-0 items-center gap-2 rounded-lg p-1.5 hover:bg-default-100", isCollapsed && "justify-center")}
          onClick={() => onToolChange("home")}
        >
          <img src="/t_bgw.svg" alt="TroveKit" className="h-6 w-6 shrink-0" />
          {!isCollapsed && <span className="truncate text-sm font-semibold tracking-tight">TroveKit</span>}
        </button>
        {!isCollapsed && (
          <Button isIconOnly size="sm" variant="light" className="h-7 w-7 min-w-7 text-default-400" onPress={() => setIsCollapsed(true)} aria-label="Collapse sidebar">
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-2 scrollbar-hide" aria-label="Tools">
        <SidebarAction
          collapsed={isCollapsed}
          active={activeTool === "home"}
          icon={Home}
          label={t("nav.home")}
          onPress={() => onToolChange("home")}
        />

        <div className={cn("my-2 border-t border-divider", isCollapsed && "mx-1")} />

        <div className="space-y-0.5">
          {groups.map(group => {
            const Icon = group.icon
            const isActiveGroup = activeTool === group.id
            const isExpanded = expandedGroups[group.id] ?? false

            if (isCollapsed) {
              return (
                <Tooltip key={group.id} content={group.label} placement="right" delay={400}>
                  <button
                    type="button"
                    className={cn(
                      "flex h-9 w-full items-center justify-center rounded-lg text-default-500 transition-colors hover:bg-default-100 hover:text-foreground",
                      isActiveGroup && "bg-default-200 text-foreground",
                    )}
                    onClick={() => onNavigate(group.id, group.children[0]?.tabId)}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                </Tooltip>
              )
            }

            return (
              <div key={group.id}>
                <button
                  type="button"
                  className={cn(
                    "group flex h-9 w-full items-center gap-2 rounded-lg px-2 text-left text-sm text-default-600 transition-colors hover:bg-default-100 hover:text-foreground",
                    isActiveGroup && "text-foreground",
                  )}
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={isExpanded}
                >
                  <ChevronRight className={cn("h-3.5 w-3.5 shrink-0 text-default-400 transition-transform", isExpanded && "rotate-90")} />
                  <Icon className="h-4 w-4 shrink-0 text-default-500" />
                  <span className="min-w-0 flex-1 truncate font-medium">{group.label}</span>
                  <span className="text-[10px] tabular-nums text-default-400">{group.children.length}</span>
                </button>

                {isExpanded && (
                  <div className="relative ml-[15px] border-l border-default-200 py-0.5 pl-[13px]">
                    {group.children.map(child => {
                      const isActive = isActiveGroup && (activeTab === child.tabId || (!activeTab && child === group.children[0]))
                      return (
                        <button
                          key={child.id}
                          type="button"
                          className={cn(
                            "relative flex min-h-8 w-full items-center rounded-md px-2 py-1.5 text-left text-[13px] text-default-500 transition-colors hover:bg-default-100 hover:text-foreground",
                            isActive && "bg-default-200 font-medium text-foreground",
                          )}
                          onClick={() => onNavigate(group.id, child.tabId)}
                        >
                          {isActive && <span className="absolute -left-[14px] h-4 w-0.5 rounded-full bg-primary" />}
                          <span className="truncate">{child.label}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </nav>

      <div className="border-t border-divider p-2">
        <SidebarAction collapsed={isCollapsed} active={activeTool === "logManagement"} icon={FileText} label={t("nav.logManagement", "日志管理")} onPress={() => onToolChange("logManagement")} />
        <SidebarAction collapsed={isCollapsed} active={activeTool === "settings"} icon={Settings} label={t("nav.settings")} onPress={() => onToolChange("settings")} />
      </div>

      {isCollapsed && (
        <Button isIconOnly size="sm" variant="light" className="mx-auto mb-2 h-8 w-8 min-w-8 text-default-400" onPress={() => setIsCollapsed(false)} aria-label="Expand sidebar">
          <PanelLeftOpen className="h-4 w-4" />
        </Button>
      )}
    </aside>
  )
}

function SidebarAction({ collapsed, active, icon: Icon, label, onPress }: {
  collapsed: boolean
  active: boolean
  icon: typeof Home
  label: string
  onPress: () => void
}) {
  const content = (
    <button
      type="button"
      className={cn(
        "flex h-9 w-full items-center rounded-lg text-sm transition-colors hover:bg-default-100 hover:text-foreground",
        collapsed ? "justify-center" : "gap-2 px-2",
        active ? "bg-default-200 font-medium text-foreground" : "text-default-500",
      )}
      onClick={onPress}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  )

  return collapsed ? <Tooltip content={label} placement="right" delay={400}>{content}</Tooltip> : content
}
