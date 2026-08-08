import React from "react"
import { Sidebar, ToolId } from "./Sidebar"
import TitleBar from "./TitleBar"
import { ThemeToggle } from "./ThemeToggle"
import { LogPanel } from "./LogPanel"
import { useLogUI } from "../contexts/LogContext"
import { Button, Tooltip } from "../components/ui/base-ui"
import { Terminal } from "lucide-react"
import { useTranslation } from "react-i18next"

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

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Global TitleBar (Window Controls) */}
      <TitleBar onNavigate={onNavigate} />
      
      <div
        className="flex-1 flex overflow-hidden relative"
        // 为覆盖式 LogPanel 预留空间：避免遮挡主内容。
        // 注意：这里是一次性 resize（开/关时各一次），不会像 width 动画那样每帧触发布局重排。
        style={{ paddingRight: isOpen ? 320 : 0 }}
      >
        {/* Sidebar Navigation */}
        <Sidebar activeTool={activeTool} activeTab={activeTab} onToolChange={onToolChange} onNavigate={onNavigate} />
        
        {/* Main Content Area */}
        <main className="flex-1 flex flex-col relative overflow-hidden bg-default-50/60">
          {/* Tool Header */}
          <header className="h-14 border-b border-divider flex items-center justify-between px-5 shrink-0 bg-background/80 backdrop-blur-md">
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold tracking-tight">{title}</h1>
              <p className="truncate text-[11px] text-default-400">TroveKit workspace</p>
            </div>
            <div className="flex gap-2 items-center">
              <Tooltip content={t('log.toggle', 'Toggle Logs')}>
                <Button isIconOnly variant={isOpen ? "flat" : "light"} radius="full" onPress={togglePanel}>
                  <Terminal className="w-[1.2rem] h-[1.2rem] text-default-500" />
                </Button>
              </Tooltip>
              <ThemeToggle />
            </div>
          </header>
          
          {/* Scrollable Tool Content */}
          <div className="flex-1 overflow-auto p-5 scrollbar-hide">
             <div className="max-w-6xl mx-auto h-full rounded-xl border border-default-200/70 bg-background p-5 shadow-sm">
                {children}
             </div>
          </div>
        </main>

        <LogPanel />
      </div>
    </div>
  )
}
