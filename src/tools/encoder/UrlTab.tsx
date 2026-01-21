import { useState, useEffect } from "react"
import { Textarea, Button } from "@heroui/react"
import { Copy, Trash2, ArrowDownUp, ChevronDown } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLog } from "../../contexts/LogContext"
import { getStoredItem, setStoredItem, removeStoredItem } from "../../lib/store"

const STORAGE_KEY = "url-tool-state"

export function UrlTab() {
  const { t } = useTranslation()
  const { addLog } = useLog()

  const [urlInput, setUrlInput] = useState("")
  const [urlOutput, setUrlOutput] = useState("")
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    let mounted = true;
    getStoredItem(STORAGE_KEY).then((stored) => {
      if (mounted && stored) {
        try {
          const state = JSON.parse(stored);
          if (state.urlInput) setUrlInput(state.urlInput);
          if (state.urlOutput) setUrlOutput(state.urlOutput);
        } catch (e) {
          console.error("Failed to parse UrlTab state", e);
        }
      }
      if (mounted) setIsLoaded(true);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (isLoaded) {
      setStoredItem(STORAGE_KEY, JSON.stringify({ urlInput, urlOutput }))
    }
  }, [urlInput, urlOutput, isLoaded])

  const handleUrlEncode = () => {
    if (!urlInput) return
    try {
      const result = encodeURIComponent(urlInput)
      setUrlOutput(result)
      addLog({ method: "URL Encode", input: urlInput, output: result }, "success")

    } catch (e) {
      addLog({ method: "URL Encode", input: urlInput, output: (e as Error).message }, "error")
    }
  }

  const handleUrlDecode = () => {
    if (!urlInput) return
    try {
      const result = decodeURIComponent(urlInput)
      setUrlOutput(result)
      addLog({ method: "URL Decode", input: urlInput, output: result }, "success")
    } catch (e) {
      addLog({ method: "URL Decode", input: urlInput, output: (e as Error).message }, "error")
    }
  }

  const swapUrl = () => {
    setUrlInput(urlOutput)
    setUrlOutput(urlInput)
  }

  const copyToClipboard = (text: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="space-y-4">
      <Textarea
        label={t("tools.encoder.input")}
        placeholder={t("tools.encoder.urlPlaceholder")}
        minRows={6}
        variant="bordered"
        value={urlInput}
        onValueChange={setUrlInput}
        classNames={{
          inputWrapper: "bg-default-100/50 hover:bg-default-100 focus-within:bg-background"
        }}
      />

      <div className="flex items-center justify-center gap-4 py-2">
        <Button color="primary" variant="flat" onPress={handleUrlEncode} startContent={<ChevronDown className="w-4 h-4" />}>
          {t("tools.encoder.encode")}
        </Button>
        <Button color="secondary" variant="flat" onPress={handleUrlDecode} startContent={<ChevronDown className="w-4 h-4" />}>
          {t("tools.encoder.decode")}
        </Button>
        <Button isIconOnly variant="light" onPress={swapUrl} title={t("tools.encoder.swap")}>
          <ArrowDownUp className="w-4 h-4" />
        </Button>
        <Button isIconOnly variant="light" color="danger" onPress={() => { setUrlInput(""); setUrlOutput(""); removeStoredItem(STORAGE_KEY); }} title={t("tools.encoder.clearAll")}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="relative group">
        <Textarea
          label={t("tools.encoder.output")}
          readOnly
          minRows={6}
          variant="bordered"
          value={urlOutput}
          classNames={{
            inputWrapper: "bg-default-100/30 group-hover:bg-default-100/50 transition-colors font-mono text-tiny"
          }}
        />
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button isIconOnly size="sm" variant="flat" onPress={() => copyToClipboard(urlOutput)} title={t("tools.encoder.copy")}>
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
