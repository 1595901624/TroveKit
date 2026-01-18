import { Textarea, Button, RadioGroup, Radio } from "@heroui/react"
import { Copy, Trash2, Hash } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLog } from "../../contexts/LogContext"
import CryptoJS from "crypto-js"
import { usePersistentState } from "../../hooks/usePersistentState"

// 定义 MD5 状态接口
interface Md5State {
  input: string
  output: string
  bit: string
  case: string
}

// 定义 STORAGE_KEY 常量
const MD5_STORAGE_KEY = "md5_state"

export function Md5Tab() {
  const { t } = useTranslation()
  const { addLog } = useLog()

  // 初始化状态，从 localStorage 恢复或使用默认值
  const [state, setState, clearState] = usePersistentState<Md5State>(MD5_STORAGE_KEY, {
    input: "",
    output: "",
    bit: "32",
    case: "lower"
  })

  // 解构状态以便于使用
  const { input, output, bit, case: md5Case } = state

  const handleMd5Hash = () => {
    if (!input) return
    try {
      let hash = CryptoJS.MD5(input).toString()
      
      if (bit === "16") {
        // 16-bit MD5 is usually the middle 16 characters (8 to 24) of the 32-character hex string
        hash = hash.substring(8, 24)
      }

      if (md5Case === "upper") {
        hash = hash.toUpperCase()
      }

      // 更新状态包含输出结果
      setState(prev => ({
        ...prev,
        output: hash
      }))

      addLog({ 
        method: `MD5 (${bit}-bit, ${md5Case})`, 
        input, 
        output: hash 
      }, "success")

    } catch (e) {
      addLog({ method: "MD5", input, output: (e as Error).message }, "error")
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
              value={bit}
              onValueChange={(value) => setState(prev => ({ ...prev, bit: value }))}
              label={t("tools.hash.length")}
              size="sm"
              className="text-tiny"
            >
              <Radio value="32">{t("tools.hash.bit32")}</Radio>
              <Radio value="16">{t("tools.hash.bit16")}</Radio>
            </RadioGroup>

            <RadioGroup
              orientation="horizontal"
              value={md5Case}
              onValueChange={(value) => setState(prev => ({ ...prev, case: value }))}
              label={t("tools.hash.case")}
              size="sm"
            >
              <Radio value="lower">{t("tools.hash.lowercase")}</Radio>
              <Radio value="upper">{t("tools.hash.uppercase")}</Radio>
            </RadioGroup>
          </div>

          <div className="flex items-center gap-2">
            <Button color="primary" variant="flat" onPress={handleMd5Hash} startContent={<Hash className="w-4 h-4" />}>
              {t("tools.hash.generate")}
            </Button>
            <Button isIconOnly variant="light" color="danger" onPress={() => { 
              setState(prev => ({ 
                ...prev, 
                input: "", 
                output: "" 
              }));
              clearState();
            }} title={t("tools.hash.clearAll")}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
      </div>

      <div className="relative group">
        <Textarea
          label={t("tools.hash.outputLabel", "MD5 Output")}
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

