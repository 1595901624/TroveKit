import { useEffect, useMemo, useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import { Button, Card, Input, Spinner, Chip, ScrollShadow, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Tooltip } from "@heroui/react"
import { Trash2, RefreshCw, Search, Archive, Clock, AlertCircle, CheckCircle2, Info, AlertTriangle, Edit, X, Check, MessageSquare, Copy, Eye } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLog, type LogEntry } from "../contexts/LogContext"
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

/**
 * 日志管理工具组件
 * 提供日志会话管理、日志查看、搜索、删除等功能
 */
export function LogManagementTool() {
  const { t } = useTranslation()
  const { currentSessionId, refresh: refreshCurrentSession, switchToSession } = useLog()

  // 加载状态
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [loadingLogs, setLoadingLogs] = useState(false)
  // 数据状态
  const [sessions, setSessions] = useState<LogSessionSummary[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string>("")
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [query, setQuery] = useState("")
  const [error, setError] = useState<string | null>(null)

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
            className="bg-warning/20 text-warning-600 dark:text-warning rounded px-0.5 select-none" 
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

  /** 根据搜索查询条件过滤日志 */
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

  // 初始化时加载会话列表
  useEffect(() => {
    reloadSessions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 当活动会话变化时加载对应日志
  useEffect(() => {
    if (activeSessionId) {
        reloadLogs(activeSessionId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId])

  // 监听日志变化事件
  useEffect(() => {
    const handleLogsChanged = () => {
      reloadSessions(true)
      if (activeSessionId) {
        reloadLogs(activeSessionId)
      }
    }
    window.addEventListener('logs-changed', handleLogsChanged)
    return () => window.removeEventListener('logs-changed', handleLogsChanged)
  }, [activeSessionId])

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
      // 更新会话计数或重新加载
      await reloadSessions(true)
      
      // 通知其他组件
      window.dispatchEvent(new CustomEvent('logs-changed'))
      
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
      
      // 通知其他组件
      window.dispatchEvent(new CustomEvent('logs-changed'))

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
      
      // 通知其他组件
      window.dispatchEvent(new CustomEvent('logs-changed'))
      
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
    <div className="flex h-[calc(100vh-140px)] gap-4 w-full">
      {/* Sidebar: Sessions List */}
      <Card className="w-72 h-full flex-none bg-content1/50">
        <div className="p-3 border-b border-divider flex items-center justify-between bg-content1/50 backdrop-blur-md">
          <div className="text-sm font-semibold flex items-center gap-2">
            <Archive className="w-4 h-4" />
            {t("logManagement.sessions")}
          </div>
          <Button isIconOnly size="sm" variant="light" onPress={() => reloadSessions(true)} isLoading={loadingSessions}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        
        <ScrollShadow className="flex-1 p-2 space-y-1">
          {sessions.length === 0 && !loadingSessions && (
             <div className="text-center text-default-400 text-xs py-4">
               {t("logManagement.noSessions")}
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
              <div className="flex items-start justify-between gap-1">
                <div className="flex-1 min-w-0">
                  {editingSessionNote === s.sessionId ? (
                    <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
                      <Input
                        size="sm"
                        value={sessionNoteInput}
                        onValueChange={setSessionNoteInput}
                        placeholder={t("logManagement.sessionNotePlaceholder")}
                        className="text-xs"
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
                        >
                          <Check className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className={cn(
                      "text-xs font-bold truncate",
                      s.note ? "text-warning-600 dark:text-warning" : "text-default-500 font-mono"
                    )}>
                      {s.note ? `💡 ${s.note}` : `# ${s.sessionId.slice(0, 8)}`}
                    </div>
                  )}
                </div>
                <div className="flex gap-0.5 shrink-0">
                  <Tooltip content={t("logManagement.switchToSession")}>
                    <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        className="w-6 h-6 min-w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => handleSwitchToSession(s.sessionId, e)}
                        color="primary"
                    >
                        <Eye className="w-3 h-3" />
                    </Button>
                  </Tooltip>
                  <Tooltip content={t("logManagement.editSessionNote")}>
                    <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        className="w-6 h-6 min-w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => handleStartEditSessionNote(s.sessionId, s.note, e)}
                    >
                        {s.note ? <MessageSquare className="w-3 h-3 text-warning" /> : <Edit className="w-3 h-3" />}
                    </Button>
                  </Tooltip>
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
              </div>
              
              <div className="flex items-center justify-between text-tiny text-default-400 mt-0.5">
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
        </ScrollShadow>
      </Card>

      {/* Main Content: Logs List */}
      <Card className="flex-1 h-full bg-content1/50 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="p-3 border-b border-divider flex items-center justify-between gap-4 bg-content1/50 backdrop-blur-md shrink-0">
             <Input
                size="sm"
                startContent={<Search className="w-4 h-4 text-default-400" />}
                placeholder={t("logManagement.searchPlaceholder")}
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
                <Spinner label={t("common.loading")} />
             </div>
           ) : filteredLogs.length === 0 ? (
             <div className="text-center text-default-400 py-20 flex flex-col items-center gap-2">
                <Search className="w-10 h-10 opacity-20" />
                <p>{t("logManagement.empty")}</p>
             </div>
           ) : (
            <div className="space-y-3">
               {filteredLogs.map((log) => (
                 <div key={log.id} className="group relative p-4 rounded-xl border border-divider bg-content1 hover:bg-content2 transition-colors">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                            {getLogIcon(log.type)}
                            <time className="text-xs text-default-500 font-mono">
                                {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </time>
                        </div>
                        
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* Copy Message Button for non-method logs */}
                            {!log.method && (
                                <Button
                                    isIconOnly
                                    size="sm"
                                    variant="light"
                                    className="h-6 w-6 min-w-6"
                                    onPress={() => navigator.clipboard.writeText(log.message || '')}
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
                            >
                                <Trash2 className="w-3 h-3" />
                            </Button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="pl-6">
                        {log.method ? (
                            <div className="flex flex-col gap-3">
                                {/* Method Name */}
                                <div>
                                    <span className="text-primary font-bold font-mono text-small px-2 py-0.5 bg-primary/10 rounded">
                                        {log.method}
                                    </span>
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
                                                <span className="font-mono text-default-700 break-all">{log.cryptoParams.key}</span>
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
                                                <span className="font-mono text-default-700 break-all">{log.cryptoParams.privateKey}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Input */}
                                <div className="group/input relative p-3 rounded bg-default-100/50 hover:bg-default-100 transition-colors">
                                    <div className="text-xs text-default-400 font-semibold mb-1 select-none">{t('log.input')}</div>
                                    <div className="text-sm font-mono text-default-600 break-all pr-8 whitespace-pre-wrap">
                                        {renderHighlightedText(log.input)}
                                    </div>
                                    <Button
                                        isIconOnly
                                        size="sm"
                                        variant="light"
                                        className="absolute top-2 right-2 h-6 w-6 min-w-6 opacity-0 group-hover/input:opacity-100"
                                        onPress={() => navigator.clipboard.writeText(log.input || '')}
                                    >
                                        <Copy className="w-3 h-3 text-default-400" />
                                    </Button>
                                </div>

                                {/* Output */}
                                <div className="group/output relative p-3 rounded bg-default-100/50 hover:bg-default-100 transition-colors">
                                    <div className="text-xs text-success/80 font-semibold mb-1 select-none">{t('log.output')}</div>
                                    <div className="text-sm font-mono text-foreground break-all pr-8 whitespace-pre-wrap">
                                        {renderHighlightedText(log.output)}
                                    </div>
                                    <Button
                                        isIconOnly
                                        size="sm"
                                        variant="light"
                                        className="absolute top-2 right-2 h-6 w-6 min-w-6 opacity-0 group-hover/output:opacity-100"
                                        onPress={() => navigator.clipboard.writeText(log.output || '')}
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
                            <div className="mt-2 flex items-start gap-2 text-xs bg-warning/10 text-warning-700 dark:text-warning-400 p-2 rounded">
                                <span className="font-semibold select-none">💡 {t('log.note')}:</span>
                                <span className="font-mono whitespace-pre-wrap">{log.note}</span>
                            </div>
                        )}
                    </div>
                 </div>
               ))}
             </div>
           )}
        </ScrollShadow>
      </Card>

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