import React from "react"
import { Sidebar, ToolId } from "./Sidebar"
import TitleBar from "./TitleBar"
import { ThemeToggle } from "./ThemeToggle"
import { LogPanel } from "./LogPanel"
import { useLogUI } from "../contexts/LogContext"
import { Button, Tooltip } from "@heroui/react"
import { Terminal } from "lucide-react"
import { useTranslation } from "react-i18next"

interface LayoutProps {
  children: React.ReactNode
  activeTool: ToolId
  onToolChange: (id: ToolId) => void
  onNavigate: (toolId: ToolId, tabId?: string) => void
  title: string
}

export function Layout({ children, activeTool, onToolChange, onNavigate, title }: LayoutProps) {
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
        <Sidebar activeTool={activeTool} onToolChange={onToolChange} />
        
        {/* Main Content Area */}
        <main className="flex-1 flex flex-col relative overflow-hidden bg-content1/20">
          {/* Tool Header */}
          <header className="h-14 border-b border-divider flex items-center justify-between px-6 shrink-0 bg-background/60 backdrop-blur-md">
            <h1 className="text-base font-semibold tracking-tight">{title}</h1>
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
          <div className="flex-1 overflow-auto p-6 scrollbar-hide">
             <div className="max-w-5xl mx-auto h-full">
                {children}
             </div>
          </div>
        </main>

        <LogPanel />
      </div>
    </div>
  )
}
