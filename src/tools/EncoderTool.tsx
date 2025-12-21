import { useState } from "react"
import { Tabs, Tab, Textarea, Button } from "@heroui/react"
import { Copy, Trash2, ArrowDownUp, ChevronDown } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLog } from "../contexts/LogContext"

export function EncoderTool() {
  const { t } = useTranslation()
  const { addLog } = useLog()

  // Tab State
  const [selectedKey, setSelectedKey] = useState<string>("url")

  // URL State
  const [urlInput, setUrlInput] = useState("")
  const [urlOutput, setUrlOutput] = useState("")

  // Base64 State
  const [base64Input, setBase64Input] = useState("")
  const [base64Output, setBase64Output] = useState("")

  const handleUrlEncode = () => {
    if (!urlInput) return
    try {
      const result = encodeURIComponent(urlInput)
      setUrlOutput(result)
      addLog(`${urlInput.substring(0, 20)}${urlInput.length > 20 ? '...' : ''} --URL Encode--> Success`, "success")
    } catch (e) {
      addLog(`URL Encode failed: ${(e as Error).message}`, "error")
    }
  }

  const handleUrlDecode = () => {
    if (!urlInput) return
    try {
      const result = decodeURIComponent(urlInput)
      setUrlOutput(result)
      addLog(`${urlInput.substring(0, 20)}${urlInput.length > 20 ? '...' : ''} --URL Decode--> Success`, "success")
    } catch (e) {
      addLog(`URL Decode failed: ${(e as Error).message}`, "error")
    }
  }

  const handleBase64Encode = () => {
    if (!base64Input) return
    try {
      const encoder = new TextEncoder()
      const data = encoder.encode(base64Input)
      const binString = Array.from(data, (byte) => String.fromCodePoint(byte)).join("")
      const result = window.btoa(binString)
      setBase64Output(result)
      addLog("Base64 Encode Success", "success")
    } catch (e) {
      addLog(`Base64 Encode failed: ${(e as Error).message}`, "error")
    }
  }

  const handleBase64Decode = () => {
    if (!base64Input) return
    try {
      const binString = window.atob(base64Input.trim())
      const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0)!)
      const decoder = new TextDecoder()
      const result = decoder.decode(bytes)
      setBase64Output(result)
      addLog("Base64 Decode Success", "success")
    } catch (e) {
      addLog(`Base64 Decode failed: ${(e as Error).message}`, "error")
    }
  }

  const swapUrl = () => {
    setUrlInput(urlOutput)
    setUrlOutput(urlInput)
  }

  const swapBase64 = () => {
    setBase64Input(base64Output)
    setBase64Output(base64Input)
  }

  const copyToClipboard = (text: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    addLog("Copied to clipboard", "info")
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-none">
        <Tabs
          aria-label="Encoder Options"
          color="primary"
          variant="underlined"
          selectedKey={selectedKey}
          onSelectionChange={(key) => setSelectedKey(key as string)}
        >
          <Tab key="url" title="URL" />
          <Tab key="base64" title="Base64" />
        </Tabs>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pt-4 pb-2">
        {selectedKey === "url" && (
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
              <Button isIconOnly variant="light" onPress={swapUrl} title="Swap">
                <ArrowDownUp className="w-4 h-4" />
              </Button>
              <Button isIconOnly variant="light" color="danger" onPress={() => { setUrlInput(""); setUrlOutput(""); }} title="Clear All">
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
                  inputWrapper: "bg-default-100/30 group-hover:bg-default-100/50 transition-colors"
                }}
              />
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button isIconOnly size="sm" variant="flat" onPress={() => copyToClipboard(urlOutput)}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {selectedKey === "base64" && (
          <div className="space-y-4">
            <Textarea
              label={t("tools.encoder.input")}
              placeholder={t("tools.encoder.base64Placeholder")}
              minRows={6}
              variant="bordered"
              value={base64Input}
              onValueChange={setBase64Input}
              classNames={{
                inputWrapper: "bg-default-100/50 hover:bg-default-100 focus-within:bg-background"
              }}
            />

            <div className="flex items-center justify-center gap-4 py-2">
              <Button color="primary" variant="flat" onPress={handleBase64Encode} startContent={<ChevronDown className="w-4 h-4" />}>
                {t("tools.encoder.encode")}
              </Button>
              <Button color="secondary" variant="flat" onPress={handleBase64Decode} startContent={<ChevronDown className="w-4 h-4" />}>
                {t("tools.encoder.decode")}
              </Button>
              <Button isIconOnly variant="light" onPress={swapBase64} title="Swap">
                <ArrowDownUp className="w-4 h-4" />
              </Button>
              <Button isIconOnly variant="light" color="danger" onPress={() => { setBase64Input(""); setBase64Output(""); }} title="Clear All">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="relative group">
              <Textarea
                label={t("tools.encoder.output")}
                readOnly
                minRows={6}
                variant="bordered"
                value={base64Output}
                classNames={{
                  inputWrapper: "bg-default-100/30 group-hover:bg-default-100/50 transition-colors"
                }}
              />
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button isIconOnly size="sm" variant="flat" onPress={() => copyToClipboard(base64Output)}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}