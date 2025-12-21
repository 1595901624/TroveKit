import React, { createContext, useContext, useState, useCallback } from "react"

// This context provides logging functionality throughout the app.
// example：
//   1 import { useLog } from "../contexts/LogContext";
//   2 
//   3 export function MyComponent() {
//   4   const { addLog } = useLog();
//   4   const { addLog } = useLog();
//   5
//   5
//   6   const handleAction = () => {
//   7     // ... perform action ...
//   8     addLog("123456 --MD5--> e10adc3949ba59abbe56e057f20f883e", "success");
//   9   };
//  10
//  10
//  11   // ...
//  12 }

export interface LogEntry {
  id: string
  timestamp: number
  message: string
  details?: string
  type: "info" | "success" | "error" | "warning"
}

interface LogContextType {
  logs: LogEntry[]
  addLog: (message: string, type?: LogEntry["type"], details?: string) => void
  clearLogs: () => void
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  togglePanel: () => void
}

const LogContext = createContext<LogContextType | undefined>(undefined)

export function LogProvider({ children }: { children: React.ReactNode }) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isOpen, setIsOpen] = useState(false)

  const addLog = useCallback((message: string, type: LogEntry["type"] = "info", details?: string) => {
    setLogs((prev) => [
      {
        id: Math.random().toString(36).substring(7),
        timestamp: Date.now(),
        message,
        details,
        type,
      },
      ...prev,
    ])
    // Auto open on error or success if needed, but maybe not forced.
    if (type === 'error' || type === 'success') {
      setIsOpen(true)
    }
  }, [])

  const clearLogs = useCallback(() => {
    setLogs([])
  }, [])

  const togglePanel = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  return (
    <LogContext.Provider value={{ logs, addLog, clearLogs, isOpen, setIsOpen, togglePanel }}>
      {children}
    </LogContext.Provider>
  )
}

export function useLog() {
  const context = useContext(LogContext)
  if (context === undefined) {
    throw new Error("useLog must be used within a LogProvider")
  }
  return context
}
