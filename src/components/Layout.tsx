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
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#f3f3f3] text-foreground dark:bg-[#202020]">
      {/* Global TitleBar (Window Controls) */}
      <TitleBar onNavigate={onNavigate} />
      
      <div
        className="relative flex flex-1 overflow-hidden"
        // 为覆盖式 LogPanel 预留空间：避免遮挡主内容。
        // 注意：这里是一次性 resize（开/关时各一次），不会像 width 动画那样每帧触发布局重排。
        style={{ paddingRight: isOpen ? 320 : 0 }}
      >
        {/* Sidebar Navigation */}
        <Sidebar activeTool={activeTool} activeTab={activeTab} onToolChange={onToolChange} onNavigate={onNavigate} />
        
        {/* Main Content Area */}
        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-tl-[12px] rounded-tr-[12px] border-l border-t border-default-200/80 bg-background shadow-[-2px_-1px_10px_rgba(0,0,0,0.025)]">
          {/* Tool Header */}
          <header className="flex h-[45px] shrink-0 items-center justify-between border-b border-divider/80 px-4">
            <div className="min-w-0">
              <h1 className="truncate text-[13px] font-medium tracking-[-0.01em]">{title}</h1>
            </div>
            <div className="flex items-center gap-1.5">
              <Tooltip content={t('log.toggle', 'Toggle Logs')}>
                <Button isIconOnly variant="bordered" radius="full" className="h-7 w-7 min-w-7 border-default-200 bg-background shadow-sm" onPress={togglePanel} aria-label={t('log.toggle', 'Toggle Logs')}>
                  <Terminal className="h-3.5 w-3.5 text-default-500" />
                </Button>
              </Tooltip>
              <ThemeToggle variant="bordered" className="h-7 w-7 min-w-7 border-default-200 bg-background shadow-sm" />
            </div>
          </header>
          
          {/* Scrollable Tool Content */}
          <div className="flex-1 overflow-auto scrollbar-hide">
             <div className="mx-auto h-full w-full max-w-6xl px-7 py-6">
                {children}
             </div>
          </div>
        </main>

        <LogPanel />
      </div>
    </div>
  )
}
