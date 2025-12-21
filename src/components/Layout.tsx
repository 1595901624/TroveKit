import React from "react"
import { Sidebar, ToolId } from "./Sidebar"
import TitleBar from "./TitleBar"
import { ThemeToggle } from "./ThemeToggle"

interface LayoutProps {
  children: React.ReactNode
  activeTool: ToolId
  onToolChange: (id: ToolId) => void
  title: string
}

export function Layout({ children, activeTool, onToolChange, title }: LayoutProps) {
  return (
    <div className="h-screen w-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Global TitleBar (Window Controls) */}
      <TitleBar />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <Sidebar activeTool={activeTool} onToolChange={onToolChange} />
        
        {/* Main Content Area */}
        <main className="flex-1 flex flex-col relative overflow-hidden bg-content1/20">
          {/* Tool Header */}
          <header className="h-14 border-b border-divider flex items-center justify-between px-6 shrink-0 bg-background/60 backdrop-blur-md">
            <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
            <div className="flex gap-2 items-center">
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
      </div>
    </div>
  )
}
