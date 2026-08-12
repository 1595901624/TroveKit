import React, { useState } from "react"
import { Sidebar, ToolId } from "./Sidebar"
import TitleBar from "./TitleBar"
import { ThemeToggle } from "./ThemeToggle"
import { LogPanel } from "./LogPanel"
import { useLogUI } from "../contexts/LogContext"
import { Button, Tooltip } from "../components/ui/base-ui"
import { Terminal } from "lucide-react"
import { useTranslation } from "react-i18next"
import { detectDesktopPlatform } from "../lib/platform"
import { usePersistentState } from "../hooks/usePersistentState"

interface LayoutProps {
  children: React.ReactNode
  activeTool: ToolId
  activeTab?: string
  onToolChange: (id: ToolId) => void
  onNavigate: (toolId: ToolId, tabId?: string) => void
  title: string
}

export function Layout({ children, activeTool, activeTab, onToolChange, onNavigate, title }: LayoutProps) {
  const { togglePanel, isOpen } = useLogUI()
  const { t } = useTranslation()
  const [isMacOS] = useState(() => detectDesktopPlatform() === "macos")
  const [isSidebarCollapsed, setIsSidebarCollapsed] = usePersistentState<boolean>("sidebar-collapsed", false)
  const toggleSidebar = () => setIsSidebarCollapsed((collapsed) => !collapsed)
  const isLogPanelVisible = isOpen && activeTool !== "logManagement"

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-chrome text-foreground">
      {/* Global TitleBar (Window Controls) */}
      <TitleBar onNavigate={onNavigate} onToggleSidebar={toggleSidebar} />
      
      <div
        className="relative flex flex-1 overflow-hidden"
      >
        {/* Sidebar Navigation */}
        <Sidebar macOSOverlay={isMacOS} isCollapsed={isSidebarCollapsed} activeTool={activeTool} activeTab={activeTab} onToolChange={onToolChange} onNavigate={onNavigate} />
        
        {/* Main Content Area */}
        <main className={`relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-tl-[8px] border-l border-t border-default-200/80 bg-background shadow-[-2px_-1px_10px_rgba(0,0,0,0.025)] ${isLogPanelVisible ? "" : "rounded-tr-[8px]"}`}>
          {/* Tool Header */}
          <header
            data-tauri-drag-region={isMacOS ? true : undefined}
            className={`flex h-[var(--titlebar-height)] shrink-0 items-center justify-between border-b border-divider/80 transition-[padding] duration-200 ${isMacOS && isSidebarCollapsed ? "pl-[132px] pr-4" : "px-4"}`}
          >
            <div className="min-w-0">
              <h1 className="truncate text-[13px] font-medium tracking-[-0.01em]">{title}</h1>
            </div>
            <div className="flex items-center gap-1.5">
              {activeTool !== "logManagement" && (
                <Tooltip content={t('log.toggle', 'Toggle Logs')}>
                  <Button isIconOnly size="sm" variant="light" className="h-8 w-8 min-w-8 rounded-md text-default-500 hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.07]" onPress={togglePanel} aria-label={t('log.toggle', 'Toggle Logs')}>
                    <Terminal className="h-[15px] w-[15px]" />
                  </Button>
                </Tooltip>
              )}
              <ThemeToggle compact radius="md" className="h-8 w-8 min-w-8 text-default-500 hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.07]" />
            </div>
          </header>
          
          {/* Scrollable Tool Content */}
          <div className="tool-content-container flex-1 overflow-auto scrollbar-hide">
             <div className="mx-auto h-full w-full max-w-6xl px-7 py-6">
                {children}
             </div>
          </div>
        </main>

        {activeTool !== "logManagement" && <LogPanel />}
      </div>
    </div>
  )
}
