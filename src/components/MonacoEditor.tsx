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

  return (
    <Editor
      {...props}
      // 工具页切换时必须释放当前 model；显式声明，避免 Monaco 默认策略变化后残留大文本。
      keepCurrentModel={props.keepCurrentModel ?? false}
      // 当前工具没有依赖 Monaco 自带视图状态恢复，关闭后可减少卸载/切换时的 Map 缓存。
      saveViewState={props.saveViewState ?? false}
    />
  )
}
