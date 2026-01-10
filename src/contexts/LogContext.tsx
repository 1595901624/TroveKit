import React, { createContext, useContext, useState, useCallback, useEffect } from "react"
import { useToast } from "./ToastContext"
import { invoke } from "@tauri-apps/api/core"

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
  message?: string
  method?: string
  input?: string
  output?: string
  details?: string
  note?: string
  type: "info" | "success" | "error" | "warning"
  // 可扩展加密参数（后续新增算法字段都放这里）
  cryptoParams?: Record<string, any>
  // 加密相关字段
  algorithm?: string
  mode?: string
  key_size?: string
  padding?: string
  format?: string
  iv?: string
  key_type?: string
}

export type LogContent = string | {
    method: string
    input: string
    output: string
  cryptoParams?: Record<string, any>
    algorithm?: string
    mode?: string
    key_size?: string
    padding?: string
    format?: string
    iv?: string
    key_type?: string
}

interface LogContextType {
  logs: LogEntry[]
  addLog: (content: LogContent, type?: LogEntry["type"], details?: string) => void
  clearLogs: () => void
  createNewLog: () => void
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  togglePanel: () => void
  addNote: (logId: string, note: string) => void
  removeNote: (logId: string) => void
}

const LogContext = createContext<LogContextType | undefined>(undefined)

export function LogProvider({ children }: { children: React.ReactNode }) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const { addToast } = useToast()

  // Load logs from backend on mount
  useEffect(() => {
    invoke<LogEntry[]>("load_logs")
      .then(setLogs)
      .catch(err => console.error("Failed to load logs:", err));
  }, []);

  const addLog = useCallback((content: LogContent, type: LogEntry["type"] = "info", details?: string) => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
      type,
      details,
    }

    if (typeof content === 'string') {
      newLog.message = content
    } else {
      newLog.method = content.method
      newLog.input = content.input
      newLog.output = content.output
      if (content.cryptoParams) newLog.cryptoParams = content.cryptoParams
      // 加密相关字段
      if (content.algorithm) newLog.algorithm = content.algorithm
      if (content.mode) newLog.mode = content.mode
      if (content.key_size) newLog.key_size = content.key_size
      if (content.padding) newLog.padding = content.padding
      if (content.format) newLog.format = content.format
      if (content.iv) newLog.iv = content.iv
      if (content.key_type) newLog.key_type = content.key_type
      // Generate a fallback message for compatibility or search
      newLog.message = `${content.method}: ${content.input} -> ${content.output}`
    }

    setLogs((prev) => [newLog, ...prev])
    
    // Persist to backend
    // invoke("append_log", { entry: newLog }).catch(err => console.error("Failed to save log:", err));
    
    // Show toast for errors
    if (type === 'error') {
      const message = typeof content === 'string' ? content : `${content.method} failed`;
      addToast(message, 'error');
    }
  }, [addToast])

  const clearLogs = useCallback(() => {
    setLogs([])
    invoke("clear_logs_file").catch(err => console.error("Failed to clear logs file:", err));
  }, [])

  const createNewLog = useCallback(() => {
    setLogs([]);
    invoke("start_new_log").then(() => {
      // addToast("New log session started", "success");
    }).catch(err => console.error("Failed to start new log:", err));
  }, [addToast]);

  const togglePanel = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  const addNote = useCallback((logId: string, note: string) => {
    setLogs((prev) =>
      prev.map((log) =>
        log.id === logId ? { ...log, note } : log
      )
    )
    
    // Persist to backend
    invoke("update_log_note", { logId, note }).catch(err => console.error("Failed to save note:", err))
  }, [])

  const removeNote = useCallback((logId: string) => {
    setLogs((prev) =>
      prev.map((log) =>
        log.id === logId ? { ...log, note: undefined } : log
      )
    )
    
    // Persist to backend
    invoke("remove_log_note", { logId }).catch(err => console.error("Failed to remove note:", err))
  }, [])

  return (
    <LogContext.Provider value={{ logs, addLog, clearLogs, createNewLog, isOpen, setIsOpen, togglePanel, addNote, removeNote }}>
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
