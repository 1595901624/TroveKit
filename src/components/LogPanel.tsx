import { motion, AnimatePresence } from "framer-motion"
import { useLog, LogEntry } from "../contexts/LogContext"
import { Trash2, X, Terminal, Info, CheckCircle, AlertTriangle, AlertCircle, Copy } from "lucide-react"
import { Button, ScrollShadow, Tooltip } from "@heroui/react"
import { useTranslation } from "react-i18next"

export function LogPanel() {
  const { logs, isOpen, setIsOpen, clearLogs } = useLog()
  const { t } = useTranslation()

  const getIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-3.5 h-3.5 text-success" />
      case 'error': return <AlertCircle className="w-3.5 h-3.5 text-danger" />
      case 'warning': return <AlertTriangle className="w-3.5 h-3.5 text-warning" />
      default: return <Info className="w-3.5 h-3.5 text-primary" />
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 320, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="h-full border-l border-divider bg-background/60 backdrop-blur-md flex flex-col shrink-0 overflow-hidden"
        >
            <div className="h-14 border-b border-divider flex items-center justify-between px-4 shrink-0 bg-background/40">
                <div className="flex items-center gap-2 font-semibold text-small">
                    <Terminal className="w-4 h-4" />
                    {t('log.title', 'Operation Log')}
                </div>
                <div className="flex items-center gap-1">
                    <Tooltip content={t('log.clear', 'Clear logs')}>
                        <Button isIconOnly size="sm" variant="light" onPress={clearLogs}>
                            <Trash2 className="w-4 h-4 text-default-500" />
                        </Button>
                    </Tooltip>
                    <Button isIconOnly size="sm" variant="light" onPress={() => setIsOpen(false)}>
                        <X className="w-4 h-4 text-default-500" />
                    </Button>
                </div>
            </div>
            
            <ScrollShadow className="flex-1 p-3 overflow-y-auto">
                <div className="space-y-3">
                    {logs.length === 0 ? (
                         <div className="text-center text-default-400 py-8 text-small">
                            {t('log.empty', 'No logs yet')}
                         </div>
                    ) : (
                        logs.map((log) => (
                            <div key={log.id} className="p-3 rounded-medium bg-content2/50 border border-transparent hover:border-divider transition-colors group">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                    <div className="flex items-center gap-1.5 text-tiny text-default-500">
                                         {getIcon(log.type)}
                                         <time>{new Date(log.timestamp).toLocaleTimeString()}</time>
                                    </div>
                                    <Button 
                                      isIconOnly 
                                      size="sm" 
                                      variant="light" 
                                      className="h-5 w-5 min-w-5 opacity-0 group-hover:opacity-100 data-[hover=true]:bg-default/40"
                                      onPress={() => navigator.clipboard.writeText(log.message)}
                                    >
                                       <Copy className="w-3 h-3 text-default-500" />
                                    </Button>
                                </div>
                                <div className="text-small break-all font-mono leading-relaxed text-foreground/90">
                                    {log.message}
                                </div>
                                {log.details && (
                                    <div className="mt-1.5 pt-1.5 border-t border-divider/50 text-tiny text-default-400 break-all font-mono">
                                        {log.details}
                                    </div>
                                )}
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
