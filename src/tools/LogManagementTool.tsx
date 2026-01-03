import { useEffect, useMemo, useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import { Button, Card, CardBody, Input, Select, SelectItem, Spinner } from "@heroui/react"
import { Trash2, RefreshCw, Pencil } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { LogEntry } from "../contexts/LogContext"

type LogSessionSummary = {
  sessionId: string
  latestTimestamp: number
  count: number
}

export function LogManagementTool() {
  const { t } = useTranslation()

  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<LogSessionSummary[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string>("")
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [query, setQuery] = useState("")
  const [error, setError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return logs
    return logs.filter((l) => {
      const hay = [l.message, l.method, l.details, l.note, l.input, l.output].filter(Boolean).join("\n").toLowerCase()
      return hay.includes(q)
    })
  }, [logs, query])

  const reloadSessions = async () => {
    setError(null)
    setLoading(true)
    try {
      const result = await invoke<LogSessionSummary[]>("list_log_sessions")
      setSessions(result)
      if (result.length > 0) {
        setActiveSessionId((prev) => prev || result[0].sessionId)
      } else {
        setActiveSessionId("")
        setLogs([])
      }
    } catch (e: any) {
      // 后端命令尚未实现时，给出清晰提示
      setError(typeof e === "string" ? e : (e?.toString?.() ?? "Unknown error"))
    } finally {
      setLoading(false)
    }
  }

  const reloadLogs = async (sessionId: string) => {
    if (!sessionId) {
      setLogs([])
      return
    }
    setError(null)
    setLoading(true)
    try {
      const result = await invoke<LogEntry[]>("get_logs_by_session", { sessionId })
      setLogs(result)
    } catch (e: any) {
      setError(typeof e === "string" ? e : (e?.toString?.() ?? "Unknown error"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reloadSessions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (activeSessionId) reloadLogs(activeSessionId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId])

  const handleDeleteLog = async (id: string) => {
    setError(null)
    try {
      await invoke("delete_log", { id })
      await reloadLogs(activeSessionId)
      await reloadSessions()
    } catch (e: any) {
      setError(typeof e === "string" ? e : (e?.toString?.() ?? "Unknown error"))
    }
  }

  return (
    <div className="h-full p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="space-y-1">
          <div className="text-xl font-semibold">{t("nav.logManagement", "日志管理")}</div>
          <div className="text-tiny text-default-500">
            {t("logManagement.subtitle", "查看已保存日志（按会话），支持搜索与删除。")}
          </div>
        </div>
        <Button variant="flat" startContent={<RefreshCw className="w-4 h-4" />} onPress={reloadSessions}>
          {t("common.refresh", "刷新")}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100%-64px)]">
        <Card className="lg:col-span-1">
          <CardBody className="space-y-3">
            <div className="text-sm font-semibold">{t("logManagement.sessions", "日志会话")}</div>

            {loading && sessions.length === 0 ? (
              <div className="flex items-center gap-2 text-default-500 text-sm">
                <Spinner size="sm" /> {t("common.loading", "加载中...")}
              </div>
            ) : (
              <Select
                label={t("logManagement.selectSession", "选择会话")}
                selectedKeys={activeSessionId ? new Set([activeSessionId]) : new Set()}
                onSelectionChange={(keys) => {
                  const first = Array.from(keys)[0] as string | undefined
                  setActiveSessionId(first ?? "")
                }}
                disallowEmptySelection={false}
              >
                {sessions.map((s) => (
                  <SelectItem key={s.sessionId} textValue={s.sessionId}>
                    {new Date(s.latestTimestamp).toLocaleString()} · {s.count}
                  </SelectItem>
                ))}
              </Select>
            )}

            <Input
              label={t("common.search", "搜索")}
              value={query}
              onValueChange={setQuery}
              placeholder={t("logManagement.searchPlaceholder", "搜索 message / method / note ...")}
            />

            {error && (
              <div className="text-danger text-tiny break-all">
                {t("common.error", "错误")}: {error}
                <div className="text-default-500 mt-1">
                  {t("logManagement.backendHint", "提示：后端数据库/命令正在接入中，下一步会实现。")}
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2 overflow-hidden">
          <CardBody className="space-y-3 overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">
                {t("logManagement.logs", "日志")}
                <span className="text-tiny text-default-500 ml-2">({filtered.length})</span>
              </div>
            </div>

            <div className="flex-1 overflow-auto space-y-2">
              {loading && logs.length === 0 ? (
                <div className="flex items-center gap-2 text-default-500 text-sm">
                  <Spinner size="sm" /> {t("common.loading", "加载中...")}
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-default-400 text-sm py-8 text-center">
                  {t("logManagement.empty", "暂无日志")}
                </div>
              ) : (
                filtered.map((l) => (
                  <div key={l.id} className="p-3 rounded-medium border border-divider bg-content1/40">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-tiny text-default-500">
                          {new Date(l.timestamp).toLocaleString()} · {l.type}
                        </div>
                        <div className="text-sm font-mono break-all text-foreground/90 mt-1">
                          {l.method ? `${l.method}: ${l.input ?? ""} -> ${l.output ?? ""}` : (l.message ?? "")}
                        </div>
                        {l.note && (
                          <div className="text-tiny text-default-600 mt-1 break-all">
                            {t("log.note", "备注")}: {l.note}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          className="h-8 w-8 min-w-8"
                          isDisabled
                          title={t("common.edit", "编辑")}
                        >
                          <Pencil className="w-4 h-4 text-default-400" />
                        </Button>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          className="h-8 w-8 min-w-8"
                          onPress={() => handleDeleteLog(l.id)}
                          title={t("common.delete", "删除")}
                        >
                          <Trash2 className="w-4 h-4 text-danger" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
