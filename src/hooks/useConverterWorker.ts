import { useCallback, useEffect, useRef } from "react"
import type { ConverterOperation, ConverterWorkerResponse } from "../workers/converter.worker"

export function useConverterWorker() {
  const nextIdRef = useRef(1)
  const activeWorkersRef = useRef(new Set<Worker>())

  useEffect(() => () => {
    for (const worker of activeWorkersRef.current) worker.terminate()
    activeWorkersRef.current.clear()
  }, [])

  return useCallback((operation: ConverterOperation, input: string) => {
    const worker = new Worker(new URL("../workers/converter.worker.ts", import.meta.url), { type: "module" })
    activeWorkersRef.current.add(worker)
    const id = nextIdRef.current++
    return new Promise<string>((resolve, reject) => {
      const finish = () => {
        worker.terminate()
        activeWorkersRef.current.delete(worker)
      }
      worker.onmessage = (event: MessageEvent<ConverterWorkerResponse>) => {
        if (event.data.id !== id) return
        finish()
        if (event.data.error) reject(new Error(event.data.error))
        else resolve(event.data.output ?? "")
      }
      worker.onerror = () => {
        finish()
        reject(new Error("Conversion worker failed"))
      }
      worker.postMessage({ id, input, operation })
    })
  }, [])
}
