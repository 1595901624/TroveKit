import React, { createContext, useContext, useState, useCallback, useEffect } from "react"
import { addToast } from "@heroui/react"
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
  /**
   * 可扩展加密参数对象，所有加密相关字段统一放在此处。
   * 支持的 key：
   * - algorithm: 加密算法 (如 "AES", "DES", "3DES", "SM4", "RSA", "SM2" 等)
   * - mode: 加密模式 (如 "CBC", "ECB", "CFB", "OFB", "CTR", "GCM" 等)
   * - key_size: 密钥长度 (如 "128", "192", "256", "512", "1024", "2048", "4096" 等)
   * - padding: 填充方式 (如 "PKCS7", "PKCS5", "ZeroPadding", "NoPadding", "ISO10126", "ANSIX923" 等)
   * - format: 输出格式 (如 "hex", "base64", "utf8" 等)
   * - iv: 初始向量 (Base64 或 Hex 编码的字符串)
   * - key: 加密密钥 (Base64 或 Hex 编码的字符串)
   * - key_type: 密钥类型 (如 "public", "private", "symmetric" 等)
   * - hash: 哈希算法 (如 "MD5", "SHA1", "SHA256", "SHA512", "SM3" 等)
   * - encoding: 编码方式 (如 "utf8", "gbk", "base64", "hex" 等)
   * - salt: 盐值
   * - iterations: 迭代次数 (用于 PBKDF2 等)
   * - tag_length: 认证标签长度 (用于 GCM 模式)
   */
  cryptoParams?: Record<string, any>
}

export type LogContent = string | {
    method: string
    input: string
    output: string
    cryptoParams?: Record<string, any>
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
  sessionNote: string
  updateSessionNote: (note: string) => Promise<void>
  removeSessionNote: () => Promise<void>
}

const LogContext = createContext<LogContextType | undefined>(undefined)

export function LogProvider({ children }: { children: React.ReactNode }) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [sessionNote, setSessionNote] = useState("")
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)

  // Load logs and session note from backend on mount
  useEffect(() => {
    invoke<LogEntry[]>("load_logs")
      .then(setLogs)
      .catch(err => console.error("Failed to load logs:", err));
    
    // Get current session info
    invoke<{ sessionId: string; note: string | null }>("get_current_session_info")
      .then((info) => {
        setCurrentSessionId(info.sessionId)
        setSessionNote(info.note || "")
      })
      .catch(err => console.error("Failed to get session info:", err));
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
      newLog.message = `${content.method}: ${content.input} -> ${content.output}`
    }

    setLogs((prev) => [newLog, ...prev])
    
    // Persist to backend
    invoke("append_log", { entry: newLog }).catch(err => console.error("Failed to save log:", err));
    
    // Show toast for errors
    if (type === 'error') {
      const message = typeof content === 'string' ? content : `${content.method} failed`;
      addToast({ title: message, severity: "danger" });
    }
  }, [])

  const clearLogs = useCallback(() => {
    setLogs([])
    invoke("clear_logs_file").catch(err => console.error("Failed to clear logs file:", err));
  }, [])

  const createNewLog = useCallback(() => {
    setLogs([]);
    setSessionNote("");
    invoke<string>("start_new_log").then((newSessionId) => {
      setCurrentSessionId(newSessionId)
      addToast({ title: "New log session started", severity: "success" });
    }).catch(err => console.error("Failed to start new log:", err));
  }, []);

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

  const updateSessionNote = useCallback(async (note: string) => {
    if (!currentSessionId) return
    try {
      await invoke("update_session_note", { sessionId: currentSessionId, note })
      setSessionNote(note)
    } catch (err) {
      console.error("Failed to update session note:", err)
    }
  }, [currentSessionId])

  const removeSessionNote = useCallback(async () => {
    if (!currentSessionId) return
    try {
      await invoke("remove_session_note", { sessionId: currentSessionId })
      setSessionNote("")
    } catch (err) {
      console.error("Failed to remove session note:", err)
    }
  }, [currentSessionId])

  return (
    <LogContext.Provider value={{ logs, addLog, clearLogs, createNewLog, isOpen, setIsOpen, togglePanel, addNote, removeNote, sessionNote, updateSessionNote, removeSessionNote }}>
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
