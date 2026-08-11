import { forwardRef, useEffect, useImperativeHandle, useRef } from "react"
import { Compartment, EditorState, StateEffect, StateField, Transaction, type Extension } from "@codemirror/state"
import {
  Decoration,
  EditorView,
  crosshairCursor,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
  type DecorationSet,
} from "@codemirror/view"
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands"
import { bracketMatching, HighlightStyle, syntaxHighlighting } from "@codemirror/language"
import { searchKeymap } from "@codemirror/search"
import { json, jsonParseLinter } from "@codemirror/lang-json"
import { xml } from "@codemirror/lang-xml"
import { yaml } from "@codemirror/lang-yaml"
import { css } from "@codemirror/lang-css"
import { sql } from "@codemirror/lang-sql"
import { linter } from "@codemirror/lint"
import { tags } from "@lezer/highlight"
import type { CodeEditorHandle, CodeEditorHighlight, CodeEditorLanguage, CodeEditorProps } from "./CodeEditor"

const externalUpdate = StateEffect.define<boolean>()
const replaceHighlights = StateEffect.define<CodeEditorHighlight[]>()

const matchDecoration = Decoration.mark({ class: "cm-regex-match" })
const activeMatchDecoration = Decoration.mark({ class: "cm-regex-match-active" })

const highlightField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(highlights, transaction) {
    highlights = highlights.map(transaction.changes)
    for (const effect of transaction.effects) {
      if (!effect.is(replaceHighlights)) continue
      const documentLength = transaction.state.doc.length
      const ranges = effect.value
        .map((highlight) => ({
          from: Math.max(0, Math.min(highlight.from, documentLength)),
          to: Math.max(0, Math.min(highlight.to, documentLength)),
          active: highlight.active,
        }))
        .filter((highlight) => highlight.to > highlight.from)
        .sort((a, b) => a.from - b.from || a.to - b.to)
        .map((highlight) =>
          (highlight.active ? activeMatchDecoration : matchDecoration).range(highlight.from, highlight.to)
        )
      highlights = Decoration.set(ranges, true)
    }
    return highlights
  },
  provide: (field) => EditorView.decorations.from(field),
})

function createEditorTheme(fontSize: number, contentPadding: number) {
  return EditorView.theme({
  "&": {
    height: "100%",
    minHeight: "0",
    color: "rgb(var(--foreground))",
    backgroundColor: "rgb(var(--content-1))",
    fontSize: `${fontSize}px`,
  },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": {
    minHeight: "0",
    overflow: "auto",
    fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
    lineHeight: "1.55",
  },
  ".cm-content": {
    minHeight: "100%",
    padding: `${contentPadding}px 0`,
    caretColor: "rgb(var(--primary))",
  },
  ".cm-line": { padding: `0 ${contentPadding}px` },
  ".cm-gutters": {
    color: "rgb(var(--default-400))",
    backgroundColor: "rgb(var(--default-50))",
    borderRight: "1px solid rgb(var(--divider))",
  },
  ".cm-lineNumbers .cm-gutterElement": { padding: "0 8px 0 10px" },
  ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "rgb(var(--default-100) / 0.72)" },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection": {
    backgroundColor: "rgb(var(--primary) / 0.22) !important",
  },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "rgb(var(--primary))" },
  ".cm-regex-match": {
    backgroundColor: "rgb(var(--primary) / 0.16)",
    borderBottom: "1px solid rgb(var(--primary) / 0.58)",
  },
  ".cm-regex-match-active": {
    backgroundColor: "rgb(var(--warning) / 0.24)",
    borderBottom: "1px solid rgb(var(--warning) / 0.8)",
  },
  })
}

const codeHighlightStyle = HighlightStyle.define([
  { tag: [tags.keyword, tags.operatorKeyword], color: "rgb(var(--secondary))" },
  { tag: [tags.string, tags.special(tags.string)], color: "rgb(var(--success))" },
  { tag: [tags.number, tags.bool, tags.null], color: "rgb(var(--primary))" },
  { tag: [tags.propertyName, tags.attributeName], color: "rgb(var(--foreground))" },
  { tag: [tags.tagName, tags.typeName], color: "rgb(var(--danger))" },
  { tag: [tags.comment, tags.meta], color: "rgb(var(--default-500))", fontStyle: "italic" },
  { tag: tags.invalid, color: "rgb(var(--danger))", textDecoration: "underline" },
])

function languageExtension(language: CodeEditorLanguage): Extension {
  if (language === "json") return json()
  if (language === "xml") return xml()
  if (language === "yaml") return yaml()
  if (language === "css") return css()
  if (language === "sql") return sql()
  return []
}

const CodeMirrorEditorImpl = forwardRef<CodeEditorHandle, CodeEditorProps>(function CodeMirrorEditorImpl(
  {
    value,
    onChange,
    language = "plaintext",
    readOnly = false,
    highlights = [],
    lineNumbers: showLineNumbers = true,
    fontSize = 13,
    contentPadding = 12,
    jsonDiagnostics = false,
    ariaLabel = "Editor content",
    className = "",
  },
  ref
) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  const languageCompartmentRef = useRef(new Compartment())
  const readOnlyCompartmentRef = useRef(new Compartment())

  onChangeRef.current = onChange

  useEffect(() => {
    if (!hostRef.current) return

    const languageCompartment = languageCompartmentRef.current
    const readOnlyCompartment = readOnlyCompartmentRef.current
    const state = EditorState.create({
      doc: value,
      extensions: [
        ...(showLineNumbers ? [lineNumbers(), highlightActiveLineGutter()] : []),
        highlightSpecialChars(),
        history(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        bracketMatching(),
        EditorView.lineWrapping,
        keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab]),
        syntaxHighlighting(codeHighlightStyle),
        createEditorTheme(fontSize, contentPadding),
        highlightField,
        ...(jsonDiagnostics ? [linter(jsonParseLinter())] : []),
        EditorView.contentAttributes.of({ "aria-label": ariaLabel }),
        languageCompartment.of(languageExtension(language)),
        readOnlyCompartment.of([EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly)]),
        EditorView.updateListener.of((update) => {
          if (!update.docChanged || update.transactions.some((transaction) => transaction.effects.some((effect) => effect.is(externalUpdate)))) {
            return
          }
          onChangeRef.current?.(update.state.doc.toString())
        }),
      ],
    })

    const view = new EditorView({ state, parent: hostRef.current })
    const resizeObserver = new ResizeObserver(() => view.requestMeasure())
    resizeObserver.observe(hostRef.current)
    viewRef.current = view
    if (highlights.length > 0) view.dispatch({ effects: replaceHighlights.of(highlights) })

    return () => {
      resizeObserver.disconnect()
      view.destroy()
      viewRef.current = null
    }
  }, [])

  useEffect(() => {
    const view = viewRef.current
    if (!view || view.state.doc.toString() === value) return
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value },
      effects: externalUpdate.of(true),
      annotations: Transaction.addToHistory.of(false),
    })
  }, [value])

  useEffect(() => {
    viewRef.current?.dispatch({ effects: languageCompartmentRef.current.reconfigure(languageExtension(language)) })
  }, [language])

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: readOnlyCompartmentRef.current.reconfigure([
        EditorState.readOnly.of(readOnly),
        EditorView.editable.of(!readOnly),
      ]),
    })
  }, [readOnly])

  useEffect(() => {
    viewRef.current?.dispatch({ effects: replaceHighlights.of(highlights) })
  }, [highlights])

  useImperativeHandle(ref, () => ({
    focus() {
      viewRef.current?.focus()
    },
    revealRange(from, to) {
      const view = viewRef.current
      if (!view) return
      const documentLength = view.state.doc.length
      const safeFrom = Math.max(0, Math.min(from, documentLength))
      const safeTo = Math.max(safeFrom, Math.min(to, documentLength))
      view.dispatch({
        selection: { anchor: safeFrom, head: safeTo },
        effects: EditorView.scrollIntoView(safeFrom, { y: "center" }),
      })
      view.focus()
    },
  }), [])

  return <div ref={hostRef} className={`h-full min-h-0 overflow-hidden ${className}`} />
})

export default CodeMirrorEditorImpl
