import { useEffect, useMemo, useRef, useState } from "react"
import {
  Button,
  ButtonGroup,
  Card,
  CardBody,
  Checkbox,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Input,
  Tooltip,
  Tabs,
  Tab,
  Textarea,
  addToast,
} from "@heroui/react"
import Editor, { OnMount } from "@monaco-editor/react"
import { AlertCircle, BookOpen, Copy, FileDown, Search, Trash2, ArrowRightLeft } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useTheme } from "../../components/theme-provider"
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

type PanelTab = "matchInfo" | "replaceResult"

interface RegexToolState {
  pattern: string
  flags: string
  input: string
  replacement: string
  panelTab: PanelTab
}

const STORAGE_KEY = "regex-tool-state"
const FLAG_ORDER = ["g", "i", "m", "s", "u", "y"] as const

export function RegexTool() {
  const { t } = useTranslation()
  const { theme } = useTheme()

  const [pattern, setPattern] = useState("")
  const [flags, setFlags] = useState("g")
  const [input, setInput] = useState("")
  const [replacement, setReplacement] = useState("")
  const [panelTab, setPanelTab] = useState<PanelTab>("matchInfo")

  const [regexError, setRegexError] = useState<string | null>(null)
  const [matches, setMatches] = useState<RegexMatch[]>([])
  const [elapsedMs, setElapsedMs] = useState<number>(0)
  const [selectedMatchIndex, setSelectedMatchIndex] = useState<number | null>(null)

  const [output, setOutput] = useState("")
  const [replaceCount, setReplaceCount] = useState(0)

  const editorRef = useRef<any>(null)
  const monacoRef = useRef<any>(null)
  const decorationIdsRef = useRef<string[]>([])

  useEffect(() => {
    let alive = true
    ;(async () => {
      const raw = await getStoredItem(STORAGE_KEY)
      if (!alive || !raw) return
      try {
        const parsed = JSON.parse(raw) as Partial<RegexToolState>
        if (typeof parsed.pattern === "string") setPattern(parsed.pattern)
        if (typeof parsed.flags === "string") setFlags(normalizeFlags(parsed.flags))
        if (typeof parsed.input === "string") setInput(parsed.input)
        if (typeof parsed.replacement === "string") setReplacement(parsed.replacement)
        if (parsed.panelTab === "matchInfo" || parsed.panelTab === "replaceResult") setPanelTab(parsed.panelTab)
      } catch (e) {
        console.warn("Failed to restore regex tool state", e)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    const state: RegexToolState = {
      pattern,
      flags,
      input,
      replacement,
      panelTab,
    }
    const id = window.setTimeout(() => {
      setStoredItem(STORAGE_KEY, JSON.stringify(state)).catch((e) => console.error(e))
    }, 300)
    return () => clearTimeout(id)
  }, [pattern, flags, input, replacement, panelTab])

  const flagsLabel = useMemo(() => normalizeFlags(flags), [flags])
  const flagTooltips = useMemo<Record<string, string>>(
    () => ({
      g: t("tools.regex.flagHelp.g", "全局匹配：查找所有匹配项"),
      i: t("tools.regex.flagHelp.i", "忽略大小写"),
      m: t("tools.regex.flagHelp.m", "^/$ 匹配每一行（多行模式）"),
      s: t("tools.regex.flagHelp.s", ". 也匹配换行（dotAll）"),
      u: t("tools.regex.flagHelp.u", "Unicode 模式"),
      y: t("tools.regex.flagHelp.y", "粘连匹配：从 lastIndex 处开始（sticky）"),
    }),
    [t]
  )

  useEffect(() => {
    const id = window.setTimeout(() => {
      const built = buildRegExp(pattern, flagsLabel)
      if ("error" in built) {
        setRegexError(built.error)
        setMatches([])
        setElapsedMs(0)
        setSelectedMatchIndex(null)
        clearDecorations()
        return
      }

      const start = performance.now()
      const m = collectMatches(input, built.regex)
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
  }, [pattern, flagsLabel, input])

  useEffect(() => {
    applyDecorations(matches, selectedMatchIndex)
  }, [matches, selectedMatchIndex, theme])

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco
  }

  const setFlagEnabled = (flag: string, enabled: boolean) => {
    setFlags((prev) => {
      const cur = normalizeFlags(prev)
      if (enabled) return normalizeFlags(cur + flag)
      return normalizeFlags(cur.replaceAll(flag, ""))
    })
  }

  const handlePatternBlur = () => {
    const parsed = parseRegexLiteral(pattern)
    if (!parsed) return
    setPattern(parsed.pattern)
    setFlags(parsed.flags)
  }

  const clearDecorations = () => {
    const editor = editorRef.current
    if (!editor) return
    decorationIdsRef.current = editor.deltaDecorations(decorationIdsRef.current, [])
  }

  const applyDecorations = (list: RegexMatch[], selected: number | null) => {
    const editor = editorRef.current
    const monaco = monacoRef.current
    const model = editor?.getModel?.()
    if (!editor || !monaco || !model) return

    const decorations = list.map((m, idx) => {
      const startPos = model.getPositionAt(m.start)
      const endPos = model.getPositionAt(m.end)
      const range = new monaco.Range(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column)
      return {
        range,
        options: {
          inlineClassName: idx === selected ? "regex-match-decoration-active" : "regex-match-decoration",
        },
      }
    })

    decorationIdsRef.current = editor.deltaDecorations(decorationIdsRef.current, decorations)
  }

  const jumpToMatch = (idx: number) => {
    setSelectedMatchIndex(idx)
    const editor = editorRef.current
    const monaco = monacoRef.current
    const model = editor?.getModel?.()
    const m = matches[idx]
    if (!editor || !monaco || !model || !m) return

    const startPos = model.getPositionAt(m.start)
    const endPos = model.getPositionAt(m.end)
    const range = new monaco.Range(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column)
    editor.revealRangeInCenter(range)
    editor.setSelection(range)
    editor.focus()
  }

  const handleCopy = async (text: string) => {
    if (!text) return
    await navigator.clipboard.writeText(text)
    addToast({ title: t("tools.regex.copiedToClipboard"), severity: "success" })
  }

  const writeTextFile = async (defaultPath: string, ext: string, text: string) => {
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

  const handleExportMatches = async (format: "json" | "csv") => {
    if (format === "json") {
      await writeTextFile("regex-matches.json", "json", matchInfoJson)
      return
    }
    await writeTextFile("regex-matches.csv", "csv", formatMatchesAsCsv(matches))
  }

  const handleClearAll = async () => {
    setPattern("")
    setFlags("g")
    setInput("")
    setReplacement("")
    setOutput("")
    setReplaceCount(0)
    setSelectedMatchIndex(null)
    setRegexError(null)
    setMatches([])
    setElapsedMs(0)
    clearDecorations()
    await removeStoredItem(STORAGE_KEY)
  }

  const handleLoadExample = () => {
    setPattern("(\\\\w+)@(\\\\w+\\\\.\\\\w+)")
    setFlags("g")
    setInput("Contact: alice@example.com\\nBackup: bob@test.org\\n")
    setReplacement("$1 at $2")
    setPanelTab("matchInfo")
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
  }

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
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-start">
          <div className="flex-1 min-w-0">
            <Input
              label={t("tools.regex.pattern")}
              placeholder={t("tools.regex.patternPlaceholder")}
              value={pattern}
              onValueChange={setPattern}
              onBlur={handlePatternBlur}
              classNames={{ input: "font-mono text-xs" }}
            />

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="text-xs font-semibold text-default-500">{t("tools.regex.flags")}</span>
              {FLAG_ORDER.map((f) => (
                <Tooltip key={f} content={flagTooltips[f]} placement="top" delay={400}>
                  <span className="inline-flex">
                    <Checkbox
                      size="sm"
                      isSelected={flagsLabel.includes(f)}
                      onValueChange={(v) => setFlagEnabled(f, v)}
                      classNames={{ label: "ml-1" }}
                    >
                      <span className="font-mono text-xs">{f}</span>
                    </Checkbox>
                  </span>
                </Tooltip>
              ))}
            </div>
          </div>

          <div className="flex gap-2 md:ml-auto">
            <ButtonGroup variant="flat">
              <Button color="primary" startContent={<Search className="w-4 h-4" />} onPress={() => setPanelTab("matchInfo")}>
                {t("tools.regex.match")}
              </Button>
              <Button color="secondary" startContent={<ArrowRightLeft className="w-4 h-4" />} onPress={handleReplace}>
                {t("tools.regex.replace")}
              </Button>
              <Button color="secondary" variant="flat" onPress={handleReplaceAll}>
                {t("tools.regex.replaceAll")}
              </Button>
              <Button color="warning" startContent={<BookOpen className="w-4 h-4" />} onPress={handleLoadExample}>
                {t("tools.regex.example")}
              </Button>
            </ButtonGroup>

            <Button isIconOnly variant="light" onPress={() => handleCopy(matchInfoJson)} title={t("tools.regex.copyMatches")}>
              <Copy className="w-4 h-4" />
            </Button>
            <Button isIconOnly variant="light" color="danger" onPress={handleClearAll} title={t("tools.regex.clear")}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4">
        <div className="flex-1 flex flex-col gap-2 min-w-0 min-h-[260px]">
          <div className="flex justify-between items-center px-1">
            <span className="text-sm font-medium text-default-600">{t("tools.regex.testString")}</span>
            <Button isIconOnly size="sm" variant="light" onPress={() => handleCopy(input)} title={t("tools.regex.copy")}>
              <Copy className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="flex-1 border border-default-200 rounded-xl overflow-hidden shadow-sm bg-content1">
            <Editor
              height="100%"
              defaultLanguage="plaintext"
              value={input}
              onChange={(value) => setInput(value || "")}
              onMount={handleEditorDidMount}
              theme={theme === "dark" ? "vs-dark" : "light"}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                wordWrap: "on",
                scrollBeyondLastLine: false,
                padding: { top: 12, bottom: 12 },
              }}
            />
          </div>
        </div>

        <div className="lg:w-[420px] flex flex-col gap-3 min-h-[260px]">
          <Tabs
            aria-label="regex-panels"
            color="primary"
            selectedKey={panelTab}
            onSelectionChange={(k) => setPanelTab(k as PanelTab)}
            classNames={{ tabList: "text-sm w-full", tab: "text-xs" }}
          >
            <Tab key="matchInfo" title={t("tools.regex.matchInfo")} />
            <Tab key="replaceResult" title={t("tools.regex.replaceResult")} />
          </Tabs>

          {panelTab === "matchInfo" && (
            <div className="flex-1 min-h-0 flex flex-col gap-3">
              {regexError && (
                <Card className="border-danger bg-danger-50 dark:bg-danger-900/20" shadow="sm">
                  <CardBody className="flex flex-row items-center gap-3 py-2">
                    <AlertCircle className="w-5 h-5 text-danger" />
                    <p className="text-danger font-medium text-xs">
                      {t("tools.regex.invalidRegex")}: {regexError}
                    </p>
                  </CardBody>
                </Card>
              )}

              <Card shadow="sm" className="border border-default-200">
                <CardBody className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-default-600">
                      {t("tools.regex.matches")}: {matches.length}
                    </span>
                    <span className="text-[10px] text-default-400">{elapsedMs.toFixed(2)} ms</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="flat" onPress={() => handleCopy(matchInfoJson)}>
                      {t("tools.regex.copyMatches")}
                    </Button>
                    <Dropdown>
                      <DropdownTrigger>
                        <Button size="sm" variant="flat" startContent={<FileDown className="w-4 h-4" />}>
                          {t("tools.regex.export")}
                        </Button>
                      </DropdownTrigger>
                      <DropdownMenu aria-label="Export matches">
                        <DropdownItem key="json" onPress={() => handleExportMatches("json")}>
                          {t("tools.regex.exportMatchesJson")}
                        </DropdownItem>
                        <DropdownItem key="csv" onPress={() => handleExportMatches("csv")}>
                          {t("tools.regex.exportMatchesCsv")}
                        </DropdownItem>
                      </DropdownMenu>
                    </Dropdown>
                  </div>
                </CardBody>
              </Card>

              <div className="flex-1 min-h-0 border border-default-200 rounded-xl bg-content1 overflow-hidden">
                <div className="h-full overflow-auto p-2 space-y-1">
                  {matches.length === 0 ? (
                    <div className="p-6 text-center text-default-400 text-sm">{t("tools.regex.noMatches")}</div>
                  ) : (
                    matches.map((m) => (
                      <button
                        key={`${m.matchIndex}-${m.start}-${m.end}`}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                          selectedMatchIndex === m.matchIndex ? "bg-primary/10 text-primary" : "hover:bg-default-100"
                        }`}
                        onClick={() => jumpToMatch(m.matchIndex)}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-semibold">#{m.matchIndex}</span>
                          <span className="text-[10px] text-default-400">
                            {m.start}–{m.end}
                          </span>
                        </div>
                        <div className="mt-1 font-mono text-[11px] whitespace-pre-wrap break-words text-default-700">
                          {m.text.length > 120 ? `${m.text.slice(0, 120)}…` : m.text}
                        </div>
                        {(m.groups.length > 0 || (m.namedGroups && Object.keys(m.namedGroups).length > 0)) && (
                          <div className="mt-1 text-[10px] text-default-500">
                            {m.groups.length > 0 && <div>groups: {JSON.stringify(m.groups)}</div>}
                            {m.namedGroups && Object.keys(m.namedGroups).length > 0 && (
                              <div>named: {JSON.stringify(m.namedGroups)}</div>
                            )}
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {panelTab === "replaceResult" && (
            <div className="flex-1 min-h-0 flex flex-col gap-3">
              <Textarea
                label={t("tools.regex.replaceWith")}
                placeholder={t("tools.regex.replacePlaceholder")}
                value={replacement}
                onValueChange={setReplacement}
                classNames={{ input: "font-mono text-xs" }}
                minRows={2}
              />

              <div className="flex flex-wrap gap-2 items-center justify-between">
                <div className="text-xs text-default-500">
                  {t("tools.regex.replacements")}: {replaceCount}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" color="secondary" variant="flat" onPress={handleReplace}>
                    {t("tools.regex.replace")}
                  </Button>
                  <Button size="sm" color="secondary" variant="flat" onPress={handleReplaceAll}>
                    {t("tools.regex.replaceAll")}
                  </Button>
                  <Button size="sm" variant="flat" onPress={() => handleCopy(output)}>
                    {t("tools.regex.copyOutput")}
                  </Button>
                  <Button
                    size="sm"
                    variant="flat"
                    startContent={<FileDown className="w-4 h-4" />}
                    onPress={() => writeTextFile("regex-output.txt", "txt", output)}
                  >
                    {t("tools.regex.exportOutput")}
                  </Button>
                </div>
              </div>

              <div className="flex-1 min-h-0 border border-default-200 rounded-xl overflow-hidden shadow-sm bg-content1">
                <Editor
                  height="100%"
                  defaultLanguage="plaintext"
                  value={output}
                  onChange={(value) => setOutput(value || "")}
                  theme={theme === "dark" ? "vs-dark" : "light"}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    wordWrap: "on",
                    readOnly: false,
                    scrollBeyondLastLine: false,
                    padding: { top: 12, bottom: 12 },
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
