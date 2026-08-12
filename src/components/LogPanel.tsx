// 导入必要的依赖
import { useLogData, useLogUI, LogEntry } from "../contexts/LogContext" // 日志上下文
import { Terminal, Info, CheckCircle, AlertTriangle, AlertCircle, Copy, Search, CircleX } from "lucide-react" // 图标
import { Button, ScrollShadow } from "../components/ui/base-ui" // UI 组件
import { useTranslation } from "react-i18next" // 国际化
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react" // React hooks
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
    const { isOpen } = useLogUI()
    const { logs } = useLogData()
  // 国际化钩子
  const { t } = useTranslation()
  // 过滤器状态，默认显示全部
  const [filter, setFilter] = useState<FilterType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const deferredSearchQuery = useDeferredValue(searchQuery)
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

  const filterCounts = useMemo(() => logs.reduce<Record<FilterType, number>>((counts, log) => {
    counts.all += 1
    counts[log.type] += 1
    return counts
  }, { all: 0, error: 0, success: 0, info: 0, warning: 0 }), [logs])

  // 类型筛选与文本搜索只在至多 100 条近期日志中执行；延迟搜索值避免输入时阻塞。
  const matchingLogs = useMemo(() => {
    const query = deferredSearchQuery.trim().toLocaleLowerCase()
    return logs.filter((log) => {
      if (filter !== 'all' && log.type !== filter) return false
      if (!query) return true

      const searchableText = [
        log.method,
        log.input,
        log.output,
        log.message,
        log.details,
        log.note,
        log.cryptoParams ? Object.values(log.cryptoParams).join(' ') : '',
      ].filter(Boolean).join('\n').toLocaleLowerCase()
      return searchableText.includes(query)
    })
  }, [logs, filter, deferredSearchQuery])

  // 侧栏定位为“近期活动”，完整历史由日志管理页分页承载。
  const visibleLogs = useMemo(
    () => matchingLogs.slice(0, MAX_VISIBLE_PANEL_LOGS),
    [matchingLogs],
  )

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
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-divider/80 px-4">
                <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-default-100 text-default-600">
                        <Terminal className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                        <div className="truncate font-semibold text-small">{t('log.title', 'Operation Log')}</div>
                        <div className="text-[11px] leading-4 text-default-400">
                            {t('log.recentActivity', 'Recent activity')} · {logs.length}
                        </div>
                    </div>
                </div>
            </div>

            {/* 快速查找仅作用于当前加载的近期日志。 */}
            <div className="shrink-0 border-b border-divider/70 px-3 py-2.5">
                <label className="flex h-8 min-w-0 items-center gap-2 rounded-md border border-divider bg-default-50/60 px-2.5 transition-colors focus-within:border-primary/50 focus-within:bg-background">
                    <Search className="h-3.5 w-3.5 shrink-0 text-default-400" />
                    <input
                        type="search"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder={t('log.searchPlaceholder', 'Search recent logs')}
                        className="min-w-0 flex-1 bg-transparent text-tiny text-foreground placeholder:text-default-400 focus:outline-none"
                        aria-label={t('log.searchPlaceholder', 'Search recent logs')}
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-default-400 hover:bg-default-100 hover:text-foreground"
                            onClick={() => setSearchQuery('')}
                            aria-label={t('common.clear', 'Clear')}
                        >
                            <CircleX className="h-3.5 w-3.5" />
                        </button>
                    )}
                </label>
            </div>

            {/* 类型筛选是面板唯一的主工具栏。 */}
            <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-divider/70 px-3 py-2 scrollbar-hide">
                {filters.map((f) => (
                    <Button
                        key={f.key}
                        size="sm"
                        variant={filter === f.key ? "flat" : "light"}
                        color={filter === f.key ? f.color : "default"}
                        className="h-7 min-w-0 gap-1 px-2 text-tiny font-medium"
                        onPress={() => setFilter(f.key)}
                    >
                        <span>{f.label}</span>
                        <span className={cn(
                            "text-[10px] tabular-nums",
                            filter === f.key ? "opacity-70" : "text-default-400",
                        )}>{filterCounts[f.key]}</span>
                    </Button>
                ))}
            </div>
            
            {/* 日志列表区域：可滚动 */}
            <ScrollShadow className="min-w-0 flex-1 overflow-y-auto">
                <div className="min-w-0">
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
                                className="group min-w-0 border-b border-divider/60 px-4 py-3 transition-colors hover:bg-default-50/50"
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
                                            <div className="group/input min-w-0 rounded bg-default-100/50 p-2 transition-colors hover:bg-default-100">
                                                <div className="mb-0.5 flex min-w-0 items-center justify-between gap-2">
                                                    <div className="select-none font-semibold text-tiny text-default-400">{t('log.input', 'Input')}</div>
                                                    {/* 复制按钮只占标题行空间，避免整段正文右侧额外留白。 */}
                                                    <Button
                                                        isIconOnly
                                                        size="sm"
                                                        variant="light"
                                                        className="h-5 w-5 min-w-5 opacity-0 group-hover/input:opacity-100 focus-visible:opacity-100"
                                                        onPress={() => navigator.clipboard.writeText(log.input || '')}
                                                        aria-label={`${t('tools.encoder.copy', 'Copy')} ${t('log.input', 'Input')}`}
                                                    >
                                                        <Copy className="w-3 h-3 text-default-400" />
                                                    </Button>
                                                </div>
                                                <div className="min-w-0 whitespace-pre-wrap break-all font-mono text-small text-default-600">
                                                    {renderHighlightedText(log.input)}
                                                </div>
                                            </div>

                                            {/* 输出部分 */}
                                            <div className="group/output min-w-0 rounded bg-default-100/50 p-2 transition-colors hover:bg-default-100">
                                                <div className="mb-0.5 flex min-w-0 items-center justify-between gap-2">
                                                    <div className="select-none font-semibold text-tiny text-success/80">{t('log.output', 'Output')}</div>
                                                    <Button
                                                        isIconOnly
                                                        size="sm"
                                                        variant="light"
                                                        className="h-5 w-5 min-w-5 opacity-0 group-hover/output:opacity-100 focus-visible:opacity-100"
                                                        onPress={() => navigator.clipboard.writeText(log.output || '')}
                                                        aria-label={`${t('tools.encoder.copy', 'Copy')} ${t('log.output', 'Output')}`}
                                                    >
                                                        <Copy className="w-3 h-3 text-default-400" />
                                                    </Button>
                                                </div>
                                                <div className="min-w-0 whitespace-pre-wrap break-all font-mono text-small text-foreground">
                                                    {renderHighlightedText(log.output)}
                                                </div>
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

                                {/* 备注在侧栏中只读展示，编辑统一放到日志管理页。 */}
                                {log.note && (
                                    <div className="mt-2 rounded-md border border-warning/20 bg-warning/10 px-2 py-1.5 text-tiny text-foreground/80">
                                        {log.note}
                                    </div>
                                )}
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
