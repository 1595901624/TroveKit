import React, { createContext, useContext, useState, useCallback } from "react"
import { Card, CardBody, Button } from "@heroui/react"
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export interface Toast {
  id: string
  message: string
  type?: "default" | "success" | "error" | "warning"
  duration?: number
}

interface ToastContextType {
  addToast: (message: string, type?: Toast["type"], duration?: number) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: Toast["type"] = "default", duration = 3000) => {
    const id = Math.random().toString(36).substring(7)
    const newToast = { id, message, type, duration }
    
    setToasts((prev) => [...prev, newToast])

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onClose }: { toast: Toast, onClose: () => void }) {
  const getIcon = () => {
    switch (toast.type) {
      case "success": return <CheckCircle className="w-5 h-5 text-success" />
      case "error": return <AlertCircle className="w-5 h-5 text-danger" />
      case "warning": return <AlertTriangle className="w-5 h-5 text-warning" />
      default: return <Info className="w-5 h-5 text-primary" />
    }
  }

  const getColor = () => {
      switch (toast.type) {
      case "success": return "bg-success-50 border-success-200 dark:bg-success-900/20 dark:border-success-900"
      case "error": return "bg-danger-50 border-danger-200 dark:bg-danger-900/20 dark:border-danger-900"
      case "warning": return "bg-warning-50 border-warning-200 dark:bg-warning-900/20 dark:border-warning-900"
      default: return "bg-content1 border-default-200"
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 50, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="pointer-events-auto"
    >
      <Card className={`w-80 border shadow-md ${getColor()}`}>
        <CardBody className="p-3 flex flex-row items-center gap-3">
          {getIcon()}
          <p className="text-small font-medium flex-1 break-words">{toast.message}</p>
          <Button isIconOnly size="sm" variant="light" onPress={onClose} className="min-w-0 w-6 h-6 shrink-0">
            <X className="w-3 h-3" />
          </Button>
        </CardBody>
      </Card>
    </motion.div>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}
