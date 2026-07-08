import { useEffect, useState } from "react"
import Editor from "@monaco-editor/react"
import { loader } from "@monaco-editor/react"
import type { ComponentProps } from "react"

type MonacoEditorProps = ComponentProps<typeof Editor>

let monacoConfigPromise: Promise<void> | null = null

function configureMonaco() {
  if (!monacoConfigPromise) {
    monacoConfigPromise = Promise.all([
      import("monaco-editor"),
      import("monaco-editor/esm/vs/editor/editor.worker?worker"),
      import("monaco-editor/esm/vs/language/json/json.worker?worker"),
      import("monaco-editor/esm/vs/language/css/css.worker?worker"),
      import("monaco-editor/esm/vs/language/html/html.worker?worker"),
      import("monaco-editor/esm/vs/language/typescript/ts.worker?worker"),
    ]).then(([monaco, editorWorker, jsonWorker, cssWorker, htmlWorker, tsWorker]) => {
      // 延迟到首次使用编辑器时再配置 Monaco，避免应用启动时就加载编辑器主包和 worker。
      self.MonacoEnvironment = {
        getWorker(_, label) {
          if (label === "json") {
            return new jsonWorker.default()
          }
          if (label === "css" || label === "scss" || label === "less") {
            return new cssWorker.default()
          }
          if (label === "html" || label === "handlebars" || label === "razor") {
            return new htmlWorker.default()
          }
          if (label === "typescript" || label === "javascript") {
            return new tsWorker.default()
          }
          return new editorWorker.default()
        },
      }

      loader.config({ monaco })
    })
  }

  return monacoConfigPromise
}

export default function MonacoEditor(props: MonacoEditorProps) {
  const [isConfigured, setIsConfigured] = useState(false)

  useEffect(() => {
    let mounted = true
    configureMonaco().then(() => {
      if (mounted) setIsConfigured(true)
    })
    return () => {
      mounted = false
    }
  }, [])

  // 编辑器依赖加载前先占住原有高度，避免 Tab 切换时布局跳动。
  if (!isConfigured) {
    return <div style={{ height: props.height ?? "100%" }} />
  }

  return <Editor {...props} />
}
