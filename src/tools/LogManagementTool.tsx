import { useEffect, useMemo, useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import { Button, Card, Input, Spinner, Chip, ScrollShadow } from "@heroui/react"
import { Trash2, RefreshCw, Search, Archive, Clock, AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { LogEntry } from "../contexts/LogContext"
import { cn } from "../lib/utils"

type LogSessionSummary = {
  sessionId: string
  latestTimestamp: number
  count: number
}

export function LogManagementTool() {
  const { t } = useTranslation()

  const [loadingSessions, setLoadingSessions] = useState(true)
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [sessions, setSessions] = useState<LogSessionSummary[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string>("")
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [query, setQuery] = useState("")
  const [error, setError] = useState<string | null>(null)

  const filteredLogs = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return logs
    return logs.filter((l) => {
      const hay = [
        l.message, 
        l.method, 
        l.details, 
        l.note, 
        l.input, 
        l.output,
        l.type
      ].filter(Boolean).join("\n").toLowerCase()
      return hay.includes(q)
    })
  }, [logs, query])

  const reloadSessions = async (keepActive = false) => {
    setError(null)
    setLoadingSessions(true)
    try {
      const result = await invoke<LogSessionSummary[]>("list_log_sessions")
      setSessions(result)
      
      if (!keepActive) {
         if (result.length > 0) {
            setActiveSessionId(result[0].sessionId)
         } else {
            setActiveSessionId("")
            setLogs([])
         }
      } else if (activeSessionId && !result.find(s => s.sessionId === activeSessionId)) {
          // If active session was deleted, select first or none
          if (result.length > 0) {
            setActiveSessionId(result[0].sessionId)
          } else {
            setActiveSessionId("")
            setLogs([])
          }
      }
    } catch (e: any) {
      setError(typeof e === "string" ? e : (e?.toString?.() ?? "Unknown error"))
    } finally {
      setLoadingSessions(false)
    }
  }

  const reloadLogs = async (sessionId: string) => {
    if (!sessionId) {
      setLogs([])
      return
    }
    setError(null)
    setLoadingLogs(true)
    try {
      const result = await invoke<LogEntry[]>("get_logs_by_session", { sessionId })
      setLogs(result)
    } catch (e: any) {
      setError(typeof e === "string" ? e : (e?.toString?.() ?? "Unknown error"))
    } finally {
      setLoadingLogs(false)
    }
  }

  useEffect(() => {
    reloadSessions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (activeSessionId) {
        reloadLogs(activeSessionId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId])

  const handleDeleteLog = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(t("logManagement.confirmDeleteLog", "Are you sure you want to delete this log?"))) return
    
    try {
      await invoke("delete_log", { id })
      // Optimistic update
      setLogs(prev => prev.filter(l => l.id !== id))
      // Update session count locally or reload
      reloadSessions(true)
    } catch (e: any) {
      setError(typeof e === "string" ? e : (e?.toString?.() ?? "Unknown error"))
    }
  }

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(t("logManagement.confirmDeleteSession", "Are you sure you want to delete this entire session?"))) return

    try {
      await invoke("delete_log_session", { sessionId })
      await reloadSessions()
    } catch (e: any) {
      setError(typeof e === "string" ? e : (e?.toString?.() ?? "Unknown error"))
    }
  }

  const getLogIcon = (type: string) => {
    switch (type) {
      case "error": return <AlertCircle className="w-4 h-4 text-danger" />
      case "success": return <CheckCircle2 className="w-4 h-4 text-success" />
      case "warning": return <AlertTriangle className="w-4 h-4 text-warning" />
      default: return <Info className="w-4 h-4 text-primary" />
    }
  }

  return (
    <div className="flex h-[calc(100vh-140px)] gap-4 w-full">
      {/* Sidebar: Sessions List */}
      <Card className="w-72 h-full flex-none bg-content1/50">
        <div className="p-3 border-b border-divider flex items-center justify-between bg-content1/50 backdrop-blur-md">
          <div className="text-sm font-semibold flex items-center gap-2">
            <Archive className="w-4 h-4" />
            {t("logManagement.sessions", "Sessions")}
          </div>
          <Button isIconOnly size="sm" variant="light" onPress={() => reloadSessions(true)} isLoading={loadingSessions}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        
        <ScrollShadow className="flex-1 p-2 space-y-1">
          {sessions.length === 0 && !loadingSessions && (
             <div className="text-center text-default-400 text-xs py-4">
               {t("logManagement.noSessions", "No sessions found")}
             </div>
          )}
          
          {sessions.map((s) => (
            <div
              key={s.sessionId}
              onClick={() => setActiveSessionId(s.sessionId)}
              className={cn(
                "group flex flex-col gap-1 p-3 rounded-lg cursor-pointer transition-all border border-transparent",
                activeSessionId === s.sessionId 
                  ? "bg-primary/10 border-primary/20 shadow-sm"
                  : "hover:bg-content2 hover:border-default-200"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-default-700">
                   {new Date(s.latestTimestamp).toLocaleDateString()}
                </div>
                <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    className="w-6 h-6 min-w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleDeleteSession(s.sessionId, e)}
                    color="danger"
                >
                    <Trash2 className="w-3 h-3" />
                </Button>
              </div>
              <div className="flex items-center justify-between text-tiny text-default-500">
                 <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(s.latestTimestamp).toLocaleTimeString()}
                 </div>
                 <Chip size="sm" variant="flat" className="h-5 text-[10px] px-1">
                    {s.count} logs
                 </Chip>
              </div>
            </div>
          ))}
        </ScrollShadow>
      </Card>

      {/* Main Content: Logs List */}
      <Card className="flex-1 h-full bg-content1/50 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="p-3 border-b border-divider flex items-center justify-between gap-4 bg-content1/50 backdrop-blur-md shrink-0">
             <Input
                size="sm"
                startContent={<Search className="w-4 h-4 text-default-400" />}
                placeholder={t("logManagement.searchPlaceholder", "Search logs...")}
                value={query}
                onValueChange={setQuery}
                className="max-w-md"
                isClearable
             />
             
             {error && (
                <div className="text-tiny text-danger flex items-center gap-1 bg-danger/10 px-2 py-1 rounded">
                   <AlertCircle className="w-3 h-3" />
                   {error}
                </div>
             )}
        </div>

        {/* Logs List */}
        <ScrollShadow className="flex-1 p-4">
           {loadingLogs ? (
             <div className="flex justify-center py-10">
                <Spinner label={t("common.loading", "Loading...")} />
             </div>
           ) : filteredLogs.length === 0 ? (
             <div className="text-center text-default-400 py-20 flex flex-col items-center gap-2">
                <Search className="w-10 h-10 opacity-20" />
                <p>{t("logManagement.empty", "No logs found")}</p>
             </div>
           ) : (
             <div className="space-y-3">
               {filteredLogs.map((log) => (
                 <div key={log.id} className="group relative flex gap-3 p-4 rounded-xl border border-divider bg-content1 hover:bg-content2 transition-colors">
                    <div className="mt-1 shrink-0">
                       {getLogIcon(log.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0 space-y-1">
                       <div className="flex items-center justify-between gap-2">
                          <div className="text-xs text-default-500 font-mono">
                             {new Date(log.timestamp).toLocaleTimeString()}
                          </div>
                          {log.method && (
                             <Chip size="sm" variant="flat" color="primary" className="h-5 text-[10px]">
                                {log.method}
                             </Chip>
                          )}
                       </div>
                       
                       <div className="text-sm font-medium break-all text-foreground">
                          {log.message || (
                             <span className="font-mono text-xs">
                                {log.input && `${log.input.substring(0, 50)}${log.input.length > 50 ? '...' : ''}`}
                                {log.input && log.output && ' → '}
                                {log.output && `${log.output.substring(0, 50)}${log.output.length > 50 ? '...' : ''}`}
                             </span>
                          )}
                       </div>

                       {(log.details || log.note) && (
                          <div className="text-xs text-default-500 space-y-1 mt-2 p-2 bg-default-100/50 rounded-lg">
                             {log.details && <div>{log.details}</div>}
                             {log.note && (
                                <div className="flex items-start gap-1 text-warning-600">
                                   <span className="font-semibold">{t("log.note", "Note")}:</span>
                                   {log.note}
                                </div>
                             )}
                          </div>
                       )}
                       
                       {/* Full content expansion could go here */}
                    </div>

                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          color="danger"
                          onClick={(e) => handleDeleteLog(log.id, e)}
                       >
                          <Trash2 className="w-4 h-4" />
                       </Button>
                    </div>
                 </div>
               ))}
             </div>
           )}
        </ScrollShadow>
      </Card>
    </div>
  )
}