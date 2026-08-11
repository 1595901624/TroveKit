import { useState, useEffect } from "react"
import { Button, RadioGroup, Radio, Input, Select, SelectItem } from "../../components/ui/base-ui"
import { Hash } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLog } from "../../contexts/LogContext"
import CryptoJS from "crypto-js"
import { getStoredItem, setStoredItem, removeStoredItem } from "../../lib/store"
import { HashWorkbench } from "./HashWorkbench"

const STORAGE_KEY = "hmac-md5-tool-state"

export function HmacMd5Tab() {
  const { t } = useTranslation()
  const { addLog } = useLog()

  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")
  const [key, setKey] = useState("")
  const [keyType, setKeyType] = useState("text")
  const [outputCase, setOutputCase] = useState("lower")
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    let mounted = true;
    getStoredItem(STORAGE_KEY).then((stored) => {
      if (mounted && stored) {
        try {
          const state = JSON.parse(stored);
          if (state.input) setInput(state.input);
          if (state.output) setOutput(state.output);
          if (state.key) setKey(state.key);
          if (state.keyType) setKeyType(state.keyType);
          if (state.outputCase) setOutputCase(state.outputCase);
        } catch (e) {
          console.error("Failed to parse HmacMd5Tab state", e);
        }
      }
      if (mounted) setIsLoaded(true);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (isLoaded) {
      setStoredItem(STORAGE_KEY, JSON.stringify({
        input,
        output,
        key,
        keyType,
        outputCase
      }))
    }
  }, [input, output, key, keyType, outputCase, isLoaded])

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
        cryptoParams: { algorithm: "HMAC-MD5", key, key_type: keyType },
      }, "success")
    } catch (e) {
      addLog({
        method: "HMAC-MD5",
        input,
        output: (e as Error).message,
        cryptoParams: { algorithm: "HMAC-MD5", key, key_type: keyType },
      }, "error")
    }
  }

  const handleClear = () => {
    setInput("")
    setOutput("")
    setKey("")
    removeStoredItem(STORAGE_KEY)
  }

  return (
    <HashWorkbench
      id="hmac-md5"
      input={input}
      onInputChange={setInput}
      output={output}
      onClear={handleClear}
      toolbarContent={(
        <RadioGroup orientation="horizontal" value={outputCase} onValueChange={setOutputCase} label={t("tools.hash.case")} size="sm">
          <Radio value="lower">{t("tools.hash.lowercase")}</Radio>
          <Radio value="upper">{t("tools.hash.uppercase")}</Radio>
        </RadioGroup>
      )}
      configContent={(
        <div className="grid grid-cols-[minmax(0,1fr)_112px] gap-2">
          <Input
            size="sm"
            label={t("tools.hash.key")}
            placeholder={t("tools.hash.keyPlaceholder")}
            value={key}
            onValueChange={setKey}
            className="min-w-0"
            classNames={{ inputWrapper: "h-9 min-h-9 bg-background" }}
          />
          <Select
            size="sm"
            label={t("tools.hash.keyType")}
            className="w-28"
            selectedKeys={[keyType]}
            onChange={(event) => setKeyType(event.target.value)}
            disallowEmptySelection
          >
            <SelectItem key="text">{t("tools.hash.text")}</SelectItem>
            <SelectItem key="hex">{t("tools.hash.hex")}</SelectItem>
          </Select>
        </div>
      )}
      actions={(
        <Button size="sm" color="primary" onPress={handleHmacMd5} isDisabled={!input} startContent={<Hash className="h-4 w-4" />}>
          {t("tools.hash.generate")}
        </Button>
      )}
    />
  )
}
