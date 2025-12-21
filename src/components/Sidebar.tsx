import { 
  Home, 
  Binary, 
  Lock, 
  FileJson, 
  Wand2, 
  Settings,
} from "lucide-react"
import { Button } from "@heroui/react"
import { cn } from "../lib/utils"
import { useTranslation } from "react-i18next"

export type ToolId = "home" | "encoder" | "crypto" | "formatters" | "generators" | "settings"

interface SidebarProps {
  activeTool: ToolId
  onToolChange: (id: ToolId) => void
}

export function Sidebar({ activeTool, onToolChange }: SidebarProps) {
  const { t } = useTranslation()
  
  const menuItems = [
    { id: "home", label: t("nav.home"), icon: Home },
    { id: "encoder", label: t("nav.encoder"), icon: Binary },
    { id: "crypto", label: t("nav.crypto"), icon: Lock },
    { id: "formatters", label: t("nav.formatters"), icon: FileJson },
    { id: "generators", label: t("nav.generators"), icon: Wand2 },
    { id: "settings", label: t("nav.settings"), icon: Settings },
  ] as const

  return (
    <div className="w-64 h-full flex flex-col border-r border-divider bg-background/50 backdrop-blur-md">
      <div className="p-6 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
          T
        </div>
        <span className="font-bold text-xl tracking-tight text-foreground">TroveKit</span>
      </div>

      <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <Button
            key={item.id}
            variant={activeTool === item.id ? "flat" : "light"}
            color={activeTool === item.id ? "primary" : "default"}
            className={cn(
              "w-full justify-start h-12 text-md font-medium",
              activeTool === item.id ? "bg-primary/10 text-primary" : "text-default-500 hover:text-foreground"
            )}
            startContent={<item.icon className={cn("w-5 h-5", activeTool === item.id ? "text-primary" : "text-default-400")} />}
            onPress={() => onToolChange(item.id as ToolId)}
          >
            {item.label}
          </Button>
        ))}
      </nav>

      <div className="p-4 border-t border-divider">
        <div className="text-xs text-default-400 text-center">
          v0.1.0 • Tauri Beta
        </div>
      </div>
    </div>
  )
}
