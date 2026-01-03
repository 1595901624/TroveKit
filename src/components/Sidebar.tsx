import {
  Home,
  Binary,
  Lock,
  FileJson,
  FileText,
  Wand2,
  Settings,
  Shield,
} from "lucide-react"
import { Button } from "@heroui/react"
import { cn } from "../lib/utils"
import { useTranslation } from "react-i18next"
import { useState, useEffect } from "react"
import { getVersion } from "@tauri-apps/api/app"

export type ToolId = "home" | "encoder" | "crypto" | "classical" | "formatters" | "generators" | "logManagement" | "settings"

interface SidebarProps {
  activeTool: ToolId
  onToolChange: (id: ToolId) => void
}

export function Sidebar({ activeTool, onToolChange }: SidebarProps) {
  const { t } = useTranslation()
  const [version, setVersion] = useState("v0.1.0")

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
    { id: "logManagement", label: t("nav.logManagement", "日志管理"), icon: FileText },
  ] as const

  return (
    <div className="w-52 h-full flex flex-col border-r border-divider bg-background/50 backdrop-blur-md">
      <div className="p-4 flex items-center gap-2">
        {/* <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
          T
        </div> */}
        {/* 添加svg */}
        <img src="/t_bgw.svg" alt="TroveKit Logo" className="w-7 h-7" />
        <span className="font-bold text-lg tracking-tight text-foreground">TroveKit</span>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <Button
            key={item.id}
            variant={activeTool === item.id ? "flat" : "light"}
            color={activeTool === item.id ? "primary" : "default"}
            className={cn(
              "w-full justify-start h-10 text-sm font-medium",
              activeTool === item.id ? "bg-primary/10 text-primary" : "text-default-500 hover:text-foreground"
            )}
            startContent={<item.icon className={cn("w-4 h-4", activeTool === item.id ? "text-primary" : "text-default-400")} />}
            onPress={() => onToolChange(item.id as ToolId)}
          >
            {item.label}
          </Button>
        ))}
      </nav>

      <div className="p-3 border-t border-divider flex items-center justify-center relative px-4">
        <Button
          isIconOnly
          size="sm"
          variant={activeTool === "settings" ? "flat" : "light"}
          color={activeTool === "settings" ? "primary" : "default"}
          className="w-7 h-7 min-w-7 absolute left-3"
          onPress={() => onToolChange("settings")}
        >
          <Settings className={cn("w-3.5 h-3.5", activeTool === "settings" ? "text-primary" : "text-default-400")} />
        </Button>
        <div className="text-xs text-default-400">
          v{version}
        </div>
      </div>
    </div>
  )
}
