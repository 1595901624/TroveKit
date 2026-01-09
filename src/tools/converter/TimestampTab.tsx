import { useState, useEffect } from "react"
import { Card, CardBody, Input, Select, SelectItem, Button, Tooltip } from "@heroui/react"
import { invoke } from "@tauri-apps/api/core"
import { useTranslation } from "react-i18next"
import { Clock, ArrowRightLeft, Copy, RefreshCw } from "lucide-react"
import { useToast } from "../../contexts/ToastContext"

interface TimeInfo {
    secs: string
    millis: string
    micros: string
    nanos: string
}

export function TimestampTab() {
    const { t } = useTranslation()
    const { addToast } = useToast()
    const [currentTime, setCurrentTime] = useState<TimeInfo>({ secs: "0", millis: "0", micros: "0", nanos: "0" })
    const [tsInput, setTsInput] = useState("")
    const [tsUnit, setTsUnit] = useState("s")
    const [tsOutput, setTsOutput] = useState<string>("")
    
    const [dateInput, setDateInput] = useState("")
    const [dateOutput, setDateOutput] = useState<TimeInfo | null>(null)
    const [isPaused, setIsPaused] = useState(false)

    // Current Time Polling
    useEffect(() => {
        let active = true
        let intervalId: number = -1

        const fetchTime = async () => {
            if (isPaused) return
            try {
                const info = await invoke<TimeInfo>("get_system_time")
                if (active) setCurrentTime(info)
            } catch (e) {
                console.error(e)
            }
        }
        
        fetchTime()
        intervalId = setInterval(fetchTime, 100)
        return () => { active = false; clearInterval(intervalId) }
    }, [isPaused])

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        addToast(t("tools.converter.copiedToClipboard"), "success")
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

    const CurrentTimeItem = ({ label, value }: { label: string, value: string }) => (
        <div className="flex items-start justify-between p-3 rounded-lg bg-default-100 hover:bg-default-200 transition-colors group">
            <div className="flex flex-col gap-1 min-w-0 flex-1">
                <span className="text-xs text-default-500 font-medium uppercase tracking-wider">{label}</span>
                <span className="font-mono text-sm lg:text-base font-semibold text-primary break-all">
                    {value}
                </span>
            </div>
            <Button
                isIconOnly
                size="sm"
                variant="light"
                className="opacity-0 group-hover:opacity-100 transition-opacity text-default-400 hover:text-primary shrink-0 ml-2 mt-0.5"
                onPress={() => copyToClipboard(value)}
            >
                <Copy className="w-3.5 h-3.5" />
            </Button>
        </div>
    )

    return (
        <div className="flex flex-col gap-6 p-2 sm:p-4 md:p-6 animate-in fade-in duration-500">
            {/* Current Time Section */}
            <Card className="border-none bg-gradient-to-br from-primary/5 to-secondary/5 dark:from-primary/10 dark:to-secondary/10">
                <CardBody className="p-4 sm:p-6 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                                <Clock className="w-6 h-6" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-lg font-bold">{t("tools.converter.currentTime")}</h3>
                                <p className="text-sm text-default-500 font-mono mt-0.5 break-all">
                                    {formatDate(currentTime.millis)}
                                </p>
                            </div>
                        </div>
                        <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            onPress={() => setIsPaused(!isPaused)}
                            className={isPaused ? "text-warning" : "text-success"}
                        >
                            <RefreshCw className={`w-4 h-4 ${!isPaused && "animate-spin"}`} style={{ animationDuration: "3s" }} />
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        <CurrentTimeItem label={t("tools.converter.seconds")} value={currentTime.secs} />
                        <CurrentTimeItem label={t("tools.converter.milliseconds")} value={currentTime.millis} />
                        <CurrentTimeItem label={t("tools.converter.microseconds")} value={currentTime.micros} />
                        <CurrentTimeItem label={t("tools.converter.nanoseconds")} value={currentTime.nanos} />
                    </div>
                </CardBody>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Timestamp to Date */}
                <Card className="flex-1 border-none shadow-md bg-background/60 backdrop-blur-md">
                    <CardBody className="p-6 space-y-6">
                        <div className="flex items-center gap-3 pb-2 border-b border-divider/50">
                            <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                                <ArrowRightLeft className="w-5 h-5" />
                            </div>
                            <h3 className="font-semibold text-lg">{t("tools.converter.timestampToDate")}</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="flex gap-3">
                                <Input
                                    label={t("tools.converter.timestamp")}
                                    placeholder={t("tools.converter.timestampPlaceholder")}
                                    value={tsInput}
                                    onValueChange={setTsInput}
                                    classNames={{ inputWrapper: "bg-default-100" }}
                                    className="flex-1"
                                />
                                <Select 
                                    label={t("tools.converter.unit")} 
                                    selectedKeys={[tsUnit]} 
                                    onChange={(e) => setTsUnit(e.target.value)}
                                    className="w-32"
                                    classNames={{ trigger: "bg-default-100" }}
                                >
                                    <SelectItem key="s" textValue="s">s</SelectItem>
                                    <SelectItem key="ms" textValue="ms">ms</SelectItem>
                                    <SelectItem key="us" textValue="us">μs</SelectItem>
                                    <SelectItem key="ns" textValue="ns">ns</SelectItem>
                                </Select>
                            </div>

                            <div className="p-4 rounded-xl bg-default-50 space-y-2 border border-default-100">
                                <div className="text-xs text-default-500 uppercase font-medium">{t("tools.converter.output")}</div>
                                <div className="font-mono text-lg text-primary break-all min-h-[1.75rem]">
                                    {tsOutput}
                                </div>
                                {tsOutput && tsOutput !== t("tools.converter.invalidTimestamp") && (
                                    <div className="pt-2 flex justify-end">
                                        <Button size="sm" variant="flat" startContent={<Copy className="w-3.5 h-3.5"/>} onPress={() => copyToClipboard(tsOutput)}>
                                            {t("tools.converter.copy")}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardBody>
                </Card>

                {/* Date to Timestamp */}
                <Card className="flex-1 border-none shadow-md bg-background/60 backdrop-blur-md">
                    <CardBody className="p-6 space-y-6">
                        <div className="flex items-center gap-3 pb-2 border-b border-divider/50">
                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                                <ArrowRightLeft className="w-5 h-5" />
                            </div>
                            <h3 className="font-semibold text-lg">{t("tools.converter.dateToTimestamp")}</h3>
                        </div>

                        <div className="space-y-4">
                            <Input
                                label={t("tools.converter.input")}
                                placeholder={t("tools.converter.datePlaceholder")}
                                value={dateInput}
                                onValueChange={setDateInput}
                                description={t("tools.converter.format") + ": YYYY-MM-DD HH:mm:ss"}
                                classNames={{ inputWrapper: "bg-default-100" }}
                            />
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {[
                                    { k: "s", v: dateOutput?.secs, l: t("tools.converter.seconds") },
                                    { k: "ms", v: dateOutput?.millis, l: t("tools.converter.milliseconds") },
                                    { k: "us", v: dateOutput?.micros, l: t("tools.converter.microseconds") },
                                    { k: "ns", v: dateOutput?.nanos, l: t("tools.converter.nanoseconds") },
                                ].map((item) => (
                                    <div key={item.k} 
                                        className="relative p-3 rounded-xl bg-default-50 border border-default-100 hover:border-primary/30 transition-colors cursor-pointer group"
                                        onClick={() => item.v && copyToClipboard(item.v)}
                                    >
                                        <div className="text-[10px] text-default-400 uppercase font-bold mb-1">{item.l}</div>
                                        <div className="font-mono text-sm font-semibold text-foreground break-all pr-4">{item.v || "-"}</div>
                                        {item.v && (
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Copy className="w-3 h-3 text-primary" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </div>
        </div>
    )
}
