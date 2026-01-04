import {
  Home,
  Binary,
  Lock,
  FileJson,
  FileText,
  Wand2,
  Settings,
  Shield,
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Button, Tooltip } from "@heroui/react"
import { cn } from "../lib/utils"
import { useTranslation } from "react-i18next"
import { useState, useEffect } from "react"
import { getVersion } from "@tauri-apps/api/app"

export type ToolId = "home" | "encoder" | "crypto" | "classical" | "formatters" | "generators" | "converter" | "logManagement" | "settings"

interface SidebarProps {
  activeTool: ToolId
  onToolChange: (id: ToolId) => void
}

export function Sidebar({ activeTool, onToolChange }: SidebarProps) {
  const { t } = useTranslation()
  const [version, setVersion] = useState("v0.1.0")
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    getVersion().then(setVersion).catch(() => setVersion("v0.1.0"))
  }, [])

  const menuItems = [
    { id: "home", label: t("nav.home"), icon: Home },
    { id: "encoder", label: t("nav.encoder"), icon: Binary },
    { id: "crypto", label: t("nav.crypto"), icon: Lock },
    { id: "classical", label: t("nav.classical"), icon: Shield },
    { id: "formatters", label: t("nav.formatters"), icon: FileJson },
    { id: "generators", label: t("nav.generators"), icon: Wand2 },
    { id: "converter", label: t("nav.converter", "转换器"), icon: ArrowRightLeft },
    { id: "logManagement", label: t("nav.logManagement", "日志管理"), icon: FileText },
  ] as const

  return (
    <div className={cn(
      "h-full flex flex-col border-r border-divider bg-background/50 backdrop-blur-md transition-all duration-300 ease-in-out relative",
      isCollapsed ? "w-16" : "w-52"
    )}>
      <div className={cn(
        "p-4 flex items-center gap-3 transition-all duration-300",
        isCollapsed ? "justify-center px-0" : "px-4"
      )}>
        <img src="/t_bgw.svg" alt="TroveKit Logo" className="w-7 h-7 min-w-7 shrink-0" />
        {!isCollapsed && (
          <span className="font-bold text-lg tracking-tight text-foreground whitespace-nowrap overflow-hidden transition-opacity duration-300">
            TroveKit
          </span>
        )}
      </div>

      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto scrollbar-hide">
        {menuItems.map((item) => {
          const isActive = activeTool === item.id
          const button = (
            <Button
              key={item.id}
              isIconOnly={isCollapsed}
              variant={isActive ? "flat" : "light"}
              color={isActive ? "primary" : "default"}
              className={cn(
                "w-full h-10 text-sm font-medium transition-all duration-200",
                isActive ? "bg-primary/10 text-primary" : "text-default-500 hover:text-foreground",
                isCollapsed ? "justify-center min-w-0" : "justify-start px-3"
              )}
              startContent={!isCollapsed && <item.icon className={cn("w-4 h-4 shrink-0", isActive ? "text-primary" : "text-default-400")} />}
              onPress={() => onToolChange(item.id as ToolId)}
            >
              {isCollapsed ? (
                <item.icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-default-400")} />
              ) : (
                <span className="whitespace-nowrap overflow-hidden text-ellipsis">{item.label}</span>
              )}
            </Button>
          )

          return isCollapsed ? (
            <Tooltip key={item.id} content={item.label} placement="right" delay={500}>
              {button}
            </Tooltip>
          ) : button
        })}
      </nav>

      <div className={cn(
        "p-3 border-t border-divider flex items-center transition-all duration-300",
        isCollapsed ? "justify-center" : "justify-between px-4"
      )}>
        <Tooltip content={t("nav.settings")} placement="right" isDisabled={!isCollapsed}>
          <Button
            isIconOnly
            size="sm"
            variant={activeTool === "settings" ? "flat" : "light"}
            color={activeTool === "settings" ? "primary" : "default"}
            className="w-8 h-8 min-w-8"
            onPress={() => onToolChange("settings")}
          >
            <Settings className={cn("w-4 h-4", activeTool === "settings" ? "text-primary" : "text-default-400")} />
          </Button>
        </Tooltip>
        
        {!isCollapsed && (
          <div className="text-[10px] text-default-400 font-mono opacity-60">
            {version}
          </div>
        )}
      </div>

      {/* Collapse Toggle Button */}
      <Button
        isIconOnly
        size="sm"
        variant="bordered"
        radius="full"
        className="absolute -right-3 top-20 w-6 h-6 min-w-6 bg-background border-divider shadow-sm z-50 hover:scale-110 transition-transform"
        onPress={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </Button>
    </div>
  )
}
