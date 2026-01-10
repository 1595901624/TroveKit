import { useState, useEffect } from "react"
import { Textarea, Button, RadioGroup, Radio, Input, Select, SelectItem } from "@heroui/react"
import { Copy, Trash2, Hash } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLog } from "../../contexts/LogContext"
import CryptoJS from "crypto-js"

const STORAGE_KEY = "hmac-md5-tool-state"

interface HmacMd5State {
  input: string
  output: string
  key: string
  keyType: string
  outputCase: string
}

const loadStateFromStorage = (): Partial<HmacMd5State> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

const saveStateToStorage = (state: HmacMd5State) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function HmacMd5Tab() {
  const { t } = useTranslation()
  const { addLog } = useLog()

  const savedState = loadStateFromStorage()

  const [input, setInput] = useState(savedState.input || "")
  const [output, setOutput] = useState(savedState.output || "")
  const [key, setKey] = useState(savedState.key || "")
  const [keyType, setKeyType] = useState(savedState.keyType || "text")
  const [outputCase, setOutputCase] = useState(savedState.outputCase || "lower")

  useEffect(() => {
    saveStateToStorage({ input, output, key, keyType, outputCase })
  }, [input, output, key, keyType, outputCase])

  // 实时更新大小写
  useEffect(() => {
    if (output) {
      const updatedOutput = outputCase === "upper" ? output.toUpperCase() : output.toLowerCase()
      if (updatedOutput !== output) {
        setOutput(updatedOutput)
      }
    }
  }, [outputCase, output])

  const parseKey = (value: string, type: string) => {
    if (type === "hex") {
      return CryptoJS.enc.Hex.parse(value)
    }
    return CryptoJS.enc.Utf8.parse(value)
  }

  const handleHmacMd5 = () => {
    if (!input) return
    try {
      const keyParsed = parseKey(key, keyType)
      let hash = CryptoJS.HmacMD5(input, keyParsed).toString()

      if (outputCase === "upper") {
        hash = hash.toUpperCase()
      }

      setOutput(hash)
      addLog({
        method: `HMAC-MD5 (${outputCase})`,
        input,
        output: hash,
        algorithm: "HMAC-MD5",
        key_type: keyType,
      }, "success")
    } catch (e) {
      addLog({
        method: "HMAC-MD5",
        input,
        output: (e as Error).message,
        algorithm: "HMAC-MD5",
        key_type: keyType,
      }, "error")
    }
  }

  const copyToClipboard = (text: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
  }

  const handleClear = () => {
    setInput("")
    setOutput("")
    setKey("")
    localStorage.removeItem(STORAGE_KEY)
  }

  return (
    <div className="space-y-4">
      <Textarea
        label={t("tools.hash.inputLabel", "Input Text")}
        placeholder={t("tools.hash.inputPlaceholder", "Enter text to hash...")}
        minRows={4}
        variant="bordered"
        value={input}
        onValueChange={setInput}
        classNames={{
          inputWrapper: "bg-default-100/50 hover:bg-default-100 focus-within:bg-background"
        }}
      />

      <div className="flex flex-wrap items-end gap-4 p-2 bg-default-50 rounded-lg">
        <div className="flex gap-2 flex-1 min-w-[200px]">
          <Input
            size="sm"
            label={t("tools.hash.key")}
            placeholder={t("tools.hash.keyPlaceholder", "Key")}
            value={key}
            onValueChange={setKey}
            className="flex-1"
          />
          <Select
            size="sm"
            label={t("tools.hash.keyType", "Key Type")}
            className="w-24"
            selectedKeys={new Set([keyType])}
            onSelectionChange={(keys) => setKeyType(Array.from(keys)[0] as string)}
            disallowEmptySelection
          >
            <SelectItem key="text">{t("tools.hash.text")}</SelectItem>
            <SelectItem key="hex">{t("tools.hash.hex")}</SelectItem>
          </Select>
        </div>

        <RadioGroup
          orientation="horizontal"
          value={outputCase}
          onValueChange={setOutputCase}
          label={t("tools.hash.case")}
          size="sm"
          className="text-tiny"
        >
          <Radio value="lower">{t("tools.hash.lowercase")}</Radio>
          <Radio value="upper">{t("tools.hash.uppercase")}</Radio>
        </RadioGroup>
      </div>

      <div className="flex items-center gap-2 justify-end">
        <Button color="primary" variant="flat" onPress={handleHmacMd5} startContent={<Hash className="w-4 h-4" />}>
          {t("tools.hash.generate")}
        </Button>
        <Button isIconOnly variant="light" color="danger" onPress={handleClear} title={t("tools.hash.clearAll")}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="relative group">
        <Textarea
          label={t("tools.hash.hmacMd5OutputLabel", "HMAC-MD5 Output")}
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
