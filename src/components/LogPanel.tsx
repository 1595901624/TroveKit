// 导入必要的依赖
import { useLogData, useLogUI, LogEntry } from "../contexts/LogContext" // 日志上下文
import { Trash2, X, Terminal, Info, CheckCircle, AlertTriangle, AlertCircle, Copy, Plus, Edit, Check, MessageSquare } from "lucide-react" // 图标
import { Button, ScrollShadow, Tooltip, Input } from "../components/ui/base-ui" // UI 组件
import { useTranslation } from "react-i18next" // 国际化
import { useEffect, useMemo, useRef, useState } from "react" // React hooks
import { usePersistentState } from "../hooks/usePersistentState"
import { cn } from "../lib/utils"

// 过滤器类型定义：日志类型或全部
type FilterType = LogEntry['type'] | 'all'

const LOG_PANEL_MIN_WIDTH = 280
const LOG_PANEL_MAX_WIDTH = 640
const LOG_PANEL_DEFAULT_WIDTH = 320
const MAX_VISIBLE_PANEL_LOGS = 50
const LOG_PANEL_TRANSITION_MS = 200

const clampLogPanelWidth = (width: number) => Math.min(LOG_PANEL_MAX_WIDTH, Math.max(LOG_PANEL_MIN_WIDTH, width))

type ResizeOrigin = { pointerX: number; width: number }

/** @internal Exported for the clamp/reverse-drag regression test. */
export const resolveLogPanelResize = (origin: ResizeOrigin, pointerX: number) => {
  const rawWidth = origin.width + origin.pointerX - pointerX
  const width = clampLogPanelWidth(rawWidth)
  return {
    width,
    // 命中边界后以当前指针为新原点，反向拖动一像素即可立即恢复，不产生回拖死区。
    origin: rawWidth === width ? origin : { pointerX, width },
  }
}

// 日志面板组件
export function LogPanel() {
  // 从日志上下文中获取数据和方法
    const { isOpen, setIsOpen } = useLogUI()
    const { logs, clearLogs, createNewLog, addNote, removeNote, sessionNote, updateSessionNote, removeSessionNote } = useLogData()
  // 国际化钩子
  const { t } = useTranslation()
  // 过滤器状态，默认显示全部
  const [filter, setFilter] = useState<FilterType>('all')
  // 编辑备注的状态
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteInput, setNoteInput] = useState('')
  // 会话备注编辑状态
  const [editingSessionNote, setEditingSessionNote] = useState(false)
  const [sessionNoteInput, setSessionNoteInput] = useState('')
  const [storedWidth, setStoredWidth, , isStoredWidthLoaded] = usePersistentState<number>("log-panel-width", LOG_PANEL_DEFAULT_WIDTH)
  const [panelWidth, setPanelWidth] = useState(LOG_PANEL_DEFAULT_WIDTH)
  const [isResizing, setIsResizing] = useState(false)
  const [shouldRenderContent, setShouldRenderContent] = useState(isOpen)
  const panelWidthRef = useRef(LOG_PANEL_DEFAULT_WIDTH)
  const resizeOriginRef = useRef<ResizeOrigin | null>(null)
  const panelRef = useRef<HTMLElement | null>(null)
  const panelContentRef = useRef<HTMLDivElement | null>(null)

  const updatePanelWidth = (width: number) => {
    const nextWidth = clampLogPanelWidth(width)
    panelWidthRef.current = nextWidth
    setPanelWidth(nextWidth)
  }

  useEffect(() => {
    if (isStoredWidthLoaded) {
      updatePanelWidth(typeof storedWidth === "number" && Number.isFinite(storedWidth) ? storedWidth : LOG_PANEL_DEFAULT_WIDTH)
    }
  }, [isStoredWidthLoaded, storedWidth])

  useEffect(() => {
    if (isOpen) {
      setShouldRenderContent(true)
      return
    }

    // 先让宽度过渡完成，再卸载长日志 DOM，兼顾关闭动画和内存回收。
    const timer = window.setTimeout(() => setShouldRenderContent(false), LOG_PANEL_TRANSITION_MS)
    return () => window.clearTimeout(timer)
  }, [isOpen])

  useEffect(() => () => {
    document.body.style.cursor = ""
    document.body.style.userSelect = ""
  }, [])

  const startResize = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isOpen) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    resizeOriginRef.current = { pointerX: event.clientX, width: panelWidthRef.current }
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
    setIsResizing(true)
  }

  const resize = (event: React.PointerEvent<HTMLDivElement>) => {
    const origin = resizeOriginRef.current
    if (!origin) return

    // 拖拽时直接修改两个容器宽度，避免每个 pointermove 都让整份日志列表重渲染。
    const next = resolveLogPanelResize(origin, event.clientX)
    resizeOriginRef.current = next.origin
    panelWidthRef.current = next.width
    if (panelRef.current) panelRef.current.style.width = `${next.width}px`
    if (panelContentRef.current) panelContentRef.current.style.width = `${next.width}px`
  }

  const finishResize = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeOriginRef.current) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    resizeOriginRef.current = null
    document.body.style.cursor = ""
    document.body.style.userSelect = ""
    setIsResizing(false)
    setPanelWidth(panelWidthRef.current)
    setStoredWidth(panelWidthRef.current)
    window.dispatchEvent(new Event("resize"))
  }

  const resizeWithKeyboard = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
    event.preventDefault()
    const direction = event.key === "ArrowLeft" ? 1 : -1
    const step = event.shiftKey ? 40 : 10
    const nextWidth = clampLogPanelWidth(panelWidthRef.current + direction * step)
    updatePanelWidth(nextWidth)
    setStoredWidth(nextWidth)
    window.dispatchEvent(new Event("resize"))
  }

  // 使用 useMemo 优化性能，根据过滤器筛选日志
  const matchingLogs = useMemo(() => {
    if (filter === 'all') return logs
    return logs.filter(log => log.type === filter)
  }, [logs, filter])

  // 侧栏定位为“近期活动”，完整历史由日志管理页分页承载。
  const visibleLogs = useMemo(
    () => matchingLogs.slice(0, MAX_VISIBLE_PANEL_LOGS),
    [matchingLogs],
  )

  // 开始编辑备注
  const handleStartEditNote = (logId: string, currentNote?: string) => {
    setEditingNoteId(logId)
    setNoteInput(currentNote || '')
  }

  // 取消编辑备注
  const handleCancelEdit = () => {
    setEditingNoteId(null)
    setNoteInput('')
  }

  // 保存备注
  const handleSaveNote = (logId: string) => {
    if (noteInput.trim()) {
      addNote(logId, noteInput.trim())
      setEditingNoteId(null)
      setNoteInput('')
    }
  }

  // 删除备注
  const handleRemoveNote = (logId: string) => {
    removeNote(logId)
  }

  // 开始编辑会话备注
  const handleStartEditSessionNote = () => {
    setEditingSessionNote(true)
    setSessionNoteInput(sessionNote || '')
  }

  // 取消编辑会话备注
  const handleCancelEditSessionNote = () => {
    setEditingSessionNote(false)
    setSessionNoteInput('')
  }

  // 保存会话备注
  const handleSaveSessionNote = async () => {
    if (sessionNoteInput.trim()) {
      await updateSessionNote(sessionNoteInput.trim())
    } else {
      await removeSessionNote()
    }
    setEditingSessionNote(false)
    setSessionNoteInput('')
  }

  // 根据日志类型返回对应图标
  const getIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-3.5 h-3.5 text-success" /> // 成功图标
      case 'error': return <AlertCircle className="w-3.5 h-3.5 text-danger" /> // 错误图标
      case 'warning': return <AlertTriangle className="w-3.5 h-3.5 text-warning" /> // 警告图标
      default: return <Info className="w-3.5 h-3.5 text-primary" /> // 信息图标
    }
  }

  // 过滤器配置数组
  const filters: { key: FilterType; label: string; color: any }[] = [
    { key: 'all', label: t('log.filterAll'), color: 'default' }, // 全部
    { key: 'error', label: t('log.filterError'), color: 'danger' }, // 错误
    { key: 'success', label: t('log.filterSuccess'), color: 'success' }, // 成功
    { key: 'info', label: t('log.filterInfo'), color: 'primary' }, // 信息
    { key: 'warning', label: t('log.filterWarning'), color: 'warning' }, // 警告
  ]

  // 获取尾部空白字符的描述
  const getTrailingDescription = (trailing: string) => {
    if (trailing.includes('\n') || trailing.includes('\r')) return t('log.trailingNewline', 'Trailing newline')
    if (trailing.includes('\t')) return t('log.trailingTab', 'Trailing tab')
    return t('log.trailingSpaces', 'Trailing spaces')
  }

  // 渲染带有高亮后缀空格和换行的文本
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

  return (
        <aside
            ref={panelRef}
            className={cn(
                "relative h-full shrink-0 overflow-hidden bg-background",
                !isResizing && "transition-[width] duration-200",
                !isOpen && "pointer-events-none",
            )}
            style={{ width: isOpen ? panelWidth : 0 }}
            aria-label={t('log.title', 'Operation Log')}
            aria-hidden={!isOpen}
        >
            {shouldRenderContent && (
            <div ref={panelContentRef} className="flex h-full min-w-0 flex-col border-l border-divider" style={{ width: panelWidth }}>
            {/* 面板头部：标题和操作按钮 */}
            <div className="h-14 border-b border-divider flex items-center justify-between px-4 shrink-0 bg-background/40">
                {/* 标题区域 */}
                <div className="flex items-center gap-2 font-semibold text-small">
                    <Terminal className="w-4 h-4" /> {/* 终端图标 */}
                    {t('log.title', 'Operation Log')} {/* 标题文本，支持国际化 */}
                </div>
                {/* 操作按钮区域 */}
                <div className="flex items-center gap-1">
                    {/* 新建日志按钮 */}
                    <Tooltip content={t('tools.logManager.newLog', 'New Log')}>
                        <Button isIconOnly size="sm" variant="light" onPress={createNewLog} aria-label={t('tools.logManager.newLog', 'New Log')}>
                            <Plus className="w-4 h-4 text-default-500" />
                        </Button>
                    </Tooltip>
                    {/* 清空日志按钮 */}
                    <Tooltip content={t('log.clear', 'Clear logs')}>
                        <Button isIconOnly size="sm" variant="light" onPress={clearLogs} aria-label={t('log.clear', 'Clear logs')}>
                            <Trash2 className="w-4 h-4 text-default-500" />
                        </Button>
                    </Tooltip>
                    {/* 关闭面板按钮 */}
                    <Button isIconOnly size="sm" variant="light" onPress={() => setIsOpen(false)} aria-label={t('common.close', 'Close')}>
                        <X className="w-4 h-4 text-default-500" />
                    </Button>
                </div>
            </div>

            {/* 会话备注区域 */}
            <div className="px-3 py-2 border-b border-divider shrink-0">
                {editingSessionNote ? (
                    <div className="flex items-center gap-2">
                        <Input
                            size="sm"
                            value={sessionNoteInput}
                            onValueChange={setSessionNoteInput}
                            placeholder={t('log.sessionNotePlaceholder', 'Enter session note...')}
                            className="flex-1"
                            autoFocus
                            maxLength={100}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveSessionNote()
                                if (e.key === 'Escape') handleCancelEditSessionNote()
                            }}
                        />
                        <Button isIconOnly size="sm" variant="light" onPress={handleCancelEditSessionNote} aria-label={t('common.cancel', 'Cancel')}>
                            <X className="w-3.5 h-3.5" />
                        </Button>
                        <Button isIconOnly size="sm" variant="flat" color="primary" onPress={handleSaveSessionNote} aria-label={t('common.save', 'Save')}>
                            <Check className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                ) : sessionNote ? (
                    <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded bg-warning/10 px-2 py-1.5 text-left text-tiny text-amber-700 transition-colors hover:bg-warning/20 dark:text-warning"
                        onClick={handleStartEditSessionNote}
                    >
                        <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate flex-1">{sessionNote}</span>
                        <Edit className="w-3 h-3 opacity-50" />
                    </button>
                ) : (
                    <Button
                        size="sm"
                        variant="light"
                        className="w-full h-7 text-tiny text-default-400"
                        startContent={<Plus className="w-3 h-3" />}
                        onPress={handleStartEditSessionNote}
                    >
                        {t('log.addSessionNote', 'Add Session Note')}
                    </Button>
                )}
            </div>

            {/* 过滤器区域：日志类型筛选按钮 */}
            <div className="px-3 py-2 border-b border-divider flex gap-1 overflow-x-auto scrollbar-hide shrink-0">
                {filters.map((f) => (
                    <Button
                        key={f.key} // 唯一标识
                        size="sm" // 小号按钮
                        variant={filter === f.key ? "flat" : "light"} // 当前选中为扁平样式，其他为轻量样式
                        color={filter === f.key ? f.color : "default"} // 选中时显示对应颜色，否则默认
                        className="h-7 px-2 min-w-0 text-tiny font-medium" // 样式：高度、内边距、最小宽度、小字体、中等字重
                        onPress={() => setFilter(f.key)} // 点击切换过滤器
                    >
                        {f.label} {/* 按钮文本 */}
                    </Button>
                ))}
            </div>
            
            {/* 日志列表区域：可滚动 */}
            <ScrollShadow className="min-w-0 flex-1 overflow-y-auto p-3">
                <div className="min-w-0 space-y-3">
                    {/* 空状态处理 */}
                    {matchingLogs.length === 0 ? (
                         <div className="text-center text-default-400 py-8 text-small">
                            {/* 根据当前过滤器显示不同的空状态文本 */}
                            {filter === 'all' ? t('log.empty', 'No logs yet') : t('log.emptyFilter', 'No logs match this filter')}
                         </div>
                    ) : (
                        // 日志列表渲染
                        visibleLogs.map((log) => (
                            // 单个日志项容器
                            <div
                                key={log.id}
                                className="group min-w-0 rounded-medium border border-transparent bg-content2/50 p-3 transition-colors hover:border-divider"
                            >
                                {/* 日志头部：类型图标、时间戳、复制按钮 */}
                                <div className="flex items-start justify-between gap-2 mb-1">
                                    <div className="flex items-center gap-1.5 text-tiny text-default-500">
                                         {getIcon(log.type)} {/* 类型图标 */}
                                         <time>{new Date(log.timestamp).toLocaleString()}</time> {/* 时间戳 */}
                                    </div>
                                    {/* 复制按钮：仅在没有方法名时显示（普通日志） */}
                                    {!log.method && (
                                        <Button
                                            isIconOnly
                                            size="sm"
                                            variant="light"
                                            className="h-5 w-5 min-w-5 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[hover=true]:bg-default/40" // 默认隐藏，悬停或聚焦显示
                                            onPress={() => navigator.clipboard.writeText(log.message || '')} // 复制消息内容
                                            aria-label={t('tools.encoder.copy', 'Copy')}
                                        >
                                            <Copy className="w-3 h-3 text-default-500" />
                                        </Button>
                                    )}
                                </div>
                                
                                {/* 日志内容：方法日志和普通日志两种格式 */}
                                {log.method ? (
                                    // 方法日志格式：包含输入和输出
                                    <div className="flex flex-col gap-2 mt-1">
                                        {/* 方法名显示 */}
                                        <div className="flex items-center gap-2">
                                            <span className="text-primary font-bold font-mono text-small px-1.5 py-0.5 bg-primary/10 rounded">
                                                {log.method}
                                            </span>
                                        </div>

                                        {/* 加密参数信息：如果有 cryptoParams 则显示 */}
                                        {log.cryptoParams && Object.keys(log.cryptoParams).length > 0 && (
                                            <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded bg-default-50/50 border border-divider/30">
                                                {log.cryptoParams.algorithm && (
                                                    <div className="text-tiny">
                                                        <span className="text-default-500 font-semibold">{t('tools.hash.algorithm')}</span>
                                                        <span className="font-mono ml-1 text-default-700">{log.cryptoParams.algorithm}</span>
                                                    </div>
                                                )}
                                                {log.cryptoParams.mode && (
                                                    <div className="text-tiny">
                                                        <span className="text-default-500 font-semibold">{t('tools.hash.mode')}</span>
                                                        <span className="font-mono ml-1 text-default-700">{log.cryptoParams.mode}</span>
                                                    </div>
                                                )}
                                                {log.cryptoParams.key_size && (
                                                    <div className="text-tiny">
                                                        <span className="text-default-500 font-semibold">{t('tools.hash.keySize')}</span>
                                                        <span className="font-mono ml-1 text-default-700">{log.cryptoParams.key_size}</span>
                                                    </div>
                                                )}
                                                {log.cryptoParams.iv_size && (
                                                    <div className="text-tiny">
                                                        <span className="text-default-500 font-semibold">{t('tools.hash.ivSize', 'IV Size')}</span>
                                                        <span className="font-mono ml-1 text-default-700">{log.cryptoParams.iv_size}</span>
                                                    </div>
                                                )}
                                                {log.cryptoParams.format && (
                                                    <div className="text-tiny">
                                                        <span className="text-default-500 font-semibold">{t('tools.hash.format')}</span>
                                                        <span className="font-mono ml-1 text-default-700">{log.cryptoParams.format}</span>
                                                    </div>
                                                )}
                                                {log.cryptoParams.padding && (
                                                    <div className="text-tiny">
                                                        <span className="text-default-500 font-semibold">{t('tools.hash.padding')}</span>
                                                        <span className="font-mono ml-1 text-default-700">{log.cryptoParams.padding}</span>
                                                    </div>
                                                )}
                                                {log.cryptoParams.key_type && (
                                                    <div className="text-tiny">
                                                        <span className="text-default-500 font-semibold">{t('tools.hash.keyType')}</span>
                                                        <span className="font-mono ml-1 text-default-700">{log.cryptoParams.key_type}</span>
                                                    </div>
                                                )}
                                                {log.cryptoParams.nonce_type && (
                                                    <div className="text-tiny">
                                                        <span className="text-default-500 font-semibold">{t('tools.hash.nonceType')}</span>
                                                        <span className="font-mono ml-1 text-default-700">{log.cryptoParams.nonce_type}</span>
                                                    </div>
                                                )}
                                                {log.cryptoParams.iv && (
                                                    <div className="col-span-2 text-tiny">
                                                        <span className="text-default-500 font-semibold">{t('tools.hash.iv')}</span>
                                                        <span className="font-mono ml-1 text-default-700 break-all">{log.cryptoParams.iv}</span>
                                                    </div>
                                                )}
                                                {log.cryptoParams.nonce && (
                                                    <div className="col-span-2 text-tiny">
                                                        <span className="text-default-500 font-semibold">{t('tools.hash.nonce')}</span>
                                                        <span className="font-mono ml-1 text-default-700 break-all">{log.cryptoParams.nonce}</span>
                                                    </div>
                                                )}
                                                {log.cryptoParams.key && (
                                                    <div className="col-span-2 text-tiny">
                                                        <span className="text-default-500 font-semibold">{t('tools.hash.key')}</span>
                                                        <span className="font-mono ml-1 text-default-700 select-none">••••••••</span>
                                                    </div>
                                                )}
                                                {log.cryptoParams.publicKey && (
                                                    <div className="col-span-2 text-tiny">
                                                        <span className="text-default-500 font-semibold">{t('tools.hash.publicKey')}</span>
                                                        <span className="font-mono ml-1 text-default-700 break-all">{log.cryptoParams.publicKey}</span>
                                                    </div>
                                                )}
                                                {log.cryptoParams.privateKey && (
                                                    <div className="col-span-2 text-tiny">
                                                        <span className="text-default-500 font-semibold">{t('tools.hash.privateKey')}</span>
                                                        <span className="font-mono ml-1 text-default-700 select-none">••••••••</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                         
                                        {/* 输入和输出区域 */}
                                        <div className="space-y-1.5">
                                            {/* 输入部分 */}
                                            <div className="group/input relative min-w-0 rounded bg-default-100/50 p-2 transition-colors hover:bg-default-100">
                                                <div className="text-tiny text-default-400 font-semibold mb-0.5 select-none">{t('log.input', 'Input')}</div>
                                                <div className="min-w-0 whitespace-pre-wrap break-all pr-6 font-mono text-small text-default-600">
                                                    {renderHighlightedText(log.input)}
                                                </div>
                                                {/* 复制输入按钮 */}
                                                <Button
                                                    isIconOnly
                                                    size="sm"
                                                    variant="light"
                                                    className="absolute top-1 right-1 h-5 w-5 min-w-5 opacity-0 group-hover/input:opacity-100 focus-visible:opacity-100"
                                                    onPress={() => navigator.clipboard.writeText(log.input || '')}
                                                    aria-label={`${t('tools.encoder.copy', 'Copy')} ${t('log.input', 'Input')}`}
                                                >
                                                    <Copy className="w-3 h-3 text-default-400" />
                                                </Button>
                                            </div>

                                            {/* 输出部分 */}
                                            <div className="group/output relative min-w-0 rounded bg-default-100/50 p-2 transition-colors hover:bg-default-100">
                                                <div className="text-tiny text-success/80 font-semibold mb-0.5 select-none">{t('log.output', 'Output')}</div>
                                                <div className="min-w-0 whitespace-pre-wrap break-all pr-6 font-mono text-small text-foreground">
                                                    {renderHighlightedText(log.output)}
                                                </div>
                                                {/* 复制输出按钮 */}
                                                <Button
                                                    isIconOnly
                                                    size="sm"
                                                    variant="light"
                                                    className="absolute top-1 right-1 h-5 w-5 min-w-5 opacity-0 group-hover/output:opacity-100 focus-visible:opacity-100"
                                                    onPress={() => navigator.clipboard.writeText(log.output || '')}
                                                    aria-label={`${t('tools.encoder.copy', 'Copy')} ${t('log.output', 'Output')}`}
                                                >
                                                    <Copy className="w-3 h-3 text-default-400" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    // 普通日志格式：直接显示消息
                                    <div className="min-w-0 whitespace-pre-wrap break-all font-mono text-small leading-relaxed text-foreground/90">
                                        {renderHighlightedText(log.message)}
                                    </div>
                                )}
                                
                                {/* 详情信息：如果有则显示 */}
                                {log.details && (
                                    <div className="mt-1.5 min-w-0 whitespace-pre-wrap break-all border-t border-divider/50 pt-1.5 font-mono text-tiny text-default-400">
                                        {renderHighlightedText(log.details)}
                                    </div>
                                )}

                                {/* 备注区域 */}
                                <div className="mt-2 pt-2 border-t border-divider/50">
                                    {/* 如果有备注，显示备注内容 */}
                                    {log.note && editingNoteId !== log.id && (
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 text-tiny text-foreground/80 font-mono bg-default-100/50 rounded px-2 py-1">
                                                💡 {log.note}
                                            </div>
                                            <div className="flex gap-1">
                                                <Tooltip content={t('log.editNote', 'Edit Note')}>
                                                    <Button
                                                        isIconOnly
                                                        size="sm"
                                                        variant="light"
                                                        className="h-5 w-5 min-w-5"
                                                        onPress={() => handleStartEditNote(log.id, log.note)}
                                                        aria-label={t('log.editNote', 'Edit Note')}
                                                    >
                                                        <Edit className="w-3 h-3 text-default-500" />
                                                    </Button>
                                                </Tooltip>
                                                <Tooltip content={t('log.removeNote', 'Remove Note')}>
                                                    <Button
                                                        isIconOnly
                                                        size="sm"
                                                        variant="light"
                                                        className="h-5 w-5 min-w-5"
                                                        onPress={() => handleRemoveNote(log.id)}
                                                        aria-label={t('log.removeNote', 'Remove Note')}
                                                    >
                                                        <X className="w-3 h-3 text-danger" />
                                                    </Button>
                                                </Tooltip>
                                            </div>
                                        </div>
                                    )}

                                    {/* 编辑备注输入框 */}
                                    {editingNoteId === log.id && (
                                        <div className="space-y-2">
                                            <textarea
                                                value={noteInput}
                                                onChange={(e) => setNoteInput(e.target.value)}
                                                placeholder={t('log.notePlaceholder', 'Enter note...')}
                                                className="w-full text-small font-mono bg-default-100/50 rounded px-2 py-1 border border-divider focus:border-primary focus:outline-none resize-none"
                                                rows={2}
                                                maxLength={100}
                                            />
                                            <div className="flex gap-1 justify-end">
                                                <Button
                                                    size="sm"
                                                    variant="light"
                                                    className="h-7 px-2"
                                                    onPress={handleCancelEdit}
                                                >
                                                    {t('log.cancel', 'Cancel')}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    color="primary"
                                                    className="h-7 px-2"
                                                    onPress={() => handleSaveNote(log.id)}
                                                    isDisabled={!noteInput.trim()}
                                                >
                                                    {t('log.saveNote', 'Save Note')}
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {/* 添加备注按钮（当没有备注且不在编辑状态时显示） */}
                                    {!log.note && editingNoteId !== log.id && (
                                        <Tooltip content={t('log.addNote', 'Add Note')}>
                                            <Button
                                                size="sm"
                                                variant="light"
                                                className="h-6 px-2 text-tiny opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                                                startContent={<Plus className="w-3 h-3" />}
                                                onPress={() => handleStartEditNote(log.id)}
                                            >
                                                {t('log.addNote', 'Add Note')}
                                            </Button>
                                        </Tooltip>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                    {matchingLogs.length > visibleLogs.length && (
                        <div className="px-2 py-3 text-center text-tiny text-default-400">
                            {t('log.recentLimit', { count: MAX_VISIBLE_PANEL_LOGS })}
                        </div>
                    )}
                </div>
            </ScrollShadow>
            </div>
            )}

            {isOpen && (
                <div
                    className="group absolute inset-y-0 left-0 z-20 w-2 cursor-col-resize touch-none outline-none"
                    role="separator"
                    aria-label={t("common.resizeLogPanel", "调整日志面板宽度")}
                    aria-orientation="vertical"
                    aria-valuemin={LOG_PANEL_MIN_WIDTH}
                    aria-valuemax={LOG_PANEL_MAX_WIDTH}
                    aria-valuenow={Math.round(panelWidth)}
                    tabIndex={0}
                    onPointerDown={startResize}
                    onPointerMove={resize}
                    onPointerUp={finishResize}
                    onPointerCancel={finishResize}
                    onKeyDown={resizeWithKeyboard}
                >
                    <div className={cn(
                        "absolute inset-y-0 left-0 w-px bg-transparent transition-colors group-hover:bg-primary/50 group-focus-visible:bg-primary/70",
                        isResizing && "bg-primary/70",
                    )} />
                </div>
            )}
        </aside>
  )
}
