import { useEffect, useMemo, useState } from "react"
import {
  Input,
  Select,
  SelectItem,
  Button,
  Switch,
  Textarea,
  addToast,
} from "../../components/ui/base-ui"
import { Copy, Network, Settings2, FileDown, FileJson, ListPlus, Dices } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLogActions } from "../../contexts/LogContext"
import { getStoredItem, setStoredItem } from "../../lib/store"
import type { Ipv4HostRule, SubnetResult } from "../../lib/ip_subnet"
import { SubnetError, calcFromCidr, calcFromIpv4Netmask, getIpv4AddressMeta, ipv4PrefixToMaskString } from "../../lib/ip_subnet"
import { save } from "@tauri-apps/plugin-dialog"
import { writeFile } from "@tauri-apps/plugin-fs"

type InputMode = "cidr" | "ipv4Netmask"

interface SubnetToolState {
  mode: InputMode
  cidr: string
  ipv4: string
  netmask: string
  ipv4HostRule: Ipv4HostRule
  showBinary: boolean
  preferIpv6Expanded: boolean
}

const STORAGE_KEY = "subnet-tool-state"

export function SubnetTab() {
  const { t } = useTranslation()
  const { addLog } = useLogActions()

  const [mode, setMode] = useState<InputMode>("cidr")
  const [cidr, setCidr] = useState("")
  const [ipv4, setIpv4] = useState("")
  const [netmask, setNetmask] = useState("")

  const [ipv4HostRule, setIpv4HostRule] = useState<Ipv4HostRule>("rfc3021")
  const [showBinary, setShowBinary] = useState(false)
  const [preferIpv6Expanded, setPreferIpv6Expanded] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SubnetResult | null>(null)

  // Load persisted state
  useEffect(() => {
    let alive = true
    ;(async () => {
      const raw = await getStoredItem(STORAGE_KEY)
      if (!alive || !raw) return
      try {
        const parsed = JSON.parse(raw) as Partial<SubnetToolState>
        if (parsed.mode === "cidr" || parsed.mode === "ipv4Netmask") setMode(parsed.mode)
        if (typeof parsed.cidr === "string") setCidr(parsed.cidr)
        if (typeof parsed.ipv4 === "string") setIpv4(parsed.ipv4)
        if (typeof parsed.netmask === "string") setNetmask(parsed.netmask)
        if (parsed.ipv4HostRule === "traditional" || parsed.ipv4HostRule === "rfc3021") setIpv4HostRule(parsed.ipv4HostRule)
        if (typeof parsed.showBinary === "boolean") setShowBinary(parsed.showBinary)
        if (typeof parsed.preferIpv6Expanded === "boolean") setPreferIpv6Expanded(parsed.preferIpv6Expanded)
      } catch (e) {
        console.warn("Failed to restore subnet tool state", e)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  // Persist state (debounced)
  useEffect(() => {
    const state: SubnetToolState = {
      mode,
      cidr,
      ipv4,
      netmask,
      ipv4HostRule,
      showBinary,
      preferIpv6Expanded,
    }
    const id = window.setTimeout(() => {
      setStoredItem(STORAGE_KEY, JSON.stringify(state)).catch((e) => console.error(e))
    }, 300)
    return () => clearTimeout(id)
  }, [mode, cidr, ipv4, netmask, ipv4HostRule, showBinary, preferIpv6Expanded])

  // Compute result
  useEffect(() => {
    const hasInput =
      (mode === "cidr" && cidr.trim().length > 0) ||
      (mode === "ipv4Netmask" && (ipv4.trim().length > 0 || netmask.trim().length > 0))

    if (!hasInput) {
      setError(null)
      setResult(null)
      return
    }

    try {
      const r =
        mode === "cidr"
          ? calcFromCidr(cidr, { ipv4HostRule })
          : calcFromIpv4Netmask(ipv4, netmask, { ipv4HostRule })
      setError(null)
      setResult(r)
    } catch (e) {
      const msg = subnetErrorToMessage(e, t)
      setError(msg)
      setResult(null)
    }
  }, [mode, cidr, ipv4, netmask, ipv4HostRule, t])

  const copyToClipboard = (text: string, context?: { method: string; input?: string }) => {
    if (!text) return
    // Keep for potential future logging integration.
    void context?.method
    void context?.input
    navigator.clipboard.writeText(text)
    addToast({ title: t("tools.converter.copiedToClipboard"), severity: "success" })

    // if (context) {
    //   addLog(
    //     {
    //       method: context.method,
    //       input: context.input || "-",
    //       output: text,
    //     },
    //     "success",
    //   )
    // }
  }

  const summary = useMemo(() => {
    if (!result) return null
    if (result.version === 4) {
      return `${result.ip}/${result.prefix} → ${result.networkAddress}/${result.prefix}`
    }
    return `${result.ip}/${result.prefix} → ${result.networkPrefixCompressed}`
  }, [result])

  const ipv4Meta = useMemo(() => {
    if (!result || result.version !== 4) return null
    return getIpv4AddressMeta(result.ip)
  }, [result])

  const exportRows = useMemo(() => {
    if (!result) return [] as Array<{ key: string; value: string }>
    if (result.version === 4) {
      const meta = ipv4Meta
      return [
        { key: t("tools.converter.export.key"), value: t("tools.converter.export.value") },
        { key: t("tools.converter.ipAddress"), value: result.ip },
        { key: t("tools.converter.cidr"), value: `/${result.prefix}` },
        { key: t("tools.converter.networkAddress"), value: result.networkAddress },
        { key: t("tools.converter.broadcastAddress"), value: result.broadcastAddress },
        { key: t("tools.converter.subnetMask"), value: result.subnetMask },
        { key: t("tools.converter.wildcardMask"), value: result.wildcardMask },
        { key: t("tools.converter.firstHost"), value: result.firstHost ?? "-" },
        { key: t("tools.converter.lastHost"), value: result.lastHost ?? "-" },
        { key: t("tools.converter.hostTotal"), value: result.totalAddresses },
        { key: t("tools.converter.usableHosts"), value: result.usableAddresses },
        { key: t("tools.converter.ipv4Class"), value: meta ? meta.ipv4Class : "-" },
        { key: t("tools.converter.ipv4AddressType"), value: meta ? t(`tools.converter.ipv4Type.${meta.addressType}`) : "-" },
        { key: t("tools.converter.isPrivate"), value: meta ? (meta.isPrivate ? t("common.yes") : t("common.no")) : "-" },
      ]
    }

    return [
      { key: t("tools.converter.export.key"), value: t("tools.converter.export.value") },
      { key: t("tools.converter.ipAddress"), value: result.ip },
      { key: t("tools.converter.cidr"), value: `/${result.prefix}` },
      { key: t("tools.converter.networkPrefix"), value: preferIpv6Expanded ? result.networkPrefixExpanded : result.networkPrefixCompressed },
      { key: t("tools.converter.networkAddress"), value: preferIpv6Expanded ? result.networkAddressExpanded : result.networkAddressCompressed },
      { key: t("tools.converter.lastAddress"), value: preferIpv6Expanded ? result.lastAddressExpanded : result.lastAddressCompressed },
      { key: t("tools.converter.totalAddresses"), value: result.totalAddresses },
      { key: t("tools.converter.usableAddresses"), value: result.usableAddresses },
    ]
  }, [result, ipv4Meta, preferIpv6Expanded, t])

  const toCsv = (rows: Array<{ key: string; value: string }>) => {
    const esc = (v: string) => {
      const s = String(v ?? "")
      if (/[\n\r,\"]/g.test(s)) return `"${s.replace(/\"/g, '""')}"`
      return s
    }

    // rows[0] is header
    return rows.map((r) => `${esc(r.key)},${esc(r.value)}`).join("\n")
  }

  const toJson = (rows: Array<{ key: string; value: string }>) => {
    const obj: Record<string, string> = {}
    for (const r of rows.slice(1)) {
      obj[r.key] = r.value
    }
    return JSON.stringify(obj, null, 2)
  }

  const buildExportBaseName = () => {
    if (!result) return "subnet-ip"
    const ipStr = (result.version === 4 ? result.ip : result.ip).toString()
    const sanitized = ipStr
      .replaceAll(".", "-")
      .replaceAll(":", "-")
      .replaceAll("/", "-")
      .replace(/[^0-9A-Za-z_-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
    return `subnet-${sanitized}-${result.prefix}`
  }

  const handleAddToLog = () => {
    if (!result) return
    const text = toCsv(exportRows)
    const inputText = mode === "cidr" ? cidr : `${ipv4} ${netmask}`
    addLog(
      {
        method: t("tools.converter.subnet"),
        input: inputText || "-",
        output: text,
      },
      "success",
    )
    addToast({ title: t("tools.converter.addedToLog"), severity: "success" })
  }

  const handleCopyTable = () => {
    if (!result) return
    const text = toCsv(exportRows)
    copyToClipboard(text, { method: "Copy Subnet Table", input: summary || undefined })
  }

  const handleExportCsv = async () => {
    if (!result) return
    try {
      const filePath = await save({
        defaultPath: `${buildExportBaseName()}.csv`,
        filters: [{ name: "CSV", extensions: ["csv"] }],
      })
      if (!filePath) return
      const text = toCsv(exportRows)
      const bytes = new TextEncoder().encode(text)
      await writeFile(filePath, bytes)
      addToast({ title: t("tools.converter.exported"), severity: "success" })
    } catch (e) {
      console.error(e)
      addToast({ title: t("common.error"), severity: "danger" })
    }
  }

  const handleExportJson = async () => {
    if (!result) return
    try {
      const filePath = await save({
        defaultPath: `${buildExportBaseName()}.json`,
        filters: [{ name: "JSON", extensions: ["json"] }],
      })
      if (!filePath) return
      const text = toJson(exportRows)
      const bytes = new TextEncoder().encode(text)
      await writeFile(filePath, bytes)
      addToast({ title: t("tools.converter.exported"), severity: "success" })
    } catch (e) {
      console.error(e)
      addToast({ title: t("common.error"), severity: "danger" })
    }
  }

  const getKeepPrefixFromCidr = () => {
    const cur = cidr.trim()
    const m = cur.match(/\/(\d+)\s*$/)
    if (!m) return null
    const n = Number(m[1])
    if (!Number.isInteger(n)) return null
    return n
  }

  const handleRandomIpv4Netmask = () => {
    const ip = randomIpv4()
    const prefix = randomInt(8, 30)
    setIpv4(ip)
    setNetmask(ipv4PrefixToMaskString(prefix))
  }

  const handleRandomCidrIpv4 = () => {
    const keepPrefix = getKeepPrefixFromCidr()
    const prefix = keepPrefix !== null && keepPrefix >= 0 && keepPrefix <= 32 ? keepPrefix : 24
    setCidr(`${randomIpv4()}/${prefix}`)
  }

  const handleRandomCidrIpv6 = () => {
    const keepPrefix = getKeepPrefixFromCidr()
    const prefix = keepPrefix !== null && keepPrefix >= 0 && keepPrefix <= 128 ? keepPrefix : 64
    setCidr(`${randomIpv6Expanded()}/${prefix}`)
  }

  const ResultRow = ({
    label,
    value,
    copyLabel,
  }: {
    label: string
    value: string
    copyLabel: string
  }) => (
    <div className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-default-200 bg-default-50/40 p-2.5 transition-colors hover:border-primary/30">
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <span className="text-[10px] text-default-500 font-medium uppercase tracking-wider">{label}</span>
        <span className="truncate font-mono text-sm font-semibold text-primary" title={value}>{value}</span>
      </div>
      <Button
        isIconOnly
        size="sm"
        variant="light"
        className="h-8 w-8 min-w-8 shrink-0 text-default-400 hover:text-primary"
        onPress={() => copyToClipboard(value, { method: copyLabel, input: summary || undefined })}
        aria-label={`${t("tools.converter.copy")} ${label}`}
      >
        <Copy className="w-3.5 h-3.5" />
      </Button>
    </div>
  )

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <section className="shrink-0 rounded-xl border border-default-200 bg-default-50/60 p-3">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
              <Network className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold">{t("tools.converter.subnet")}</h3>
              <p className="text-sm text-default-500 font-mono mt-0.5 break-all">{summary || t("tools.converter.subnetDesc")}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
            <div className="space-y-3">
              <Select
                label={t("tools.converter.subnetInputMode")}
                selectedKeys={[mode]}
                onChange={(e) => setMode(e.target.value as InputMode)}
                classNames={{ trigger: "bg-default-100" }}
              >
                <SelectItem key="cidr" textValue="CIDR">
                  CIDR
                </SelectItem>
                <SelectItem key="ipv4Netmask" textValue="IPv4 + Netmask">
                  IPv4 + Netmask
                </SelectItem>
              </Select>

              {mode === "cidr" ? (
                <div className="flex gap-2">
                  <Input
                    label={t("tools.converter.cidr")}
                    placeholder={t("tools.converter.cidrPlaceholder")}
                    value={cidr}
                    onValueChange={setCidr}
                    classNames={{ inputWrapper: "bg-default-100" }}
                    className="flex-1"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label={t("tools.converter.ipv4Address")}
                    placeholder={t("tools.converter.ipv4Placeholder")}
                    value={ipv4}
                    onValueChange={setIpv4}
                    classNames={{ inputWrapper: "bg-default-100" }}
                  />
                  <div className="flex gap-2">
                    <Input
                      label={t("tools.converter.subnetMask")}
                      placeholder={t("tools.converter.subnetMaskPlaceholder")}
                      value={netmask}
                      onValueChange={setNetmask}
                      classNames={{ inputWrapper: "bg-default-100" }}
                      className="flex-1"
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{error}</div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-default-500">
                <Settings2 className="w-4 h-4" />
                <span className="text-sm font-medium">{t("tools.converter.converterOptions")}</span>
              </div>

              <div className="flex flex-col gap-2">
                {mode === "cidr" ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="flat"
                      startContent={<Dices className="w-4 h-4" />}
                      onPress={handleRandomCidrIpv4}
                    >
                      {t("tools.converter.randomIpv4")}
                    </Button>
                    <Button
                      size="sm"
                      variant="flat"
                      startContent={<Dices className="w-4 h-4" />}
                      onPress={handleRandomCidrIpv6}
                    >
                      {t("tools.converter.randomIpv6")}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="flat"
                      startContent={<Dices className="w-4 h-4" />}
                      onPress={handleRandomIpv4Netmask}
                    >
                      {t("tools.converter.randomIpv4")}
                    </Button>
                  </div>
                )}
                <Switch
                  size="sm"
                  isSelected={ipv4HostRule === "rfc3021"}
                  onValueChange={(v) => setIpv4HostRule(v ? "rfc3021" : "traditional")}
                >
                  {t("tools.converter.rfc3021Mode")}
                </Switch>
                <Switch size="sm" isSelected={showBinary} onValueChange={setShowBinary}>
                  {t("tools.converter.showBinary")}
                </Switch>
                <Switch size="sm" isSelected={preferIpv6Expanded} onValueChange={setPreferIpv6Expanded}>
                  {t("tools.converter.preferIpv6Expanded")}
                </Switch>
              </div>
            </div>
          </div>
        </div>
      </section>

      {result && (
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-default-200 bg-background">
            <div className="flex min-h-11 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-default-200 px-3.5 py-1.5">
              <h3 className="font-semibold text-lg">{t("tools.converter.output")}</h3>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <Button size="sm" variant="flat" startContent={<ListPlus className="w-4 h-4" />} onPress={handleAddToLog}>
                  {t("tools.converter.addToLog")}
                </Button>
                <Button size="sm" variant="flat" startContent={<Copy className="w-4 h-4" />} onPress={handleCopyTable}>
                  {t("tools.converter.copy")}
                </Button>
                <Button size="sm" variant="flat" startContent={<FileDown className="w-4 h-4" />} onPress={handleExportCsv}>
                  {t("tools.converter.exportCsv")}
                </Button>
                <Button size="sm" variant="flat" startContent={<FileJson className="w-4 h-4" />} onPress={handleExportJson}>
                  {t("tools.converter.exportJson")}
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-auto p-3">

            {result.version === 4 ? (
              <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                <ResultRow label={t("tools.converter.ipAddress")} value={result.ip} copyLabel="Copy IP Address" />
                <ResultRow label={t("tools.converter.cidr")} value={`/${result.prefix}`} copyLabel="Copy CIDR" />
                <ResultRow label={t("tools.converter.networkAddress")} value={result.networkAddress} copyLabel="Copy Network Address" />
                <ResultRow label={t("tools.converter.broadcastAddress")} value={result.broadcastAddress} copyLabel="Copy Broadcast Address" />
                <ResultRow label={t("tools.converter.firstHost")} value={result.firstHost ?? "-"} copyLabel="Copy First Host" />
                <ResultRow label={t("tools.converter.lastHost")} value={result.lastHost ?? "-"} copyLabel="Copy Last Host" />
                <ResultRow label={t("tools.converter.subnetMask")} value={result.subnetMask} copyLabel="Copy Subnet Mask" />
                <ResultRow label={t("tools.converter.wildcardMask")} value={result.wildcardMask} copyLabel="Copy Wildcard Mask" />
                <ResultRow label={t("tools.converter.hostTotal")} value={result.totalAddresses} copyLabel="Copy Total Addresses" />
                <ResultRow label={t("tools.converter.usableHosts")} value={result.usableAddresses} copyLabel="Copy Usable Addresses" />
                <ResultRow label={t("tools.converter.ipv4Class")} value={ipv4Meta ? ipv4Meta.ipv4Class : "-"} copyLabel="Copy IPv4 Class" />
                <ResultRow label={t("tools.converter.ipv4AddressType")} value={ipv4Meta ? t(`tools.converter.ipv4Type.${ipv4Meta.addressType}`) : "-"} copyLabel="Copy IPv4 Type" />
                <ResultRow label={t("tools.converter.isPrivate")} value={ipv4Meta ? (ipv4Meta.isPrivate ? t("common.yes", "Yes") : t("common.no", "No")) : "-"} copyLabel="Copy Is Private" />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                <ResultRow
                  label={t("tools.converter.ipAddress")}
                  value={preferIpv6Expanded ? result.ipExpanded : result.ip}
                  copyLabel="Copy IP Address"
                />
                <ResultRow label={t("tools.converter.cidr")} value={`/${result.prefix}`} copyLabel="Copy CIDR" />
                <ResultRow
                  label={t("tools.converter.networkPrefix")}
                  value={preferIpv6Expanded ? result.networkPrefixExpanded : result.networkPrefixCompressed}
                  copyLabel="Copy IPv6 Network Prefix"
                />
                <ResultRow
                  label={t("tools.converter.totalAddresses")}
                  value={result.totalAddresses}
                  copyLabel="Copy Total Addresses"
                />
                <ResultRow
                  label={t("tools.converter.networkAddress")}
                  value={preferIpv6Expanded ? result.networkAddressExpanded : result.networkAddressCompressed}
                  copyLabel="Copy Network Address"
                />
                <ResultRow
                  label={t("tools.converter.lastAddress")}
                  value={preferIpv6Expanded ? result.lastAddressExpanded : result.lastAddressCompressed}
                  copyLabel="Copy Last Address"
                />
                <ResultRow label={t("tools.converter.usableAddresses")} value={result.usableAddresses} copyLabel="Copy Usable Addresses" />
              </div>
            )}

            {showBinary && (
              <div className="grid grid-cols-1 gap-3 pt-1 lg:grid-cols-2">
                {result.version === 4 ? (
                  <>
                    <Textarea
                      label={t("tools.converter.binaryIp")}
                      value={result.binary.ip}
                      readOnly
                      minRows={2}
                      classNames={{ input: "font-mono" , inputWrapper: "bg-default-100/50" }}
                    />
                    <Textarea
                      label={t("tools.converter.binaryMask")}
                      value={result.binary.subnetMask}
                      readOnly
                      minRows={2}
                      classNames={{ input: "font-mono" , inputWrapper: "bg-default-100/50" }}
                    />
                    <Textarea
                      label={t("tools.converter.binaryNetwork")}
                      value={result.binary.networkAddress}
                      readOnly
                      minRows={2}
                      classNames={{ input: "font-mono" , inputWrapper: "bg-default-100/50" }}
                    />
                    <Textarea
                      label={t("tools.converter.binaryBroadcast")}
                      value={result.binary.broadcastAddress}
                      readOnly
                      minRows={2}
                      classNames={{ input: "font-mono" , inputWrapper: "bg-default-100/50" }}
                    />
                  </>
                ) : (
                  <>
                    <Textarea
                      label={t("tools.converter.binaryIp")}
                      value={result.binary.ip}
                      readOnly
                      minRows={4}
                      classNames={{ input: "font-mono" , inputWrapper: "bg-default-100/50" }}
                    />
                    <Textarea
                      label={t("tools.converter.binaryNetwork")}
                      value={result.binary.networkAddress}
                      readOnly
                      minRows={4}
                      classNames={{ input: "font-mono" , inputWrapper: "bg-default-100/50" }}
                    />
                    <Textarea
                      label={t("tools.converter.binaryLast")}
                      value={result.binary.lastAddress}
                      readOnly
                      minRows={4}
                      classNames={{ input: "font-mono" , inputWrapper: "bg-default-100/50" }}
                    />
                  </>
                )}
              </div>
            )}
            </div>
        </section>
      )}

      {!result && (
        <section className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-dashed border-default-200 bg-default-50/25 p-6 text-center">
          <div className="max-w-sm">
            <Network className="mx-auto mb-3 h-8 w-8 text-default-300" />
            <p className="text-sm font-medium text-default-500">{error || t("tools.converter.subnetDesc")}</p>
          </div>
        </section>
      )}
    </div>
  )
}

function subnetErrorToMessage(e: unknown, t: (key: string) => string): string {
  if (e instanceof SubnetError) {
    switch (e.code) {
      case "invalid_cidr":
        return t("tools.converter.invalidCidr")
      case "invalid_prefix":
        return t("tools.converter.invalidPrefix")
      case "invalid_netmask":
        return t("tools.converter.invalidNetmask")
      case "invalid_ipv4":
      case "invalid_ipv6":
        return t("tools.converter.invalidIp")
      case "invalid_input":
      default:
        return t("tools.converter.invalidInput")
    }
  }
  return t("tools.converter.invalidInput")
}

function randomInt(min: number, max: number): number {
  const lo = Math.ceil(min)
  const hi = Math.floor(max)
  return Math.floor(Math.random() * (hi - lo + 1)) + lo
}

function randomIpv4(): string {
  // Prefer unicast ranges; avoid 0.x.x.x and 127.x.x.x by default.
  const a = (() => {
    while (true) {
      const v = randomInt(1, 223)
      if (v === 127) continue
      return v
    }
  })()
  const b = randomInt(0, 255)
  const c = randomInt(0, 255)
  const d = randomInt(0, 255)
  return `${a}.${b}.${c}.${d}`
}

function randomIpv6Expanded(): string {
  const hextet = () => randomInt(0, 0xffff).toString(16).padStart(4, "0")
  return `${hextet()}:${hextet()}:${hextet()}:${hextet()}:${hextet()}:${hextet()}:${hextet()}:${hextet()}`
}
