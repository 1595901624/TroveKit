// 导入必要的依赖
import { motion, AnimatePresence } from "framer-motion" // 用于动画效果
import { useLog, LogEntry } from "../contexts/LogContext" // 日志上下文
import { Trash2, X, Terminal, Info, CheckCircle, AlertTriangle, AlertCircle, Copy, Plus, Edit, Check, MessageSquare } from "lucide-react" // 图标
import { Button, ScrollShadow, Tooltip, Input } from "@heroui/react" // UI 组件
import { useTranslation } from "react-i18next" // 国际化
import { useState, useMemo } from "react" // React hooks

// 过滤器类型定义：日志类型或全部
type FilterType = LogEntry['type'] | 'all'

// 日志面板组件
export function LogPanel() {
  // 从日志上下文中获取数据和方法
  const { logs, isOpen, setIsOpen, clearLogs, createNewLog, addNote, removeNote, sessionNote, updateSessionNote, removeSessionNote } = useLog()
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

  // 使用 useMemo 优化性能，根据过滤器筛选日志
  const filteredLogs = useMemo(() => {
    if (filter === 'all') return logs // 显示所有日志
    return logs.filter(log => log.type === filter) // 按类型过滤
  }, [logs, filter])

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

  return (
    // 动画容器，控制面板的进入和退出动画
    <AnimatePresence>
      {/* 仅在面板打开时显示 */}
      {isOpen && (
        // 动画 div，实现滑入滑出效果
        <motion.div
          initial={{ width: 0, opacity: 0 }} // 初始状态：宽度为0，透明
          animate={{ width: 320, opacity: 1 }} // 动画状态：宽度320px，不透明
          exit={{ width: 0, opacity: 0 }} // 退出状态：宽度为0，透明
          transition={{ duration: 0.3, ease: "easeInOut" }} // 动画时长和缓动函数
          className="h-full border-l border-divider bg-background/60 backdrop-blur-md flex flex-col shrink-0 overflow-hidden" // 样式：全高、左边框、半透明背景、毛玻璃效果
        >
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
                        <Button isIconOnly size="sm" variant="light" onPress={createNewLog}>
                            <Plus className="w-4 h-4 text-default-500" />
                        </Button>
                    </Tooltip>
                    {/* 清空日志按钮 */}
                    <Tooltip content={t('log.clear', 'Clear logs')}>
                        <Button isIconOnly size="sm" variant="light" onPress={clearLogs}>
                            <Trash2 className="w-4 h-4 text-default-500" />
                        </Button>
                    </Tooltip>
                    {/* 关闭面板按钮 */}
                    <Button isIconOnly size="sm" variant="light" onPress={() => setIsOpen(false)}>
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
                        <Button isIconOnly size="sm" variant="light" onPress={handleCancelEditSessionNote}>
                            <X className="w-3.5 h-3.5" />
                        </Button>
                        <Button isIconOnly size="sm" variant="flat" color="primary" onPress={handleSaveSessionNote}>
                            <Check className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                ) : sessionNote ? (
                    <div 
                        className="flex items-center gap-2 text-tiny text-warning-600 dark:text-warning bg-warning/10 px-2 py-1.5 rounded cursor-pointer hover:bg-warning/20 transition-colors"
                        onClick={handleStartEditSessionNote}
                    >
                        <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate flex-1">{sessionNote}</span>
                        <Edit className="w-3 h-3 opacity-50" />
                    </div>
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
            <ScrollShadow className="flex-1 p-3 overflow-y-auto">
                <div className="space-y-3">
                    {/* 空状态处理 */}
                    {filteredLogs.length === 0 ? (
                         <div className="text-center text-default-400 py-8 text-small">
                            {/* 根据当前过滤器显示不同的空状态文本 */}
                            {filter === 'all' ? t('log.empty', 'No logs yet') : t('log.emptyFilter', 'No logs match this filter')}
                         </div>
                    ) : (
                        // 日志列表渲染
                        filteredLogs.map((log) => (
                            // 单个日志项容器
                            <div key={log.id} className="p-3 rounded-medium bg-content2/50 border border-transparent hover:border-divider transition-colors group">
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
                                            className="h-5 w-5 min-w-5 opacity-0 group-hover:opacity-100 data-[hover=true]:bg-default/40" // 默认隐藏，悬停显示
                                            onPress={() => navigator.clipboard.writeText(log.message || '')} // 复制消息内容
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
                                                {log.cryptoParams.iv && (
                                                    <div className="col-span-2 text-tiny">
                                                        <span className="text-default-500 font-semibold">{t('tools.hash.iv')}</span>
                                                        <span className="font-mono ml-1 text-default-700 break-all">{log.cryptoParams.iv}</span>
                                                    </div>
                                                )}
                                                {log.cryptoParams.key && (
                                                    <div className="col-span-2 text-tiny">
                                                        <span className="text-default-500 font-semibold">{t('tools.hash.key')}</span>
                                                        <span className="font-mono ml-1 text-default-700 break-all">{log.cryptoParams.key}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                         
                                        {/* 输入和输出区域 */}
                                        <div className="space-y-1.5">
                                            {/* 输入部分 */}
                                            <div className="group/input relative p-2 rounded bg-default-100/50 hover:bg-default-100 transition-colors">
                                                <div className="text-tiny text-default-400 font-semibold mb-0.5 select-none">{t('log.input', 'Input')}</div>
                                                <div className="text-small font-mono text-default-600 break-all pr-6 whitespace-pre-wrap">
                                                    {renderHighlightedText(log.input)}
                                                </div>
                                                {/* 复制输入按钮 */}
                                                <Button
                                                    isIconOnly
                                                    size="sm"
                                                    variant="light"
                                                    className="absolute top-1 right-1 h-5 w-5 min-w-5 opacity-0 group-hover/input:opacity-100"
                                                    onPress={() => navigator.clipboard.writeText(log.input || '')}
                                                >
                                                    <Copy className="w-3 h-3 text-default-400" />
                                                </Button>
                                            </div>

                                            {/* 输出部分 */}
                                            <div className="group/output relative p-2 rounded bg-default-100/50 hover:bg-default-100 transition-colors">
                                                <div className="text-tiny text-success/80 font-semibold mb-0.5 select-none">{t('log.output', 'Output')}</div>
                                                <div className="text-small font-mono text-foreground break-all pr-6 whitespace-pre-wrap">
                                                    {renderHighlightedText(log.output)}
                                                </div>
                                                {/* 复制输出按钮 */}
                                                <Button
                                                    isIconOnly
                                                    size="sm"
                                                    variant="light"
                                                    className="absolute top-1 right-1 h-5 w-5 min-w-5 opacity-0 group-hover/output:opacity-100"
                                                    onPress={() => navigator.clipboard.writeText(log.output || '')}
                                                >
                                                    <Copy className="w-3 h-3 text-default-400" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    // 普通日志格式：直接显示消息
                                    <div className="text-small break-all font-mono leading-relaxed text-foreground/90 whitespace-pre-wrap">
                                        {renderHighlightedText(log.message)}
                                    </div>
                                )}
                                
                                {/* 详情信息：如果有则显示 */}
                                {log.details && (
                                    <div className="mt-1.5 pt-1.5 border-t border-divider/50 text-tiny text-default-400 break-all font-mono whitespace-pre-wrap">
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
                                                className="h-6 px-2 text-tiny opacity-0 group-hover:opacity-100 transition-opacity"
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
                </div>
            </ScrollShadow>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
