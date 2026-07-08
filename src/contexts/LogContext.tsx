import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react"
import { addToast } from "@heroui/react"
import { invoke } from "@tauri-apps/api/core"
import { useTranslation } from "react-i18next"
import { usePersistentState } from "../hooks/usePersistentState"

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
   * - nonce: 随机数 (如 ChaCha20 使用的 8 或 12 字节随机数)
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
  refresh: () => Promise<void>
  currentSessionId: string | null
  switchToSession: (sessionId: string) => Promise<void>
}

type LogUIContextType = Pick<LogContextType, "isOpen" | "setIsOpen" | "togglePanel">
type LogDataContextType = Omit<LogContextType, "isOpen" | "setIsOpen" | "togglePanel">

const LogUIContext = createContext<LogUIContextType | undefined>(undefined)
const LogDataContext = createContext<LogDataContextType | undefined>(undefined)

const MAX_LOGS_IN_MEMORY = 200
const MAX_LOG_TEXT_LENGTH = 4000
const MAX_LOG_PARAM_LENGTH = 1000
const TRUNCATED_SUFFIX = "\n...[truncated]"

// 日志里经常包含完整输入/输出，统一截断后再进入 React state，降低长期驻留内存。
function truncateText(value: string | undefined, limit = MAX_LOG_TEXT_LENGTH) {
  if (!value) return value
  const chars = Array.from(value)
  if (chars.length <= limit) return value
  return `${chars.slice(0, limit).join("")}${TRUNCATED_SUFFIX}`
}

// cryptoParams 可能嵌套保存密钥/参数/结果，递归截断字符串字段，避免隐藏的大对象绕过限制。
function truncateCryptoValue(value: any): any {
  if (typeof value === "string") return truncateText(value, MAX_LOG_PARAM_LENGTH)
  if (Array.isArray(value)) return value.map(truncateCryptoValue)
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, truncateCryptoValue(item)]))
  }
  return value
}

function truncateCryptoParams(params?: Record<string, any>): Record<string, any> | undefined {
  if (!params) return undefined
  return truncateCryptoValue(params)
}

// 后端已做 LIMIT，这里再兜底限制一次，防止旧版本/异常返回把大量日志灌进内存。
function normalizeLogs(logs: LogEntry[]) {
  return logs.slice(0, MAX_LOGS_IN_MEMORY).map((log) => ({
    ...log,
    message: truncateText(log.message),
    input: truncateText(log.input),
    output: truncateText(log.output),
    details: truncateText(log.details),
    note: truncateText(log.note, 500),
    cryptoParams: truncateCryptoParams(log.cryptoParams),
  }))
}

export function LogProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const [logs, setLogs] = useState<LogEntry[]>([])

  // 状态原先使用 localStorage 存储以控制日志面板的展开（默认关闭）。
  // 现改为使用 `usePersistentState`（基于 Tauri store）进行异步持久化与恢复。
  // `src/lib/store.ts` 含有从 localStorage 到 store 的迁移逻辑，首次读取时会自动迁移旧数据以保持向后兼容性。
  const [isOpen, setIsOpen] = usePersistentState<boolean>('logPanelIsOpen', false)

  const [sessionNote, setSessionNote] = useState("")
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const newLogs = await invoke<LogEntry[]>("load_logs")
      setLogs(normalizeLogs(newLogs))
      
      const info = await invoke<{ sessionId: string; note: string | null }>("get_current_session_info")
      setCurrentSessionId(info.sessionId)
      setSessionNote(info.note || "")
    } catch (err) {
      console.error("Failed to refresh logs:", err)
    }
  }, [])

  // Load logs and session note from backend on mount
  useEffect(() => {
    refresh()
  }, [refresh]);

  useEffect(() => {
    const handleLogsChanged = () => {
      refresh()
    }
    window.addEventListener('logs-changed', handleLogsChanged)
    return () => window.removeEventListener('logs-changed', handleLogsChanged)
  }, [refresh])

    const addLog = useCallback((content: LogContent, type: LogEntry["type"] = "info", details?: string) => {
      const newLog: LogEntry = {
        id: Math.random().toString(36).substring(7),
        timestamp: Date.now(),
        type,
        details,
      }
  
      if (typeof content === 'string') {
        newLog.message = truncateText(content)
      } else {
        newLog.method = content.method
        newLog.input = truncateText(content.input)
        newLog.output = truncateText(content.output)
        if (content.cryptoParams) newLog.cryptoParams = truncateCryptoParams(content.cryptoParams)
        // 方法日志已经单独保存 input/output，message 不再重复拼接大文本，避免一条日志占用多份内存。
        newLog.message = content.method
      }
  
      setLogs((prev) => [newLog, ...prev].slice(0, MAX_LOGS_IN_MEMORY))
      
      // Persist to backend
      invoke("append_log", { entry: newLog })
        .then(() => window.dispatchEvent(new CustomEvent('logs-changed')))
        .catch(err => console.error("Failed to save log:", err));
      
      // Show toast for errors
      if (type === 'error') {
        const message = typeof content === 'string' ? content : t('logContext.operationFailed', { method: content.method });
        addToast({ title: message, severity: "danger" });
      }
    }, [t])
  
    const clearLogs = useCallback(() => {
      setLogs([])
      invoke("clear_logs_file")
        .then(() => window.dispatchEvent(new CustomEvent('logs-changed')))
        .catch(err => console.error("Failed to clear logs file:", err));
    }, [])
  
    const createNewLog = useCallback(() => {
      setLogs([]);
      setSessionNote("");
      invoke<string>("start_new_log").then((newSessionId) => {
        setCurrentSessionId(newSessionId)
        window.dispatchEvent(new CustomEvent('logs-changed'))
        addToast({ title: t('logContext.newLogSessionStarted'), severity: "success" });
      }).catch(err => console.error("Failed to start new log:", err));
    }, [t]);
  
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
      invoke("update_log_note", { logId, note })
        .then(() => window.dispatchEvent(new CustomEvent('logs-changed')))
        .catch(err => console.error("Failed to save note:", err))
    }, [])
  
    const removeNote = useCallback((logId: string) => {
      setLogs((prev) =>
        prev.map((log) =>
          log.id === logId ? { ...log, note: undefined } : log
        )
      )
      
      // Persist to backend
      invoke("remove_log_note", { logId })
        .then(() => window.dispatchEvent(new CustomEvent('logs-changed')))
        .catch(err => console.error("Failed to remove note:", err))
    }, [])
  
    const updateSessionNote = useCallback(async (note: string) => {
      if (!currentSessionId) return
      try {
        await invoke("update_session_note", { sessionId: currentSessionId, note })
        setSessionNote(note)
        window.dispatchEvent(new CustomEvent('logs-changed'))
      } catch (err) {
        console.error("Failed to update session note:", err)
      }
    }, [currentSessionId])
  
    const removeSessionNote = useCallback(async () => {
      if (!currentSessionId) return
      try {
        await invoke("remove_session_note", { sessionId: currentSessionId })
        setSessionNote("")
        window.dispatchEvent(new CustomEvent('logs-changed'))
      } catch (err) {
        console.error("Failed to remove session note:", err)
      }
    }, [currentSessionId])

    const switchToSession = useCallback(async (sessionId: string) => {
      try {
        await invoke("switch_to_session", { sessionId })
        setCurrentSessionId(sessionId)
        const newLogs = await invoke<LogEntry[]>("load_logs")
        setLogs(normalizeLogs(newLogs))
        const info = await invoke<{ sessionId: string; note: string | null }>("get_current_session_info")
        setSessionNote(info.note || "")
        window.dispatchEvent(new CustomEvent('logs-changed'))
      } catch (err) {
        console.error("Failed to switch session:", err)
      }
    }, [])

  // IMPORTANT: Split UI state from log data so toggling the panel doesn't re-render
  // every component that only needs addLog/refresh/etc (e.g., Monaco editors).
  const uiValue = useMemo<LogUIContextType>(() => ({
    isOpen,
    setIsOpen,
    togglePanel,
  }), [isOpen, setIsOpen, togglePanel])

  const dataValue = useMemo<LogDataContextType>(() => ({
    logs,
    addLog,
    clearLogs,
    createNewLog,
    addNote,
    removeNote,
    sessionNote,
    updateSessionNote,
    removeSessionNote,
    refresh,
    currentSessionId,
    switchToSession,
  }), [
    logs,
    addLog,
    clearLogs,
    createNewLog,
    addNote,
    removeNote,
    sessionNote,
    updateSessionNote,
    removeSessionNote,
    refresh,
    currentSessionId,
    switchToSession,
  ])

  return (
    <LogUIContext.Provider value={uiValue}>
      <LogDataContext.Provider value={dataValue}>
        {children}
      </LogDataContext.Provider>
    </LogUIContext.Provider>
  )
}

export function useLogUI() {
  const context = useContext(LogUIContext)
  if (context === undefined) {
    throw new Error("useLogUI must be used within a LogProvider")
  }
  return context
}

export function useLogData() {
  const context = useContext(LogDataContext)
  if (context === undefined) {
    throw new Error("useLogData must be used within a LogProvider")
  }
  return context
}

export function useLog() {
  // Backward compatible combined hook.
  // Note: this hook will re-render when either UI or data changes.
  return { ...useLogData(), ...useLogUI() }
}
