import { useState } from "react"
import { Tabs, Tab, Card, CardBody, Textarea, Button } from "@heroui/react"
import { Copy, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLog } from "../contexts/LogContext"

export function EncoderTool() {
  const { t } = useTranslation()
  const { addLog } = useLog()
  
  // URL State
  const [urlInput, setUrlInput] = useState("")
  
  // Base64 State
  const [base64Input, setBase64Input] = useState("")

  const handleUrlEncode = () => {
    try {
      const result = encodeURIComponent(urlInput)
      setUrlInput(result)
      addLog(`${urlInput.substring(0, 20)}... --URL Encode--> Success`, "success")
    } catch (e) {
      addLog(`URL Encode failed: ${(e as Error).message}`, "error")
    }
  }

  const handleUrlDecode = () => {
    try {
      const result = decodeURIComponent(urlInput)
      setUrlInput(result)
      addLog(`${urlInput.substring(0, 20)}... --URL Decode--> Success`, "success")
    } catch (e) {
      addLog(`URL Decode failed: ${(e as Error).message}`, "error")
    }
  }

  const handleBase64Encode = () => {
    try {
      // Handle UTF-8 strings
      const result = window.btoa(unescape(encodeURIComponent(base64Input)))
      setBase64Input(result)
      addLog("Base64 Encode Success", "success")
    } catch (e) {
      addLog(`Base64 Encode failed: ${(e as Error).message}`, "error")
    }
  }

  const handleBase64Decode = () => {
    try {
      // Handle UTF-8 strings
      const result = decodeURIComponent(escape(window.atob(base64Input)))
      setBase64Input(result)
      addLog("Base64 Decode Success", "success")
    } catch (e) {
      addLog(`Base64 Decode failed: ${(e as Error).message}`, "error")
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    addLog("Copied to clipboard", "info")
  }

  return (
    <div className="flex flex-col gap-6">
      <Tabs aria-label="Encoder Options" color="primary" variant="underlined">
        <Tab key="url" title="URL">
          <Card className="mt-4 shadow-sm border border-default-200">
            <CardBody className="p-6 gap-6">
              <Textarea
                label={t("tools.encoder.input")}
                placeholder={t("tools.encoder.urlPlaceholder")}
                minRows={5}
                variant="bordered"
                value={urlInput}
                onValueChange={setUrlInput}
                classNames={{
                   inputWrapper: "bg-default-100/50 hover:bg-default-100 focus-within:bg-background"
                }}
              />
              
              <div className="flex flex-wrap gap-3">
                <Button color="primary" onPress={handleUrlEncode}>
                  {t("tools.encoder.encode")}
                </Button>
                <Button color="secondary" onPress={handleUrlDecode}>
                  {t("tools.encoder.decode")}
                </Button>
                <div className="flex-1" />
                <Button isIconOnly variant="flat" onPress={() => copyToClipboard(urlInput)}>
                    <Copy className="w-4 h-4" />
                </Button>
                <Button isIconOnly variant="flat" color="danger" onPress={() => setUrlInput("")}>
                    <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardBody>
          </Card>
        </Tab>
        
        <Tab key="base64" title="Base64">
          <Card className="mt-4 shadow-sm border border-default-200">
            <CardBody className="p-6 gap-6">
              <Textarea
                label={t("tools.encoder.input")}
                placeholder={t("tools.encoder.base64Placeholder")}
                minRows={5}
                variant="bordered"
                value={base64Input}
                onValueChange={setBase64Input}
                classNames={{
                   inputWrapper: "bg-default-100/50 hover:bg-default-100 focus-within:bg-background"
                }}
              />
              
              <div className="flex flex-wrap gap-3">
                <Button color="primary" onPress={handleBase64Encode}>
                  {t("tools.encoder.encode")}
                </Button>
                <Button color="secondary" onPress={handleBase64Decode}>
                  {t("tools.encoder.decode")}
                </Button>
                <div className="flex-1" />
                <Button isIconOnly variant="flat" onPress={() => copyToClipboard(base64Input)}>
                    <Copy className="w-4 h-4" />
                </Button>
                <Button isIconOnly variant="flat" color="danger" onPress={() => setBase64Input("")}>
                    <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardBody>
          </Card>
        </Tab>
      </Tabs>
    </div>
  )
}
