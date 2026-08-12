import { useCallback, useEffect, useRef } from "react"
import type { ConverterOperation, ConverterWorkerResponse } from "../workers/converter.worker"

interface PendingRequest {
  reject: (error: Error) => void
  resolve: (output: string) => void
}

export function useConverterWorker() {
  const workerRef = useRef<Worker | null>(null)
  const nextIdRef = useRef(1)
  const pendingRef = useRef(new Map<number, PendingRequest>())

  useEffect(() => {
    const worker = new Worker(new URL("../workers/converter.worker.ts", import.meta.url), { type: "module" })
    worker.onmessage = (event: MessageEvent<ConverterWorkerResponse>) => {
      const pending = pendingRef.current.get(event.data.id)
      if (!pending) return
      pendingRef.current.delete(event.data.id)
      if (event.data.error) pending.reject(new Error(event.data.error))
      else pending.resolve(event.data.output ?? "")
    }
    worker.onerror = () => {
      for (const pending of pendingRef.current.values()) pending.reject(new Error("Conversion worker failed"))
      pendingRef.current.clear()
    }
    workerRef.current = worker
    return () => {
      worker.terminate()
      for (const pending of pendingRef.current.values()) pending.reject(new Error("Conversion cancelled"))
      pendingRef.current.clear()
      workerRef.current = null
    }
  }, [])

  return useCallback((operation: ConverterOperation, input: string) => {
    const worker = workerRef.current
    if (!worker) return Promise.reject(new Error("Conversion worker is not ready"))
    const id = nextIdRef.current++
    return new Promise<string>((resolve, reject) => {
      pendingRef.current.set(id, { resolve, reject })
      worker.postMessage({ id, input, operation })
    })
  }, [])
}
