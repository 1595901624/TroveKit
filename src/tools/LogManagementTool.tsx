import { useEffect, useRef, useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import { Button, Input, Spinner, Chip, ScrollShadow, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Tooltip } from "../components/ui/base-ui"
import { Trash2, RefreshCw, Search, Archive, Clock, AlertCircle, CheckCircle2, Info, AlertTriangle, Edit, X, Check, MessageSquare, Copy, Eye, EyeOff, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLogSession, type LogEntry } from "../contexts/LogContext"
import { cn } from "../lib/utils"

/** 日志会话摘要信息 */
type LogSessionSummary = {
  /** 会话 ID */
  sessionId: string
  /** 最新日志的时间戳 */
  latestTimestamp: number
  /** 日志数量 */
  count: number
  /** 会话备注 */
  note?: string
}

type LogCursor = {
  timestamp: number
  id: string
}

type LogPage = {
  logs: LogEntry[]
  nextCursor: LogCursor | null
  total: number
}

const LOG_PAGE_SIZE = 40

/**
 * 日志管理工具组件
 * 提供日志会话管理、日志查看、搜索、删除等功能
 */
export function LogManagementTool() {
  const { t } = useTranslation()
  // 只订阅日志数据，避免打开/关闭全局日志面板时重渲染整个管理页。
  const { currentSessionId, refresh: refreshCurrentSession, switchToSession } = useLogSession()

  // 加载状态
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [loadingLogs, setLoadingLogs] = useState(false)
  // 数据状态
  const [sessions, setSessions] = useState<LogSessionSummary[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string>("")
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [totalLogs, setTotalLogs] = useState(0)
  const [nextCursor, setNextCursor] = useState<LogCursor | null>(null)
  const [cursorHistory, setCursorHistory] = useState<Array<LogCursor | null>>([null])
  const [pageIndex, setPageIndex] = useState(0)
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)
  const [logDetails, setLogDetails] = useState<Record<string, LogEntry>>({})
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null)
  const [revealedSecretLogIds, setRevealedSecretLogIds] = useState<Set<string>>(() => new Set())
  const [error, setError] = useState<string | null>(null)
  const logRequestIdRef = useRef(0)
  const activeSessionIdRef = useRef("")
  activeSessionIdRef.current = activeSessionId

  // 编辑会话备注的状态
  const [editingSessionNote, setEditingSessionNote] = useState<string | null>(null)
  const [sessionNoteInput, setSessionNoteInput] = useState("")

  /**
   * 获取尾部空白字符的描述
   * @param trailing 尾部空白字符串
   */
  const getTrailingDescription = (trailing: string) => {
    if (trailing.includes('\n') || trailing.includes('\r')) return t('log.trailingNewline')
    if (trailing.includes('\t')) return t('log.trailingTab')
    return t('log.trailingSpaces')
  }

  /**
   * 渲染高亮文本，突出显示尾部空白字符
   * @param text 要渲染的文本
   */
  const renderHighlightedText = (text?: string) => {
    if (typeof text !== 'string') return text
    const match = text.match(/([ \t\n\r]+)$/)
    if (match && match.index !== undefined) {
      const main = text.slice(0, match.index)
      const trailing = text.slice(match.index)
      return (
        <>
          {main}
          <span 
            className="bg-warning/20 text-amber-700 dark:text-warning rounded px-0.5 select-none"
            title={getTrailingDescription(trailing)}
          >
            {trailing
              .replace(/ /g, '·')
              .replace(/\t/g, '→')
              .replace(/\n/g, '↵\n')
              .replace(/\r/g, '␍')}
          </span>
        </>
      )
    }
    return text
  }

  // 搜索放到 SQLite 执行，并延迟触发，避免每次按键扫描所有长字符串。
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 220)
    return () => window.clearTimeout(timer)
  }, [query])

  /**
   * 重新加载会话列表
   * @param keepActive 是否保持当前选中的会话
   */
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
          // 如果当前选中的会话已被删除，切换到第一个或清空
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

  /**
   * 重新加载指定会话的日志
   * @param sessionId 会话 ID
   */
  const reloadLogs = async (
    sessionId: string,
    cursor: LogCursor | null = null,
    searchQuery = debouncedQuery,
  ) => {
    if (!sessionId) {
      setLogs([])
      setTotalLogs(0)
      setNextCursor(null)
      return
    }
    const requestId = ++logRequestIdRef.current
    setError(null)
    setLoadingLogs(true)
    try {
      const result = await invoke<LogPage>("get_logs_page", {
        sessionId,
        cursor,
        query: searchQuery || null,
        limit: LOG_PAGE_SIZE,
      })
      if (requestId !== logRequestIdRef.current) return
      setLogs(result.logs)
      setTotalLogs(result.total)
      setNextCursor(result.nextCursor)
    } catch (e: any) {
      if (requestId !== logRequestIdRef.current) return
      setError(typeof e === "string" ? e : (e?.toString?.() ?? "Unknown error"))
    } finally {
      if (requestId === logRequestIdRef.current) setLoadingLogs(false)
    }
  }

  // 初始化时加载会话列表
  useEffect(() => {
    reloadSessions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 会话或搜索变化时回到第一页，前端始终只持有一页摘要。
  useEffect(() => {
    if (activeSessionId) {
        setCursorHistory([null])
        setPageIndex(0)
        setExpandedLogId(null)
        setLogDetails({})
        setRevealedSecretLogIds(new Set())
        reloadLogs(activeSessionId, null, debouncedQuery)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId, debouncedQuery])

  // 监听日志变化事件
  useEffect(() => {
    let refreshTimer: number | undefined
    const handleLogsChanged = () => {
      window.clearTimeout(refreshTimer)
      refreshTimer = window.setTimeout(() => {
        reloadSessions(true)
        if (activeSessionId) {
          setCursorHistory([null])
          setPageIndex(0)
          setExpandedLogId(null)
          setLogDetails({})
          setRevealedSecretLogIds(new Set())
          reloadLogs(activeSessionId, null, debouncedQuery)
        }
      }, 150)
    }
    window.addEventListener('logs-changed', handleLogsChanged)
    return () => {
      window.clearTimeout(refreshTimer)
      window.removeEventListener('logs-changed', handleLogsChanged)
    }
  }, [activeSessionId, debouncedQuery])

  const handleNextPage = () => {
    if (!activeSessionId || !nextCursor || loadingLogs) return
    const nextPageIndex = pageIndex + 1
    setCursorHistory((history) => [...history.slice(0, nextPageIndex), nextCursor])
    setPageIndex(nextPageIndex)
    setExpandedLogId(null)
    setLogDetails({})
    setRevealedSecretLogIds(new Set())
    reloadLogs(activeSessionId, nextCursor, debouncedQuery)
  }

  const handlePreviousPage = () => {
    if (!activeSessionId || pageIndex === 0 || loadingLogs) return
    const previousPageIndex = pageIndex - 1
    const previousCursor = cursorHistory[previousPageIndex] ?? null
    setCursorHistory((history) => history.slice(0, pageIndex))
    setPageIndex(previousPageIndex)
    setExpandedLogId(null)
    setLogDetails({})
    setRevealedSecretLogIds(new Set())
    reloadLogs(activeSessionId, previousCursor, debouncedQuery)
  }

  const handleToggleLogDetails = async (log: LogEntry) => {
    if (expandedLogId === log.id) {
      setExpandedLogId(null)
      return
    }

    setExpandedLogId(log.id)
    if (logDetails[log.id] || !activeSessionId) return

    const requestedSessionId = activeSessionId
    setLoadingDetailId(log.id)
    try {
      const detail = await invoke<LogEntry>("get_log_detail", {
        sessionId: requestedSessionId,
        id: log.id,
      })
      if (requestedSessionId === activeSessionIdRef.current) {
        setLogDetails((details) => ({ ...details, [log.id]: detail }))
      }
    } catch (e: any) {
      setError(typeof e === "string" ? e : (e?.toString?.() ?? "Unknown error"))
    } finally {
      setLoadingDetailId((id) => id === log.id ? null : id)
    }
  }

  // 删除确认弹窗控制
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure()
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'log' | 'session', id: string } | null>(null)

  /** 执行删除确认 */
  const confirmDelete = async () => {
    if (!deleteTarget) return
    
    if (deleteTarget.type === 'log') {
      await executeDeleteLog(deleteTarget.id)
    } else {
      await executeDeleteSession(deleteTarget.id)
    }
    onClose()
    setDeleteTarget(null)
  }

  /**
   * 执行删除日志
   * @param id 日志 ID
   */
  const executeDeleteLog = async (id: string) => {
    try {
      await invoke("delete_log", { id })
      // 乐观更新
      setLogs(prev => prev.filter(l => l.id !== id))
      setTotalLogs((total) => Math.max(0, total - 1))
      setExpandedLogId((expandedId) => expandedId === id ? null : expandedId)
      setLogDetails((details) => {
        const { [id]: _removed, ...remaining } = details
        return remaining
      })
      // 更新会话计数或重新加载
      await reloadSessions(true)
      
      // 如果属于当前会话，刷新日志面板
      if (activeSessionId === currentSessionId) {
        refreshCurrentSession()
      }
    } catch (e: any) {
      setError(typeof e === "string" ? e : (e?.toString?.() ?? "Unknown error"))
    }
  }

  /**
   * 执行删除会话
   * @param sessionId 会话 ID
   */
  const executeDeleteSession = async (sessionId: string) => {
    try {
      await invoke("delete_log_session", { sessionId })
      await reloadSessions()

      // 如果是当前会话，刷新日志面板
      if (sessionId === currentSessionId) {
        refreshCurrentSession()
      }
    } catch (e: any) {
      setError(typeof e === "string" ? e : (e?.toString?.() ?? "Unknown error"))
    }
  }

  /**
   * 处理删除日志点击
   * @param id 日志 ID
   * @param e 鼠标事件
   */
  const handleDeleteLog = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeleteTarget({ type: 'log', id })
    onOpen()
  }

  /**
   * 处理删除会话点击
   * @param sessionId 会话 ID
   * @param e 鼠标事件
   */
  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeleteTarget({ type: 'session', id: sessionId })
    onOpen()
  }

  /**
   * 开始编辑会话备注
   * @param sessionId 会话 ID
   * @param currentNote 当前备注
   * @param e 鼠标事件
   */
  const handleStartEditSessionNote = (sessionId: string, currentNote?: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setEditingSessionNote(sessionId)
    setSessionNoteInput(currentNote || "")
  }

  /** 取消编辑会话备注 */
  const handleCancelEditSessionNote = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setEditingSessionNote(null)
    setSessionNoteInput("")
  }

  /**
   * 切换到指定会话
   * @param sessionId 会话 ID
   * @param e 鼠标事件
   */
  const handleSwitchToSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await switchToSession(sessionId)
  }

  /**
   * 保存会话备注
   * @param sessionId 会话 ID
   * @param e 鼠标事件
   */
  const handleSaveSessionNote = async (sessionId: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    try {
      if (sessionNoteInput.trim()) {
        await invoke("update_session_note", { sessionId, note: sessionNoteInput.trim() })
      } else {
        await invoke("remove_session_note", { sessionId })
      }
      setSessions(prev => prev.map(s => 
        s.sessionId === sessionId 
          ? { ...s, note: sessionNoteInput.trim() || undefined }
          : s
      ))
      setEditingSessionNote(null)
      setSessionNoteInput("")
      
      // 如果是当前会话，同步到日志面板
      if (sessionId === currentSessionId) {
        refreshCurrentSession()
      }
    } catch (e: any) {
      setError(typeof e === "string" ? e : (e?.toString?.() ?? "Unknown error"))
    }
  }

  /**
   * 根据日志类型获取对应图标
   * @param type 日志类型
   */
  const getLogIcon = (type: string) => {
    switch (type) {
      case "error": return <AlertCircle className="w-4 h-4 text-danger" />
      case "success": return <CheckCircle2 className="w-4 h-4 text-success" />
      case "warning": return <AlertTriangle className="w-4 h-4 text-warning" />
      default: return <Info className="w-4 h-4 text-primary" />
    }
  }

  return (
    <div className="grid h-full min-h-0 w-full grid-cols-1 grid-rows-[220px_minmax(0,1fr)] overflow-hidden rounded-xl border border-default-200 bg-background lg:grid-cols-[minmax(250px,300px)_minmax(0,1fr)] lg:grid-rows-1">
      {/* Sidebar: Sessions List */}
      <section className="flex min-h-0 min-w-0 flex-col border-b border-default-200 bg-default-50/30 lg:border-b-0 lg:border-r" aria-label={t("logManagement.sessions")}>
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-default-200 bg-background px-3.5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Archive className="h-4 w-4 text-default-400" />
            {t("logManagement.sessions")}
            <Chip className="bg-default-100 text-[10px] text-default-500">{sessions.length}</Chip>
          </div>
          <Button isIconOnly size="sm" variant="light" className="h-8 min-w-8" onPress={() => reloadSessions(true)} isLoading={loadingSessions} title={t("common.refresh")} aria-label={t("common.refresh")}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        
        <ScrollShadow className="min-h-0 flex-1 p-2">
          {sessions.length === 0 && !loadingSessions && (
             <div className="py-10 text-center text-xs text-default-400">
               {t("logManagement.noSessions")}
             </div>
          )}
          <div className="space-y-1">
          {sessions.map((s) => (
            <div
              key={s.sessionId}
              onClick={() => setActiveSessionId(s.sessionId)}
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget) return
                if (event.key === "Enter" || event.key === " ") setActiveSessionId(s.sessionId)
              }}
              role="button"
              tabIndex={0}
              aria-pressed={activeSessionId === s.sessionId}
              style={{ contentVisibility: "auto", containIntrinsicSize: "70px" }}
              className={cn(
                "group flex cursor-pointer flex-col gap-1 rounded-lg border p-2.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/30",
                activeSessionId === s.sessionId 
                  ? "border-primary/35 bg-primary/10"
                  : "border-transparent hover:border-default-200 hover:bg-background"
              )}
            >
              <div className={cn("gap-1", editingSessionNote === s.sessionId ? "block" : "flex items-start justify-between")}>
                <div className={cn("min-w-0", editingSessionNote === s.sessionId ? "w-full" : "flex-1")}>
                  {editingSessionNote === s.sessionId ? (
                    <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
                      <Input
                        size="sm"
                        value={sessionNoteInput}
                        onValueChange={setSessionNoteInput}
                        placeholder={t("logManagement.sessionNotePlaceholder")}
                        className="min-w-0 w-full text-xs"
                        autoFocus
                        maxLength={100}
                      />
                      <div className="flex justify-end gap-1">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          className="w-5 h-5 min-w-5"
                          onClick={(e) => handleCancelEditSessionNote(e)}
                          aria-label={t("common.cancel")}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="flat"
                          color="primary"
                          className="w-5 h-5 min-w-5"
                          onClick={(e) => handleSaveSessionNote(s.sessionId, e)}
                          aria-label={t("settings.confirm")}
                        >
                          <Check className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className={cn(
                      "truncate text-xs font-semibold",
                      s.note ? "text-amber-700 dark:text-warning" : "text-default-500 font-mono"
                    )}>
                      {s.note ? `💡 ${s.note}` : `# ${s.sessionId.slice(0, 8)}`}
                    </div>
                  )}
                </div>
                {editingSessionNote !== s.sessionId && <div className="flex shrink-0 gap-0.5">
                  <Tooltip content={t("logManagement.switchToSession")}>
                    <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        className={cn("h-7 min-w-7", currentSessionId === s.sessionId && "bg-primary/10 text-primary")}
                        onClick={(e) => handleSwitchToSession(s.sessionId, e)}
                        color="primary"
                        aria-label={t("logManagement.switchToSession")}
                    >
                        <Eye className="w-3 h-3" />
                    </Button>
                  </Tooltip>
                  <Tooltip content={t("logManagement.editSessionNote")}>
                    <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        className="h-7 min-w-7"
                        onClick={(e) => handleStartEditSessionNote(s.sessionId, s.note, e)}
                        aria-label={t("logManagement.editSessionNote")}
                    >
                        {s.note ? <MessageSquare className="w-3 h-3 text-warning" /> : <Edit className="w-3 h-3" />}
                    </Button>
                  </Tooltip>
                  <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      className="h-7 min-w-7 text-danger"
                      onClick={(e) => handleDeleteSession(s.sessionId, e)}
                      color="danger"
                      aria-label={t("logManagement.deleteSessionTitle")}
                  >
                      <Trash2 className="w-3 h-3" />
                  </Button>
                </div>}
              </div>
              
              <div className="mt-0.5 flex items-center justify-between text-[10px] text-default-400">
                 <div className="flex items-center gap-1 truncate">
                    <Clock className="w-3 h-3 shrink-0" />
                    <span className="truncate">
                      {new Date(s.latestTimestamp).toLocaleDateString()} {new Date(s.latestTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                 </div>
                 <Chip size="sm" variant="flat" className="h-4 text-[10px] px-1 bg-default-100 shrink-0">
                    {t("logManagement.logCount", { count: s.count })}
                 </Chip>
              </div>
            </div>
          ))}
          </div>
        </ScrollShadow>
      </section>

      {/* Main Content: Logs List */}
      <section className="flex min-h-0 min-w-0 flex-col overflow-hidden" aria-label={t("log.title")}>
        {/* Toolbar */}
        <div className="flex min-h-12 shrink-0 items-center justify-between gap-3 border-b border-default-200 bg-background px-3 py-2">
             <Input
                size="sm"
                aria-label={t("logManagement.searchPlaceholder")}
                startContent={<Search className="h-4 w-4 text-default-400" />}
                placeholder={t("logManagement.searchPlaceholder")}
                value={query}
                onValueChange={setQuery}
                className="max-w-lg flex-1"
                classNames={{ inputWrapper: "bg-default-50/60" }}
                isClearable
             />

             <div className="flex shrink-0 items-center gap-1">
               <span className="mr-1 whitespace-nowrap text-[11px] text-default-400">
                 {totalLogs === 0 ? 0 : pageIndex * LOG_PAGE_SIZE + 1}–{Math.min((pageIndex + 1) * LOG_PAGE_SIZE, totalLogs)} / {totalLogs}
               </span>
               <Button
                 isIconOnly
                 size="sm"
                 variant="light"
                 className="h-7 min-w-7"
                 onPress={handlePreviousPage}
                 isDisabled={pageIndex === 0 || loadingLogs}
                 aria-label={t("common.previous", "上一页")}
               >
                 <ChevronLeft className="h-4 w-4" />
               </Button>
               <Button
                 isIconOnly
                 size="sm"
                 variant="light"
                 className="h-7 min-w-7"
                 onPress={handleNextPage}
                 isDisabled={!nextCursor || loadingLogs}
                 aria-label={t("common.next", "下一页")}
               >
                 <ChevronRight className="h-4 w-4" />
               </Button>
             </div>
        </div>

        {error && (
          <div className="flex shrink-0 items-start gap-2 border-b border-danger/20 bg-danger/10 px-3 py-2 text-xs text-danger" role="alert">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 break-words">{error}</span>
            <Button
              size="sm"
              variant="light"
              className="ml-auto h-6 shrink-0 px-2 text-xs"
              onPress={() => reloadLogs(activeSessionId, cursorHistory[pageIndex] ?? null, debouncedQuery)}
            >
              {t("common.retry", "重试")}
            </Button>
          </div>
        )}

        {/* Logs List */}
        <ScrollShadow className="min-h-0 flex-1 p-3">
           {loadingLogs ? (
             <div className="flex justify-center py-10">
                <Spinner label={t("common.loading")} />
             </div>
           ) : logs.length === 0 ? (
             <div className="text-center text-default-400 py-20 flex flex-col items-center gap-2">
                <Search className="w-10 h-10 opacity-20" />
                <p>{t("logManagement.empty")}</p>
             </div>
           ) : (
            <div className="space-y-2">
               {logs.map((summaryLog) => {
                 const log = logDetails[summaryLog.id] ?? summaryLog
                 const isExpanded = expandedLogId === summaryLog.id
                 const secretsRevealed = revealedSecretLogIds.has(summaryLog.id)
                 return (
                 <article
                   key={log.id}
                   className="group relative rounded-xl border border-default-200 bg-background p-3 transition-colors hover:border-default-300"
                   style={{ contentVisibility: "auto", containIntrinsicSize: "180px" }}
                 >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                            {getLogIcon(log.type)}
                            <time className="text-xs text-default-500 font-mono">
                                {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </time>
                        </div>

                        <div className="flex items-center gap-1">
                            <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                className="h-6 w-6 min-w-6"
                                onPress={() => handleToggleLogDetails(summaryLog)}
                                isLoading={loadingDetailId === summaryLog.id}
                                aria-expanded={isExpanded}
                                aria-label={isExpanded ? t("common.collapse", "收起详情") : t("common.expand", "展开详情")}
                            >
                                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isExpanded && "rotate-180")} />
                            </Button>
                            {/* Copy Message Button for non-method logs */}
                            {!log.method && (
                                <Button
                                    isIconOnly
                                    size="sm"
                                    variant="light"
                                    className="h-6 w-6 min-w-6"
                                    onPress={() => navigator.clipboard.writeText(log.message || '')}
                                    aria-label={t("tools.encoder.copy")}
                                >
                                    <Copy className="w-3 h-3 text-default-500" />
                                </Button>
                            )}
                            <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                color="danger"
                                className="h-6 w-6 min-w-6"
                                onClick={(e) => handleDeleteLog(log.id, e)}
                                aria-label={t("logManagement.deleteLogTitle")}
                            >
                                <Trash2 className="w-3 h-3" />
                            </Button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className={cn(
                      "pl-6",
                      !isExpanded && "max-h-32 overflow-hidden [mask-image:linear-gradient(to_bottom,black_75%,transparent)]",
                    )}>
                        {log.method ? (
                            <div className="flex flex-col gap-3">
                                {/* Method Name */}
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-primary font-bold font-mono text-small px-2 py-0.5 bg-primary/10 rounded">
                                        {log.method}
                                    </span>
                                    {(log.cryptoParams?.key || log.cryptoParams?.privateKey) && isExpanded && (
                                      <Button
                                        size="sm"
                                        variant="light"
                                        className="h-6 px-2 text-[11px] text-default-500"
                                        startContent={secretsRevealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                        onPress={() => setRevealedSecretLogIds((current) => {
                                          const next = new Set(current)
                                          if (next.has(summaryLog.id)) next.delete(summaryLog.id)
                                          else next.add(summaryLog.id)
                                          return next
                                        })}
                                      >
                                        {secretsRevealed ? t('common.hide', '隐藏敏感参数') : t('common.reveal', '显示敏感参数')}
                                      </Button>
                                    )}
                                </div>

                                {/* Crypto Params */}
                                {log.cryptoParams && Object.keys(log.cryptoParams).length > 0 && (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-2 rounded bg-default-50/50 border border-divider/30 text-xs">
                                        {log.cryptoParams.algorithm && (
                                            <div className="flex flex-col">
                                                <span className="text-default-500 font-semibold">{t('tools.hash.algorithm')}</span>
                                                <span className="font-mono text-default-700">{log.cryptoParams.algorithm}</span>
                                            </div>
                                        )}
                                        {log.cryptoParams.mode && (
                                            <div className="flex flex-col">
                                                <span className="text-default-500 font-semibold">{t('tools.hash.mode')}</span>
                                                <span className="font-mono text-default-700">{log.cryptoParams.mode}</span>
                                            </div>
                                        )}
                                        {log.cryptoParams.key_size && (
                                            <div className="flex flex-col">
                                                <span className="text-default-500 font-semibold">{t('tools.hash.keySize')}</span>
                                                <span className="font-mono text-default-700">{log.cryptoParams.key_size}</span>
                                            </div>
                                        )}
                                        {log.cryptoParams.iv_size && (
                                            <div className="flex flex-col">
                                                <span className="text-default-500 font-semibold">{t('tools.hash.ivSize')}</span>
                                                <span className="font-mono text-default-700">{log.cryptoParams.iv_size}</span>
                                            </div>
                                        )}
                                        {log.cryptoParams.format && (
                                            <div className="flex flex-col">
                                                <span className="text-default-500 font-semibold">{t('tools.hash.format')}</span>
                                                <span className="font-mono text-default-700">{log.cryptoParams.format}</span>
                                            </div>
                                        )}
                                        {log.cryptoParams.padding && (
                                            <div className="flex flex-col">
                                                <span className="text-default-500 font-semibold">{t('tools.hash.padding')}</span>
                                                <span className="font-mono text-default-700">{log.cryptoParams.padding}</span>
                                            </div>
                                        )}
                                        {log.cryptoParams.key_type && (
                                            <div className="flex flex-col">
                                                <span className="text-default-500 font-semibold">{t('tools.hash.keyType')}</span>
                                                <span className="font-mono text-default-700">{log.cryptoParams.key_type}</span>
                                            </div>
                                        )}
                                        {log.cryptoParams.nonce_type && (
                                            <div className="flex flex-col">
                                                <span className="text-default-500 font-semibold">{t('tools.hash.nonceType')}</span>
                                                <span className="font-mono text-default-700">{log.cryptoParams.nonce_type}</span>
                                            </div>
                                        )}
                                        {log.cryptoParams.iv && (
                                            <div className="col-span-2 flex flex-col">
                                                <span className="text-default-500 font-semibold">{t('tools.hash.iv')}</span>
                                                <span className="font-mono text-default-700 break-all">{log.cryptoParams.iv}</span>
                                            </div>
                                        )}
                                        {log.cryptoParams.nonce && (
                                            <div className="col-span-2 flex flex-col">
                                                <span className="text-default-500 font-semibold">{t('tools.hash.nonce')}</span>
                                                <span className="font-mono text-default-700 break-all">{log.cryptoParams.nonce}</span>
                                            </div>
                                        )}
                                        {log.cryptoParams.key && (
                                            <div className="col-span-2 flex flex-col">
                                                <span className="text-default-500 font-semibold">{t('tools.hash.key')}</span>
                                                <span className="font-mono text-default-700 break-all">{secretsRevealed ? log.cryptoParams.key : '••••••••'}</span>
                                            </div>
                                        )}
                                        {log.cryptoParams.publicKey && (
                                            <div className="col-span-2 flex flex-col">
                                                <span className="text-default-500 font-semibold">{t('tools.hash.publicKey')}</span>
                                                <span className="font-mono text-default-700 break-all">{log.cryptoParams.publicKey}</span>
                                            </div>
                                        )}
                                        {log.cryptoParams.privateKey && (
                                            <div className="col-span-2 flex flex-col">
                                                <span className="text-default-500 font-semibold">{t('tools.hash.privateKey')}</span>
                                                <span className="font-mono text-default-700 break-all">{secretsRevealed ? log.cryptoParams.privateKey : '••••••••'}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Input */}
                                <div className="group/input relative rounded-lg border border-default-200 bg-default-50/45 p-3">
                                    <div className="text-xs text-default-400 font-semibold mb-1 select-none">{t('log.input')}</div>
                                    <div className="text-sm font-mono text-default-600 break-all pr-8 whitespace-pre-wrap">
                                        {renderHighlightedText(log.input)}
                                    </div>
                                    <Button
                                        isIconOnly
                                        size="sm"
                                        variant="light"
                                        className="absolute right-2 top-2 h-6 w-6 min-w-6"
                                        onPress={() => navigator.clipboard.writeText(log.input || '')}
                                        aria-label={`${t("tools.encoder.copy")} ${t("log.input")}`}
                                    >
                                        <Copy className="w-3 h-3 text-default-400" />
                                    </Button>
                                </div>

                                {/* Output */}
                                <div className="group/output relative rounded-lg border border-default-200 bg-default-50/45 p-3">
                                    <div className="text-xs text-success/80 font-semibold mb-1 select-none">{t('log.output')}</div>
                                    <div className="text-sm font-mono text-foreground break-all pr-8 whitespace-pre-wrap">
                                        {renderHighlightedText(log.output)}
                                    </div>
                                    <Button
                                        isIconOnly
                                        size="sm"
                                        variant="light"
                                        className="absolute right-2 top-2 h-6 w-6 min-w-6"
                                        onPress={() => navigator.clipboard.writeText(log.output || '')}
                                        aria-label={`${t("tools.encoder.copy")} ${t("log.output")}`}
                                    >
                                        <Copy className="w-3 h-3 text-default-400" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-sm break-all font-mono leading-relaxed text-foreground/90 whitespace-pre-wrap">
                                {renderHighlightedText(log.message)}
                            </div>
                        )}

                        {/* Details */}
                        {log.details && (
                            <div className="mt-2 pt-2 border-t border-divider/50 text-xs text-default-400 break-all font-mono whitespace-pre-wrap">
                                {renderHighlightedText(log.details)}
                            </div>
                        )}

                        {/* Note */}
                        {log.note && (
                            <div className="mt-2 flex items-start gap-2 rounded bg-warning/10 p-2 text-xs text-amber-700 dark:text-warning">
                                <span className="font-semibold select-none">💡 {t('log.note')}:</span>
                                <span className="font-mono whitespace-pre-wrap">{log.note}</span>
                            </div>
                        )}
                    </div>
                 </article>
                 )
               })}
             </div>
           )}
        </ScrollShadow>
      </section>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange} backdrop="blur">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                {deleteTarget?.type === 'session' 
                  ? t("logManagement.deleteSessionTitle") 
                  : t("logManagement.deleteLogTitle")}
              </ModalHeader>
              <ModalBody>
                <p>
                  {deleteTarget?.type === 'session'
                    ? t("logManagement.confirmDeleteSession")
                    : t("logManagement.confirmDeleteLog")}
                </p>
              </ModalBody>
              <ModalFooter>
                <Button color="default" variant="light" onPress={onClose}>
                  {t("common.cancel")}
                </Button>
                <Button color="danger" onPress={confirmDelete}>
                  {t("common.delete")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}
