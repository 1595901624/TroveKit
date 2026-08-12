import { useCallback, useEffect, useRef } from "react"
import { removeStoredItem, setStoredItem } from "../lib/store"

const DEFAULT_DELAY = 1500

export function useDebouncedStoredValue<T>(key: string, value: T, enabled: boolean, delay = DEFAULT_DELAY, flushOnUnmount = true) {
  const latestValueRef = useRef(value)
  const enabledRef = useRef(enabled)
  const timerRef = useRef<number | null>(null)
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve())

  latestValueRef.current = value
  enabledRef.current = enabled

  const enqueueWrite = useCallback((snapshot: T) => {
    writeQueueRef.current = writeQueueRef.current
      .catch(() => undefined)
      .then(() => setStoredItem(key, JSON.stringify(snapshot)))
  }, [key])

  const flush = useCallback((snapshot?: T) => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = null
    const nextSnapshot = snapshot ?? latestValueRef.current
    latestValueRef.current = nextSnapshot
    if (enabledRef.current) enqueueWrite(nextSnapshot)
  }, [enqueueWrite])

  const remove = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = null
    writeQueueRef.current = writeQueueRef.current
      .catch(() => undefined)
      .then(() => removeStoredItem(key))
  }, [key])

  useEffect(() => {
    if (!enabled) return
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => flush(), delay)
  }, [delay, enabled, flush, value])

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    if (flushOnUnmount && enabledRef.current) enqueueWrite(latestValueRef.current)
  }, [enqueueWrite, flushOnUnmount])

  return { flush, remove }
}
