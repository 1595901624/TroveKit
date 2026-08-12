import { Suspense, forwardRef, lazy } from "react"
import { EditorLoadingSkeleton } from "./LoadingSkeleton"

export type CodeEditorLanguage = "plaintext" | "json" | "xml" | "yaml" | "css" | "sql"

export interface CodeEditorHighlight {
  from: number
  to: number
  active?: boolean
}

export interface CodeEditorHandle {
  focus: () => void
  getValue: () => string
  revealRange: (from: number, to: number) => void
}

export interface CodeEditorStats {
  characters: number
  lines: number
  largeDocument: boolean
}

export const LARGE_DOCUMENT_THRESHOLD = 1024 * 1024

export interface CodeEditorProps {
  value: string
  onChange?: (value: string) => void
  language?: CodeEditorLanguage
  readOnly?: boolean
  highlights?: CodeEditorHighlight[]
  lineNumbers?: boolean
  fontSize?: number
  contentPadding?: number
  jsonDiagnostics?: boolean
  largeDocumentChangeDelay?: number
  onDispose?: (value: string) => void
  onStatsChange?: (stats: CodeEditorStats) => void
  ariaLabel?: string
  className?: string
}

const LazyCodeMirrorEditor = lazy(() => import("./CodeMirrorEditorImpl"))

const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(function CodeEditor(props, ref) {
  return (
    <Suspense fallback={<EditorLoadingSkeleton className={props.className} />}>
      <LazyCodeMirrorEditor {...props} ref={ref} />
    </Suspense>
  )
})

export default CodeEditor
