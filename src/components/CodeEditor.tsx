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
  revealRange: (from: number, to: number) => void
}

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
