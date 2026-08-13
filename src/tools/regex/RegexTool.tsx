import { useEffect, useMemo, useRef, useState } from "react"
import {
  Button,
  ButtonGroup,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Input,
  Textarea,
  addToast,
} from "../../components/ui/base-ui"
import CodeEditor, { type CodeEditorHandle } from "../../components/CodeEditor"
import { AlertCircle, CheckCircle2, ChevronDown, Copy, FileDown, ListPlus, Search, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { getStoredItem, removeStoredItem, setStoredItem } from "../../lib/store"
import { save } from "@tauri-apps/plugin-dialog"
import { writeFile } from "@tauri-apps/plugin-fs"
import {
  buildRegExp,
  collectMatches,
  ensureGlobal,
  formatMatchesAsCsv,
  normalizeFlags,
  parseRegexLiteral,
  replaceAll,
  replaceOnce,
  type RegexMatch,
} from "./regex"

// 类型定义
type PanelTab = "matchInfo" | "extract" | "replaceResult"

interface RegexToolState {
  pattern: string
  flags: string
  input: string
  replacement: string
  extractExpr: string
  panelTab: PanelTab
}

const STORAGE_KEY = "regex-tool-state" // 本地存储键名，用于保存工具状态
const FLAG_ORDER = ["g", "i", "m", "s", "u"] as const // 正则表达式标志的显示顺序
const MAX_RENDERED_MATCHES = 1000 // 限制右侧结果和编辑器高亮数量，避免大文本全局匹配占用过多内存
/**
 * RegexTool 组件 - 正则表达式测试和替换工具
 * 提供正则表达式模式匹配、标志设置、文本替换等功能
 * 支持 CodeMirror 编辑器集成和结果导出
 */
export function RegexTool() {
  const { t, i18n } = useTranslation()

  // 正则表达式三要素：pattern + flags + input（测试文本）
  const [pattern, setPattern] = useState("")
  const [flags, setFlags] = useState("g")
  const [input, setInput] = useState("")
  const [replacement, setReplacement] = useState("")
  const [extractExpr, setExtractExpr] = useState("$0")
  const [panelTab, setPanelTab] = useState<PanelTab>("matchInfo")

  // 匹配状态：错误信息 / 匹配列表 / 选中项 / 执行耗时
  const [regexError, setRegexError] = useState<string | null>(null)
  const [matches, setMatches] = useState<RegexMatch[]>([])
  const [elapsedMs, setElapsedMs] = useState<number>(0)
  const [selectedMatchIndex, setSelectedMatchIndex] = useState<number | null>(null)

  // 替换结果状态：输出文本与替换次数
  const [output, setOutput] = useState("")
  const [replaceCount, setReplaceCount] = useState(0)

  // 常用正则（预设）弹层与过滤关键字
  const [isPresetOpen, setIsPresetOpen] = useState(false)
  const [presetQuery, setPresetQuery] = useState("")
  const [isFlagsOpen, setIsFlagsOpen] = useState(false)

  // 编辑器引用用于在点击匹配项时选中并滚动到对应文本。
  const editorRef = useRef<CodeEditorHandle>(null)
  const presetPopoverRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // 初始化：从本地存储恢复上一次输入的状态
    let alive = true
      ; (async () => {
        const raw = await getStoredItem(STORAGE_KEY)
        if (!alive || !raw) return
        try {
          const parsed = JSON.parse(raw) as Partial<RegexToolState>
          if (typeof parsed.pattern === "string") setPattern(parsed.pattern)
          if (typeof parsed.flags === "string") setFlags(normalizeFlags(parsed.flags))
          if (typeof parsed.input === "string") setInput(parsed.input)
          if (typeof parsed.replacement === "string") setReplacement(parsed.replacement)
          if (typeof parsed.extractExpr === "string") setExtractExpr(parsed.extractExpr)
          if (parsed.panelTab === "matchInfo" || parsed.panelTab === "extract" || parsed.panelTab === "replaceResult") setPanelTab(parsed.panelTab)
        } catch (e) {
          console.warn("Failed to restore regex tool state", e)
        }
      })()
    return () => {
      alive = false
    }
  }, []) // 从本地存储恢复工具状态

  useEffect(() => {
    // 持久化：对输入做轻量 debounce，避免频繁写入存储
    const state: RegexToolState = {
      pattern,
      flags,
      input,
      replacement,
      extractExpr,
      panelTab,
    }
    const id = window.setTimeout(() => {
      setStoredItem(STORAGE_KEY, JSON.stringify(state)).catch((e) => console.error(e))
    }, 300)
    return () => clearTimeout(id)
  }, [pattern, flags, input, replacement, extractExpr, panelTab]) // 延迟保存工具状态到本地存储

  const flagsLabel = useMemo(() => normalizeFlags(flags), [flags])
  const flagTooltips = useMemo<Record<string, string>>(
    () => ({
      g: t("tools.regex.flagHelp.g"),
      i: t("tools.regex.flagHelp.i"),
      m: t("tools.regex.flagHelp.m"),
      s: t("tools.regex.flagHelp.s"),
      u: t("tools.regex.flagHelp.u"),
      y: t("tools.regex.flagHelp.y"),
    }),
    [t]
  )

  const preferredRegion = useMemo<"cn" | "hk" | "tw" | "jp" | null>(() => {
    const lang = (i18n.language || "").toLowerCase()
    if (lang.startsWith("zh-hk")) return "hk"
    if (lang.startsWith("zh-tw")) return "tw"
    if (lang === "zh" || lang.startsWith("zh-")) return "cn"
    if (lang.startsWith("ja")) return "jp"
    return null
  }, [i18n.language])

  const presetGroups = useMemo(() => {
    const common = {
      id: "common",
      title: t("tools.regex.presets.groupCommon"),
      items: [
        { id: "num", label: t("tools.regex.presets.common.number"), pattern: "[0-9]+" },
        { id: "email", label: t("tools.regex.presets.common.email"), pattern: "\\w+([-+.]\\w+)*@\\w+([-.]\\w+)*\\.\\w+([-.]\\w+)*" },
        { id: "url", label: t("tools.regex.presets.common.url"), pattern: "https?://([\\w-]+\\.)+[\\w-]+(/[\\w-./?%&=]*)?" },
        { id: "ip", label: t("tools.regex.presets.common.ipv4"), pattern: "(\\d{1,3}\\.){3}\\d{1,3}" },
      ],
    }

    const cn = {
      id: "cn",
      title: t("tools.regex.presets.groupCN"),
      items: [
        { id: "cn-mobile", label: t("tools.regex.presets.cn.mobile"), pattern: "1[3-9]\\d{9}" },
        { id: "cn-id", label: t("tools.regex.presets.cn.idcard"), pattern: "\\d{17}[0-9Xx]|\\d{15}" },
        { id: "cn-hanzi", label: t("tools.regex.presets.cn.hanzi"), pattern: "[\\u4e00-\\u9fff]+" },
      ],
    }

    const hk = {
      id: "hk",
      title: t("tools.regex.presets.groupHK"),
      items: [
        { id: "hk-mobile", label: t("tools.regex.presets.hk.mobile"), pattern: "[569]\\d{7}" },
        { id: "hk-hanzi", label: t("tools.regex.presets.hk.hanzi"), pattern: "[\\u4e00-\\u9fff]+" },
      ],
    }

    const mo = {
      id: "mo",
      title: t("tools.regex.presets.groupMO"),
      items: [
        { id: "mo-mobile", label: t("tools.regex.presets.mo.mobile"), pattern: "[569]\\d{7}" },
      ],
    }

    const tw = {
      id: "tw",
      title: t("tools.regex.presets.groupTW"),
      items: [
        { id: "tw-hanzi", label: t("tools.regex.presets.tw.hanzi"), pattern: "[\\u4e00-\\u9fff]+" },
      ],
    }

    const jp = {
      id: "jp",
      title: t("tools.regex.presets.groupJP"),
      items: [
        { id: "jp-mobile", label: t("tools.regex.presets.jp.mobile"), pattern: "(?:070|080|090|050|020)\\d{8}" },
        { id: "jp-kanji", label: t("tools.regex.presets.jp.kanji"), pattern: "[\\u4e00-\\u9fff]+" },
        { id: "jp-hira", label: t("tools.regex.presets.jp.hiragana"), pattern: "[\\u3040-\\u309F]+" },
        { id: "jp-kata", label: t("tools.regex.presets.jp.katakana"), pattern: "[\\u30A0-\\u30FF]+" },
        { id: "jp-hira-kata", label: t("tools.regex.presets.jp.hiraganaKatakana"), pattern: "[\\u3040-\\u309F\\u30A0-\\u30FF]+" },
        { id: "jp-all-jp", label: t("tools.regex.presets.jp.allJapanese"), pattern: "[\\u3040-\\u309F\\u30A0-\\u30FF\\uFF65-\\uFF9F]+" },
        { id: "jp-jp-kanji", label: t("tools.regex.presets.jp.japanesePlusKanji"), pattern: "[\\u3040-\\u309F\\u30A0-\\u30FF\\uFF65-\\uFF9F\\u4E00-\\u9FFF]+" },
      ],
    }

    const regionGroups = [cn, hk, mo, tw, jp]
    const preferred = preferredRegion ? regionGroups.find((g) => g.id === preferredRegion) : undefined
    const rest = regionGroups.filter((g) => g.id !== preferred?.id)
    return [common, ...(preferred ? [preferred] : []), ...rest]
  }, [t, preferredRegion])

  const presetItemsFiltered = useMemo(() => {
    // 预设搜索：同时匹配 label / pattern / 分组标题
    const q = presetQuery.trim().toLowerCase()
    if (!q) return presetGroups
    return presetGroups
      .map((g) => {
        const items = g.items.filter((it) => {
          const hay = `${it.label} ${it.pattern} ${g.title}`.toLowerCase()
          return hay.includes(q)
        })
        return { ...g, items }
      })
      .filter((g) => g.items.length > 0)
  }, [presetGroups, presetQuery])

  useEffect(() => {
    // 点击弹层外部自动关闭（用 mousedown 比 click 更早触发，交互更跟手）
    if (!isPresetOpen) return
    const onPointerDown = (e: MouseEvent) => {
      const el = presetPopoverRef.current
      if (!el) return
      if (el.contains(e.target as Node)) return
      setIsPresetOpen(false)
    }
    window.addEventListener("mousedown", onPointerDown)
    return () => window.removeEventListener("mousedown", onPointerDown)
  }, [isPresetOpen])

  useEffect(() => {
    // 核心：构建 RegExp + 扫描 input，得到匹配列表与耗时（同样使用 debounce 降低编辑时开销）
    const id = window.setTimeout(() => {
      const built = buildRegExp(pattern, flagsLabel)
      if ("error" in built) {
        setRegexError(built.error)
        setMatches([])
        setElapsedMs(0)
        setSelectedMatchIndex(null)
        return
      }

      const start = performance.now()
      const m = collectMatches(input, built.regex, MAX_RENDERED_MATCHES)
      const end = performance.now()
      setRegexError(null)
      setMatches(m)
      setElapsedMs(Math.max(0, end - start))
      setSelectedMatchIndex((prev) => {
        if (prev === null) return null
        return prev >= 0 && prev < m.length ? prev : null
      })
    }, 150)
    return () => clearTimeout(id)
  }, [pattern, flagsLabel, input]) // 延迟执行正则表达式匹配，计算匹配结果和性能

  const editorHighlights = useMemo(
    () => matches.map((match, index) => ({
      from: match.start,
      to: match.end,
      active: index === selectedMatchIndex,
    })),
    [matches, selectedMatchIndex]
  )

  const handlePatternBlur = () => {
    const parsed = parseRegexLiteral(pattern)
    if (!parsed) return
    setPattern(parsed.pattern)
    setFlags(parsed.flags)
  }

  const jumpToMatch = (idx: number) => {
    // 点击某条匹配：滚动到对应位置并选中，方便定位上下文
    setSelectedMatchIndex(idx)
    const m = matches[idx]
    if (!m) return
    editorRef.current?.revealRange(m.start, m.end)
  } // 跳转到指定的匹配位置并选中

  const handleCopy = async (text: string) => {
    // 复制到剪贴板：空字符串直接忽略
    if (!text) return
    await navigator.clipboard.writeText(text)
    addToast({ title: t("tools.regex.copiedToClipboard"), severity: "success" })
  }

  const writeTextFile = async (defaultPath: string, ext: string, text: string) => {
    // Tauri 导出：弹出保存对话框并写入文件
    const filePath = await save({
      defaultPath,
      filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
    })
    if (!filePath) return
    await writeFile(filePath, new TextEncoder().encode(text))
    addToast({ title: t("common.success"), severity: "success" })
  }

  const matchInfoJson = useMemo(() => {
    return JSON.stringify(
      {
        pattern,
        flags: flagsLabel,
        input,
        matches,
      },
      null,
      2
    )
  }, [pattern, flagsLabel, input, matches])

  const matchResultsText = useMemo(() => {
    return matches.map((m) => m.text).join("\n")
  }, [matches])

  const extractedResultsText = useMemo(() => {
    // 分组提取：支持 $0 / $1..$99 / ${name} / $<name> / $$（字面 $）
    const expr = extractExpr.trim()
    if (!expr) return ""
    const applyExpr = (template: string, m: RegexMatch) => {
      return template.replace(/\$\$|\$(\d+)|\$\{([A-Za-z_][\w]*)\}|\$<([^>]+)>/g, (token, index, braced, angled) => {
        if (token === "$$") return "$"
        if (typeof index === "string" && index.length > 0) {
          const n = Number.parseInt(index, 10)
          if (Number.isNaN(n)) return ""
          if (n === 0) return m.text ?? ""
          const v = m.groups?.[n - 1]
          return v ?? ""
        }
        const name = (braced ?? angled) as string | undefined
        if (!name) return ""
        return m.namedGroups?.[name] ?? ""
      })
    }
    return matches.map((m) => applyExpr(expr, m)).join("\n")
  }, [matches, extractExpr])

  const handleExportMatches = async (format: "json" | "csv") => {
    if (format === "json") {
      await writeTextFile("regex-matches.json", "json", matchInfoJson)
      return
    }
    await writeTextFile("regex-matches.csv", "csv", formatMatchesAsCsv(matches))
  }

  const handleClearAll = async () => {
    // 一键清空：同时清理本地持久化与编辑器高亮
    setPattern("")
    setFlags("g")
    setInput("")
    setReplacement("")
    setExtractExpr("$0")
    setOutput("")
    setReplaceCount(0)
    setSelectedMatchIndex(null)
    setRegexError(null)
    setMatches([])
    setElapsedMs(0)
    await removeStoredItem(STORAGE_KEY)
  }

  const handleReplace = () => {
    const r = replaceOnce(input, pattern, flagsLabel, replacement)
    if ("error" in r) {
      setPanelTab("replaceResult")
      setOutput("")
      setReplaceCount(0)
      addToast({ title: t("tools.regex.invalidRegex"), severity: "danger" })
      return
    }
    setPanelTab("replaceResult")
    setOutput(r.output)
    setReplaceCount(r.count)
  } // 执行单次替换操作

  const handleReplaceAll = () => {
    const r = replaceAll(input, pattern, ensureGlobal(flagsLabel), replacement)
    if ("error" in r) {
      setPanelTab("replaceResult")
      setOutput("")
      setReplaceCount(0)
      addToast({ title: t("tools.regex.invalidRegex"), severity: "danger" })
      return
    }
    setPanelTab("replaceResult")
    setOutput(r.output)
    setReplaceCount(r.count)
  } // 执行全局替换操作

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <div className="relative z-20 flex min-h-[58px] shrink-0 flex-wrap items-end gap-2 rounded-xl border border-default-200 bg-default-50/70 p-2">
        <div className="min-w-[260px] flex-1">
          <Input
            size="sm"
            label={t("tools.regex.pattern")}
            aria-label={t("tools.regex.pattern")}
            placeholder={t("tools.regex.patternPlaceholder")}
            value={pattern}
            onValueChange={setPattern}
            onBlur={handlePatternBlur}
            classNames={{ input: "font-mono text-xs", inputWrapper: "bg-background" }}
            startContent={<span className="font-mono text-xs text-default-400">/</span>}
          />
        </div>

        <div className="flex shrink-0 flex-col gap-1">
          <span className="px-0.5 text-[11px] leading-none text-default-500">{t("tools.regex.flags")}</span>
          <Dropdown isOpen={isFlagsOpen} onOpenChange={setIsFlagsOpen}>
            <DropdownTrigger>
              <Button
                size="sm"
                variant="bordered"
                className="h-8 min-w-[84px] justify-between bg-background px-2.5 font-mono text-xs"
                endContent={<ChevronDown className="h-3.5 w-3.5 text-default-400" />}
              >
                {flagsLabel || "—"}
              </Button>
            </DropdownTrigger>
            <DropdownMenu
              aria-label={t("tools.regex.flags")}
              selectionMode="multiple"
              selectedKeys={new Set(flagsLabel.split(""))}
              closeOnSelect={false as any}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys as Set<string>)
                setFlags(normalizeFlags(selected.join("")))
                window.setTimeout(() => setIsFlagsOpen(true), 0)
              }}
            >
              {FLAG_ORDER.map((flag) => (
                <DropdownItem key={flag} textValue={`${flag} ${flagTooltips[flag]}`}>
                  <div className="flex items-center gap-3">
                    <span className="w-4 font-mono text-xs font-semibold">{flag}</span>
                    <span className="text-[11px] text-default-500">{flagTooltips[flag]}</span>
                  </div>
                </DropdownItem>
              ))}
            </DropdownMenu>
          </Dropdown>
        </div>

        <div className="relative" ref={presetPopoverRef}>
          <Button
            size="sm"
            variant="flat"
            className="h-8"
            startContent={<ListPlus className="h-4 w-4" />}
            onPress={() => {
              setIsPresetOpen((open) => !open)
              setPresetQuery("")
            }}
          >
            {t("tools.regex.presets.title")}
          </Button>

          {isPresetOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-[380px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-default-200 bg-background shadow-2xl">
              <div className="border-b border-default-200 p-2">
                <Input
                  size="sm"
                  aria-label={t("tools.regex.presets.searchPlaceholder")}
                  placeholder={t("tools.regex.presets.searchPlaceholder")}
                  value={presetQuery}
                  onValueChange={setPresetQuery}
                  startContent={<Search className="h-4 w-4 text-default-400" />}
                  classNames={{ input: "text-xs" }}
                />
              </div>
              <div className="max-h-[360px] space-y-2 overflow-auto p-2">
                {presetItemsFiltered.length === 0 ? (
                  <div className="p-6 text-center text-sm text-default-400">{t("tools.regex.presets.noResults")}</div>
                ) : presetItemsFiltered.map((group) => (
                  <div key={group.id} className="space-y-1">
                    <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-default-400">{group.title}</div>
                    {group.items.map((item) => (
                      <Button
                        key={item.id}
                        variant="light"
                        className="h-auto w-full justify-start rounded-lg px-3 py-2 text-left hover:bg-default-100"
                        onPress={() => {
                          setPattern(item.pattern)
                          setPanelTab("matchInfo")
                          setIsPresetOpen(false)
                        }}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-foreground">{item.label}</div>
                          <div className="mt-0.5 break-all font-mono text-[11px] text-default-500">{item.pattern}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="hidden h-5 w-px bg-default-200 sm:block" />
        <Button
          size="sm"
          variant="light"
          className="h-8 px-2.5"
          isDisabled={!pattern}
          onPress={() => handleCopy(`/${pattern}/${flagsLabel}`)}
          startContent={<Copy className="h-4 w-4" />}
        >
          {t("tools.regex.copyPattern")}
        </Button>
        <Button
          size="sm"
          variant="light"
          className="h-8 px-2.5 text-default-500 hover:bg-danger/10 hover:text-danger"
          isDisabled={!pattern && !input && !replacement && !output}
          onPress={handleClearAll}
          startContent={<Trash2 className="h-4 w-4" />}
        >
          {t("tools.regex.clear")}
        </Button>
      </div>

      <div className="regex-workbench grid min-h-0 flex-1 grid-rows-2 overflow-hidden rounded-xl border border-default-200 bg-background">
        <section className="flex min-h-0 min-w-0 flex-col" aria-labelledby="regex-input-heading">
          <div className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-default-200 px-3.5">
            <div className="flex min-w-0 items-baseline gap-3">
              <h2 id="regex-input-heading" className="shrink-0 text-sm font-semibold text-foreground">{t("tools.regex.testString")}</h2>
              <span className="truncate text-[11px] text-default-400">{input.length} {t("tools.formatter.characters")}</span>
            </div>
            <Button
              size="sm"
              variant="light"
              color="primary"
              className="h-8 min-w-0 px-2.5"
              isDisabled={!input}
              onPress={() => handleCopy(input)}
              startContent={<Copy className="h-4 w-4" />}
            >
              {t("tools.regex.copy")}
            </Button>
          </div>
          <div className="min-h-0 flex-1">
            <CodeEditor
              ref={editorRef}
              language="plaintext"
              value={input}
              onChange={setInput}
              highlights={editorHighlights}
              fontSize={13}
              contentPadding={16}
              ariaLabel={t("tools.regex.testString")}
            />
          </div>
        </section>

        <section className="regex-results flex min-h-0 min-w-0 flex-col border-t border-default-200" aria-label={t("tools.regex.panelsAria")}>
          <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-default-200 pr-3">
            <ButtonGroup aria-label={t("tools.regex.panelsAria")} className="min-w-0 rounded-lg bg-default-100 p-0.5">
              {([
                ["matchInfo", t("tools.regex.matchInfo")],
                ["extract", t("tools.regex.extractExpr")],
                ["replaceResult", t("tools.regex.replaceResult")],
              ] as Array<[PanelTab, string]>).map(([value, label]) => {
                const selected = panelTab === value
                return (
                  <Button
                    key={value}
                    size="sm"
                    variant={selected ? "flat" : "light"}
                    color={selected ? "primary" : "default"}
                    className={selected
                      ? "h-8 min-w-0 bg-primary/10 px-2.5 text-xs text-primary dark:bg-primary/15"
                      : "h-8 min-w-0 px-2.5 text-xs text-default-600"}
                    aria-pressed={selected}
                    onPress={() => setPanelTab(value)}
                  >
                    <span className="truncate">{label}</span>
                  </Button>
                )
              })}
            </ButtonGroup>

            <div
              className={`flex min-w-0 shrink items-center gap-1.5 text-[11px] ${regexError ? "text-danger" : "text-default-400"}`}
              title={regexError ? `${t("tools.regex.invalidRegex")}: ${regexError}` : undefined}
            >
              {regexError ? <AlertCircle className="h-3.5 w-3.5 shrink-0" /> : <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />}
              <span className="max-w-40 truncate">
                {regexError ? `${t("tools.regex.invalidRegex")}: ${regexError}` : `${t("tools.regex.matches")}: ${matches.length} · ${elapsedMs.toFixed(2)} ms`}
              </span>
            </div>
          </div>

          {panelTab === "matchInfo" && (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex min-h-11 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-default-200 bg-default-50/35 px-3 py-1.5">
                <span className="text-xs text-default-500">{t("tools.regex.matches")}: <strong className="text-foreground">{matches.length}</strong></span>
                <div className="flex flex-wrap items-center justify-end gap-1">
                  <Button size="sm" variant="light" className="h-8 px-2.5" isDisabled={!matchResultsText} onPress={() => handleCopy(matchResultsText)}>
                    {t("tools.regex.copyResultsOnly")}
                  </Button>
                  <Button size="sm" variant="light" className="h-8 px-2.5" isDisabled={!matches.length} onPress={() => handleCopy(matchInfoJson)}>
                    {t("tools.regex.copyMatches")}
                  </Button>
                  <Dropdown>
                    <DropdownTrigger>
                      <Button size="sm" variant="light" className="h-8 px-2.5" isDisabled={!matches.length} startContent={<FileDown className="h-4 w-4" />}>
                        {t("tools.regex.export")}
                      </Button>
                    </DropdownTrigger>
                    <DropdownMenu aria-label={t("tools.regex.exportMenu")}>
                      <DropdownItem key="txt" onPress={() => writeTextFile("regex-results.txt", "txt", matchResultsText)}>{t("tools.regex.exportResultsOnly")}</DropdownItem>
                      <DropdownItem key="json" onPress={() => handleExportMatches("json")}>{t("tools.regex.exportMatchesJson")}</DropdownItem>
                      <DropdownItem key="csv" onPress={() => handleExportMatches("csv")}>{t("tools.regex.exportMatchesCsv")}</DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-auto p-2">
                {matches.length === 0 ? (
                  <div className="flex h-full min-h-28 items-center justify-center px-6 text-center text-sm text-default-400">
                    {regexError ? `${t("tools.regex.invalidRegex")}: ${regexError}` : t("tools.regex.noMatches")}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {matches.map((match) => {
                      const isActive = selectedMatchIndex === match.matchIndex
                      return (
                        <Button
                          key={`${match.matchIndex}-${match.start}-${match.end}`}
                          variant="light"
                          className={`h-auto w-full justify-start rounded-lg border px-3 py-2 text-left ${isActive ? "border-primary/40 bg-primary/10" : "border-transparent hover:border-default-200 hover:bg-default-50"}`}
                          onPress={() => jumpToMatch(match.matchIndex)}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <span className={`text-xs font-semibold ${isActive ? "text-primary" : "text-foreground"}`}>#{match.matchIndex}</span>
                              <span className="font-mono text-[10px] text-default-400">{match.start}–{match.end}</span>
                            </div>
                            <div className="mt-1 break-words font-mono text-[11px] text-default-700">
                              {match.text.length > 160 ? `${match.text.slice(0, 160)}…` : match.text}
                            </div>
                            {(match.groups.length > 0 || (match.namedGroups && Object.keys(match.namedGroups).length > 0)) && (
                              <div className="mt-1.5 space-y-0.5 border-t border-default-200/70 pt-1.5 text-[10px] text-default-500">
                                {match.groups.length > 0 && <div>{t("tools.regex.groupsLabel")}: <span className="font-mono">{JSON.stringify(match.groups)}</span></div>}
                                {match.namedGroups && Object.keys(match.namedGroups).length > 0 && <div>{t("tools.regex.namedLabel")}: <span className="font-mono">{JSON.stringify(match.namedGroups)}</span></div>}
                              </div>
                            )}
                          </div>
                        </Button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {panelTab === "extract" && (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="shrink-0 border-b border-default-200 bg-default-50/35 p-3">
                <Input
                  size="sm"
                  label={t("tools.regex.extractExpr")}
                  placeholder={t("tools.regex.extractExprPlaceholder")}
                  value={extractExpr}
                  onValueChange={setExtractExpr}
                  description={t("tools.regex.extractExprHelp")}
                  classNames={{ input: "font-mono text-xs", description: "text-[10px]" }}
                />
              </div>
              <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-default-200 px-3">
                <span className="text-xs text-default-500">{t("tools.regex.extractLines")}: <strong className="text-foreground">{matches.length}</strong></span>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="light" className="h-8 px-2.5" onPress={() => handleCopy(extractedResultsText)} isDisabled={!extractedResultsText}>{t("tools.regex.copyExtracted")}</Button>
                  <Button size="sm" variant="light" className="h-8 px-2.5" startContent={<FileDown className="h-4 w-4" />} onPress={() => writeTextFile("regex-extract.txt", "txt", extractedResultsText)} isDisabled={!extractedResultsText}>{t("tools.regex.exportExtracted")}</Button>
                </div>
              </div>
              <div className="min-h-0 flex-1 bg-default-50/35 p-3">
                <Textarea
                  value={extractedResultsText}
                  isReadOnly
                  disableAutosize
                  minRows={4}
                  placeholder={t("tools.regex.extractEmpty")}
                  className="h-full"
                  classNames={{ base: "flex h-full flex-col", inputWrapper: "min-h-0 flex-1 bg-background", input: "h-full font-mono text-xs" }}
                />
              </div>
            </div>
          )}

          {panelTab === "replaceResult" && (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="shrink-0 border-b border-default-200 bg-default-50/35 p-3">
                <Textarea
                  label={t("tools.regex.replaceWith")}
                  placeholder={t("tools.regex.replacePlaceholder")}
                  value={replacement}
                  onValueChange={setReplacement}
                  minRows={2}
                  classNames={{ inputWrapper: "bg-background", input: "font-mono text-xs" }}
                />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-default-500">{t("tools.regex.replacements")}: <strong className="text-foreground">{replaceCount}</strong></span>
                  <div className="flex flex-wrap items-center justify-end gap-1">
                    <Button size="sm" variant="bordered" className="h-8" isDisabled={!pattern} onPress={handleReplace}>{t("tools.regex.replace")}</Button>
                    <Button size="sm" color="primary" className="h-8" isDisabled={!pattern} onPress={handleReplaceAll}>{t("tools.regex.replaceAll")}</Button>
                    <Button size="sm" variant="light" className="h-8 px-2.5" isDisabled={!output} onPress={() => handleCopy(output)}>{t("tools.regex.copyOutput")}</Button>
                    <Button size="sm" variant="light" className="h-8 px-2.5" isDisabled={!output} startContent={<FileDown className="h-4 w-4" />} onPress={() => writeTextFile("regex-output.txt", "txt", output)}>{t("tools.regex.exportOutput")}</Button>
                  </div>
                </div>
              </div>
              <div className="min-h-0 flex-1">
                <CodeEditor language="plaintext" value={output} onChange={setOutput} fontSize={13} contentPadding={16} ariaLabel={t("tools.regex.replaceResult")} />
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
