import { useState, useEffect } from "react"
import { Textarea, Button, RadioGroup, Radio } from "@heroui/react"
import { Copy, Trash2, Hash } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLog } from "../../contexts/LogContext"
import md2 from "js-md2"

// 定义 MD2 状态接口
interface Md2State {
  input: string
  output: string
  case: string
}

// 定义 STORAGE_KEY 常量
const MD2_STORAGE_KEY = "md2_state"

export function Md2Tab() {
  const { t } = useTranslation()
  const { addLog } = useLog()

  // 初始化状态，从 localStorage 恢复或使用默认值
  const [state, setState] = useState<Md2State>(() => {
    const saved = localStorage.getItem(MD2_STORAGE_KEY)
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        // 如果解析失败，返回默认状态
      }
    }
    
    // 默认状态
    return {
      input: "",
      output: "",
      case: "lower"
    }
  })

  // 解构状态以便于使用
  const { input, output, case: md2Case } = state

  // 当状态改变时，保存到 localStorage
  useEffect(() => {
    localStorage.setItem(MD2_STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const handleMd2Hash = () => {
    if (!input) return
    try {
      let hash = md2(input)
      
      if (md2Case === "upper") {
        hash = hash.toUpperCase()
      }

      // 更新状态包含输出结果
      setState(prev => ({
        ...prev,
        output: hash
      }))

      addLog({ 
        method: `MD2 (${md2Case})`, 
        input, 
        output: hash 
      }, "success")

    } catch (e) {
      addLog({ method: "MD2", input, output: (e as Error).message }, "error")
    }
  }

  const copyToClipboard = (text: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="space-y-4">
      <Textarea
        label={t("tools.hash.inputLabel", "Input Text")}
        placeholder={t("tools.hash.inputPlaceholder", "Enter text to hash...")}
        minRows={6}
        variant="bordered"
        value={input}
        onValueChange={(value) => setState(prev => ({ ...prev, input: value }))}
        classNames={{
          inputWrapper: "bg-default-100/50 hover:bg-default-100 focus-within:bg-background"
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-4 py-2 px-1">
          <div className="flex items-center gap-6">
            <RadioGroup
              orientation="horizontal"
              value={md2Case}
              onValueChange={(value) => setState(prev => ({ ...prev, case: value }))}
              label={t("tools.hash.case")}
              size="sm"
            >
              <Radio value="lower">{t("tools.hash.lowercase")}</Radio>
              <Radio value="upper">{t("tools.hash.uppercase")}</Radio>
            </RadioGroup>
          </div>

          <div className="flex items-center gap-2">
            <Button color="primary" variant="flat" onPress={handleMd2Hash} startContent={<Hash className="w-4 h-4" />}>
              {t("tools.hash.generate")}
            </Button>
            <Button isIconOnly variant="light" color="danger" onPress={() => { 
              setState(prev => ({ 
                ...prev, 
                input: "", 
                output: "" 
              }))
            }} title={t("tools.hash.clearAll")}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
      </div>

      <div className="relative group">
        <Textarea
          label={t("tools.hash.outputLabel", "MD2 Output")}
          readOnly
          minRows={4}
          variant="bordered"
          value={output}
          classNames={{
            inputWrapper: "bg-default-100/30 group-hover:bg-default-100/50 transition-colors font-mono text-tiny"
          }}
        />
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button isIconOnly size="sm" variant="flat" onPress={() => copyToClipboard(output)}>
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}