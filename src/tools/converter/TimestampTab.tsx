import { useState, useEffect } from "react"
import { Input, Select, SelectItem, Button, DatePicker, addToast } from "../../components/ui/base-ui"
import { invoke } from "@tauri-apps/api/core"
import { useTranslation } from "react-i18next"
import { Clock, ArrowRightLeft, Copy, Pause, Play, Calendar, Trash2 } from "lucide-react"
import { useLogActions } from "../../contexts/LogContext"
import { getLocalTimeZone } from "@internationalized/date"
import type { DateValue } from "@internationalized/date"
import { getStoredItem, removeStoredItem, setStoredItem } from "../../lib/store"

const STORAGE_KEY = "timestamp-tool-state"

interface TimeInfo {
    secs: string
    millis: string
    micros: string
    nanos: string
}

export function TimestampTab({ isVisible = true }: { isVisible?: boolean }) {
    const { t } = useTranslation()
  const { addLog } = useLogActions()
    const [currentTime, setCurrentTime] = useState<TimeInfo>({ secs: "0", millis: "0", micros: "0", nanos: "0" })
    const [tsInput, setTsInput] = useState("")
    const [tsUnit, setTsUnit] = useState("s")
    const [tsOutput, setTsOutput] = useState<string>("")
    
    const [dateInput, setDateInput] = useState("")
    const [dateOutput, setDateOutput] = useState<TimeInfo | null>(null)
    const [isPaused, setIsPaused] = useState(false)
    const [isLoaded, setIsLoaded] = useState(false)

    // 组件会在切换 Tab 时卸载，因此挂载时恢复用户输入的时间戳、单位和日期。
    useEffect(() => {
        let mounted = true
        getStoredItem(STORAGE_KEY).then((stored) => {
            if (mounted && stored) {
                try {
                    const state = JSON.parse(stored)
                    if (typeof state.tsInput === "string") setTsInput(state.tsInput)
                    if (typeof state.tsUnit === "string") setTsUnit(state.tsUnit)
                    if (typeof state.dateInput === "string") setDateInput(state.dateInput)
                    if (typeof state.isPaused === "boolean") setIsPaused(state.isPaused)
                } catch (e) {
                    console.error("Failed to parse TimestampTab state", e)
                }
            }
            if (mounted) setIsLoaded(true)
        })
        return () => { mounted = false }
    }, [])

    // 恢复完成后再写入，避免初次挂载时用空状态覆盖已有编辑内容。
    useEffect(() => {
        if (isLoaded) {
            setStoredItem(STORAGE_KEY, JSON.stringify({ tsInput, tsUnit, dateInput, isPaused }))
        }
    }, [tsInput, tsUnit, dateInput, isPaused, isLoaded])

    // Current Time Polling
    useEffect(() => {
        if (!isVisible) return

        let active = true
        let intervalId: number = -1

        const fetchTime = async () => {
            if (isPaused) return
            try {
                const info = await invoke<TimeInfo>("get_system_time")
                if (active) setCurrentTime(info)
            } catch {
                // 浏览器开发环境没有 Tauri IPC，回退到毫秒精度的本地时间。
                const millis = BigInt(Date.now())
                if (active) {
                    setCurrentTime({
                        secs: (millis / 1000n).toString(),
                        millis: millis.toString(),
                        micros: (millis * 1000n).toString(),
                        nanos: (millis * 1000000n).toString(),
                    })
                }
            }
        }
        
        fetchTime()
        intervalId = window.setInterval(fetchTime, 1000)
        return () => { 
            active = false
            if (intervalId !== -1) clearInterval(intervalId) 
        }
    }, [isPaused, isVisible])

    const copyToClipboard = (text: string, context?: { method: string; input?: string }) => {
        navigator.clipboard.writeText(text)
        addToast({ title: t("tools.converter.copiedToClipboard"), severity: "success" })
        
        if (context) {
            addLog({
                method: context.method,
                input: context.input || "-",
                output: text
            }, "success")
        }
    }

    const formatDate = (msStr: string) => {
        try {
            const ms = Number(BigInt(msStr))
            const d = new Date(ms)
            const pad = (n: number, z: number = 2) => ('00' + n).slice(-z)
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`
        } catch {
            return "Invalid Date"
        }
    }

    // Timestamp -> Date
    useEffect(() => {
        if (!tsInput) {
            setTsOutput("")
            return
        }
        try {
            // Remove non-digit characters just in case, though Input type might handle some
            const cleanInput = tsInput.replace(/[^0-9-]/g, "")
            if (!cleanInput) return

            let ms: number
            const val = BigInt(cleanInput)
            
            if (tsUnit === "s") ms = Number(val) * 1000
            else if (tsUnit === "ms") ms = Number(val)
            else if (tsUnit === "us") ms = Number(val / 1000n)
            else ms = Number(val / 1000000n)

            const date = new Date(ms)
            if (isNaN(date.getTime())) {
                setTsOutput(t("tools.converter.invalidTimestamp"))
            } else {
                setTsOutput(formatDate(ms.toString()))
            }
        } catch (e) {
            setTsOutput(t("tools.converter.invalidTimestamp"))
        }
    }, [tsInput, tsUnit, t])

    // Date -> Timestamp
    useEffect(() => {
        if (!dateInput) {
            setDateOutput(null)
            return
        }
        const date = new Date(dateInput)
        if (isNaN(date.getTime())) {
            setDateOutput(null)
            return
        }
        
        const ms = BigInt(date.getTime())
        setDateOutput({
            secs: (ms / 1000n).toString(),
            millis: ms.toString(),
            micros: (ms * 1000n).toString(),
            nanos: (ms * 1000000n).toString()
        })
    }, [dateInput])

    const CurrentTimeItem = ({ label, value, enLabel }: { label: string, value: string, enLabel: string }) => (
        <div className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-default-200 bg-background p-2.5">
            <div className="flex flex-col gap-1 min-w-0 flex-1">
                <span className="text-[10px] font-medium uppercase tracking-wider text-default-500">{label}</span>
                <span className="truncate font-mono text-sm font-semibold text-primary" title={value}>
                    {value}
                </span>
            </div>
            <Button
                isIconOnly
                size="sm"
                variant="light"
                className="h-8 w-8 min-w-8 shrink-0 text-default-400 hover:text-primary"
                onPress={() => copyToClipboard(value, { method: `Copy Current Time (${enLabel})` })}
                aria-label={`${t("tools.converter.copy")} ${label}`}
            >
                <Copy className="w-3.5 h-3.5" />
            </Button>
        </div>
    )

    const handleClear = () => {
        setTsInput("")
        setTsOutput("")
        setDateInput("")
        setDateOutput(null)
        removeStoredItem(STORAGE_KEY)
    }

    return (
        <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
            <section className="shrink-0 rounded-xl border border-default-200 bg-default-50/60 p-3">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="rounded-lg bg-primary/10 p-2 text-primary"><Clock className="h-5 w-5" /></div>
                        <div className="min-w-0">
                            <h2 className="text-sm font-semibold text-foreground">{t("tools.converter.currentTime")}</h2>
                            <p className="truncate font-mono text-xs text-default-500">{formatDate(currentTime.millis)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Button size="sm" variant="flat" className="h-8" onPress={() => setIsPaused(!isPaused)} startContent={isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}>
                            {isPaused ? t("tools.converter.resume") : t("tools.converter.pause")}
                        </Button>
                        <Button size="sm" variant="light" className="h-8 text-default-500 hover:bg-danger/10 hover:text-danger" onPress={handleClear} isDisabled={!tsInput && !dateInput} startContent={<Trash2 className="h-4 w-4" />}>
                            {t("tools.converter.clearAll")}
                        </Button>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                    <CurrentTimeItem label={t("tools.converter.seconds")} value={currentTime.secs} enLabel="s" />
                    <CurrentTimeItem label={t("tools.converter.milliseconds")} value={currentTime.millis} enLabel="ms" />
                    <CurrentTimeItem label={t("tools.converter.microseconds")} value={currentTime.micros} enLabel="us" />
                    <CurrentTimeItem label={t("tools.converter.nanoseconds")} value={currentTime.nanos} enLabel="ns" />
                </div>
            </section>

            <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
                <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-default-200 bg-background">
                    <div className="flex h-11 shrink-0 items-center gap-2 border-b border-default-200 px-3.5">
                        <ArrowRightLeft className="h-4 w-4 text-primary" />
                        <h2 className="text-sm font-semibold">{t("tools.converter.timestampToDate")}</h2>
                    </div>
                    <div className="min-h-0 flex-1 space-y-4 overflow-auto p-4">
                        <div className="grid grid-cols-[minmax(0,1fr)_104px] gap-2">
                            <Input size="sm" label={t("tools.converter.timestamp")} placeholder={t("tools.converter.timestampPlaceholder")} value={tsInput} onValueChange={setTsInput} classNames={{ inputWrapper: "bg-background" }} />
                            <Select size="sm" label={t("tools.converter.unit")} selectedKeys={[tsUnit]} onChange={(e) => setTsUnit(e.target.value)} classNames={{ trigger: "bg-background" }}>
                                <SelectItem key="s" textValue="s">s</SelectItem>
                                <SelectItem key="ms" textValue="ms">ms</SelectItem>
                                <SelectItem key="us" textValue="us">μs</SelectItem>
                                <SelectItem key="ns" textValue="ns">ns</SelectItem>
                            </Select>
                        </div>
                        <div className={`rounded-xl border p-3 ${tsOutput === t("tools.converter.invalidTimestamp") ? "border-danger/30 bg-danger/5" : "border-default-200 bg-default-50/40"}`}>
                            <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-default-500">{t("tools.converter.output")}</div>
                            <div className={`min-h-7 break-all font-mono text-base ${tsOutput === t("tools.converter.invalidTimestamp") ? "text-danger" : "text-primary"}`}>{tsOutput || "—"}</div>
                            {tsOutput && tsOutput !== t("tools.converter.invalidTimestamp") && (
                                <div className="mt-2 flex justify-end">
                                    <Button size="sm" variant="light" color="primary" className="h-8" startContent={<Copy className="h-4 w-4" />} onPress={() => copyToClipboard(tsOutput, { method: "Timestamp to Date", input: `${tsInput} ${tsUnit}` })}>{t("tools.converter.copy")}</Button>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-default-200 bg-background">
                    <div className="flex h-11 shrink-0 items-center gap-2 border-b border-default-200 px-3.5">
                        <ArrowRightLeft className="h-4 w-4 text-primary" />
                        <h2 className="text-sm font-semibold">{t("tools.converter.dateToTimestamp")}</h2>
                    </div>
                    <div className="min-h-0 flex-1 space-y-4 overflow-auto p-4">
                        <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_220px]">
                            <Input size="sm" label={t("tools.converter.input")} placeholder={t("tools.converter.datePlaceholder")} value={dateInput} onValueChange={setDateInput} description={`${t("tools.converter.format")}: YYYY-MM-DD HH:mm:ss`} classNames={{ inputWrapper: "bg-background" }} />
                            <DatePicker
                                label={t("tools.converter.selectDate")}
                                granularity="second"
                                hideTimeZone
                                hourCycle={24}
                                showMonthAndYearPickers
                                onChange={(value: DateValue | null) => {
                                    if (value) {
                                        const date = value.toDate(getLocalTimeZone())
                                        const pad = (n: number, z: number = 2) => ('00' + n).slice(-z)
                                        setDateInput(`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`)
                                    }
                                }}
                                selectorIcon={<Calendar className="h-4 w-4" />}
                                classNames={{ inputWrapper: "bg-background" }}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { k: "s", v: dateOutput?.secs, l: t("tools.converter.seconds") },
                                { k: "ms", v: dateOutput?.millis, l: t("tools.converter.milliseconds") },
                                { k: "us", v: dateOutput?.micros, l: t("tools.converter.microseconds") },
                                { k: "ns", v: dateOutput?.nanos, l: t("tools.converter.nanoseconds") },
                            ].map((item) => (
                                <button key={item.k} type="button" disabled={!item.v} className="min-w-0 rounded-lg border border-default-200 bg-default-50/40 p-2.5 text-left transition-colors enabled:hover:border-primary/40 enabled:hover:bg-primary/5 disabled:cursor-default" onClick={() => item.v && copyToClipboard(item.v, { method: `Date to Timestamp (${item.k})`, input: dateInput })}>
                                    <div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-medium uppercase tracking-wide text-default-500"><span>{item.l}</span>{item.v && <Copy className="h-3 w-3 text-primary" />}</div>
                                    <div className="truncate font-mono text-sm font-semibold text-foreground" title={item.v}>{item.v || "—"}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    )
}
