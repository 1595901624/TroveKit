import { useState } from "react"
import { Tabs, Tab, Textarea, Button, Select, SelectItem, Switch, Input } from "@heroui/react"
import { Copy, Trash2, ArrowDownUp, ChevronDown } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLog } from "../contexts/LogContext"
import { base32Encode, base32Decode } from "../lib/base32"
import { invoke } from "@tauri-apps/api/core"

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

  // Base32 State
  const [base32Input, setBase32Input] = useState("")
  const [base32Output, setBase32Output] = useState("")

  // BaseX State
  const [baseXInput, setBaseXInput] = useState("")
  const [baseXOutput, setBaseXOutput] = useState("")
  const [selectedBase, setSelectedBase] = useState("base16")
  const [isCustomAlphabet, setIsCustomAlphabet] = useState(false)
  const [customAlphabet, setCustomAlphabet] = useState("")

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

  const handleBase64Encode = () => {
    if (!base64Input) return
    try {
      const encoder = new TextEncoder()
      const data = encoder.encode(base64Input)
      const binString = Array.from(data, (byte) => String.fromCodePoint(byte)).join("")
      const result = window.btoa(binString)
      setBase64Output(result)
      addLog({ method: "Base64 Encode", input: base64Input, output: result }, "success")
    } catch (e) {
      addLog({ method: "Base64 Encode", input: base64Input, output: (e as Error).message }, "error")
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
      addLog({ method: "Base64 Decode", input: base64Input, output: result }, "success")
    } catch (e) {
      addLog({ method: "Base64 Decode", input: base64Input, output: (e as Error).message }, "error")
    }
  }

  const handleBase32Encode = () => {
    if (!base32Input) return
    try {
      const result = base32Encode(base32Input)
      setBase32Output(result)
      addLog({ method: "Base32 Encode", input: base32Input, output: result }, "success")
    } catch (e) {
      addLog({ method: "Base32 Encode", input: base32Input, output: (e as Error).message }, "error")
    }
  }

  const handleBase32Decode = () => {
    if (!base32Input) return
    try {
      const result = base32Decode(base32Input)
      setBase32Output(result)
      addLog({ method: "Base32 Decode", input: base32Input, output: result }, "success")
    } catch (e) {
      addLog({ method: "Base32 Decode", input: base32Input, output: (e as Error).message }, "error")
    }
  }

  const handleBaseXEncode = async () => {
    if (!baseXInput) return
    try {
      const result = await invoke<string>("basex_encode", {
        input: baseXInput,
        base: selectedBase,
        alphabet: isCustomAlphabet ? customAlphabet : null
      })
      setBaseXOutput(result)
      addLog({ method: `BaseX Encode (${selectedBase})`, input: baseXInput, output: result }, "success")
    } catch (e) {
      setBaseXOutput("")
      addLog({ method: `BaseX Encode (${selectedBase})`, input: baseXInput, output: String(e) }, "error")
    }
  }

  const handleBaseXDecode = async () => {
    if (!baseXInput) return
    try {
      const result = await invoke<string>("basex_decode", {
        input: baseXInput,
        base: selectedBase,
        alphabet: isCustomAlphabet ? customAlphabet : null
      })
      setBaseXOutput(result)
      addLog({ method: `BaseX Decode (${selectedBase})`, input: baseXInput, output: result }, "success")
    } catch (e) {
      setBaseXOutput("")
      addLog({ method: `BaseX Decode (${selectedBase})`, input: baseXInput, output: String(e) }, "error")
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

  const swapBase32 = () => {
    setBase32Input(base32Output)
    setBase32Output(base32Input)
  }

  const swapBaseX = () => {
    setBaseXInput(baseXOutput)
    setBaseXOutput(baseXInput)
  }

  const copyToClipboard = (text: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    addLog(t("tools.encoder.copiedToClipboard"), "info")
  }

  const baseOptions = [
    { key: "base16", label: t("tools.encoder.base16") },
    { key: "base32", label: t("tools.encoder.base32") },
    { key: "base58", label: t("tools.encoder.base58") },
    { key: "base62", label: t("tools.encoder.base62") },
    { key: "base64", label: t("tools.encoder.base64") },
    // { key: "base85", label: t("tools.encoder.base85") },
    { key: "base91", label: t("tools.encoder.base91") },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-none">
        <Tabs
          aria-label={t("tools.encoder.encoderOptions")}
          color="primary"
          variant="underlined"
          selectedKey={selectedKey}
          onSelectionChange={(key) => setSelectedKey(key as string)}
        >
          <Tab key="url" title={t("tools.encoder.url")} />
          <Tab key="base64" title={t("tools.encoder.base64")} />
          <Tab key="base32" title={t("tools.encoder.base32")} />
          <Tab key="basex" title={t("tools.encoder.baseX")} />
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
              <Button isIconOnly variant="light" onPress={swapUrl} title={t("tools.encoder.swap")}>
                <ArrowDownUp className="w-4 h-4" />
              </Button>
              <Button isIconOnly variant="light" color="danger" onPress={() => { setUrlInput(""); setUrlOutput(""); }} title={t("tools.encoder.clearAll")}>
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
                <Button isIconOnly size="sm" variant="flat" onPress={() => copyToClipboard(urlOutput)} title={t("tools.encoder.copy")}>
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
              <Button isIconOnly variant="light" onPress={swapBase64} title={t("tools.encoder.swap")}>
                <ArrowDownUp className="w-4 h-4" />
              </Button>
              <Button isIconOnly variant="light" color="danger" onPress={() => { setBase64Input(""); setBase64Output(""); }} title={t("tools.encoder.clearAll")}>
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
                <Button isIconOnly size="sm" variant="flat" onPress={() => copyToClipboard(base64Output)} title={t("tools.encoder.copy")}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {selectedKey === "base32" && (
          <div className="space-y-4">
            <Textarea
              label={t("tools.encoder.input")}
              placeholder={t("tools.encoder.base32Placeholder")}
              minRows={6}
              variant="bordered"
              value={base32Input}
              onValueChange={setBase32Input}
              classNames={{
                inputWrapper: "bg-default-100/50 hover:bg-default-100 focus-within:bg-background"
              }}
            />

            <div className="flex items-center justify-center gap-4 py-2">
              <Button color="primary" variant="flat" onPress={handleBase32Encode} startContent={<ChevronDown className="w-4 h-4" />}>
                {t("tools.encoder.encode")}
              </Button>
              <Button color="secondary" variant="flat" onPress={handleBase32Decode} startContent={<ChevronDown className="w-4 h-4" />}>
                {t("tools.encoder.decode")}
              </Button>
              <Button isIconOnly variant="light" onPress={swapBase32} title={t("tools.encoder.swap")}>
                <ArrowDownUp className="w-4 h-4" />
              </Button>
              <Button isIconOnly variant="light" color="danger" onPress={() => { setBase32Input(""); setBase32Output(""); }} title={t("tools.encoder.clearAll")}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="relative group">
              <Textarea
                label={t("tools.encoder.output")}
                readOnly
                minRows={6}
                variant="bordered"
                value={base32Output}
                classNames={{
                  inputWrapper: "bg-default-100/30 group-hover:bg-default-100/50 transition-colors"
                }}
              />
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button isIconOnly size="sm" variant="flat" onPress={() => copyToClipboard(base32Output)} title={t("tools.encoder.copy")}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {selectedKey === "basex" && (
          <div className="space-y-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-4 items-end">
                <Select
                  label={t("tools.encoder.base")}
                  className="max-w-xs"
                  selectedKeys={[selectedBase]}
                  onChange={(e) => setSelectedBase(e.target.value)}
                >
                  {baseOptions.map((opt) => (
                    <SelectItem key={opt.key}>{opt.label}</SelectItem>
                  ))}
                </Select>

                <div className="flex items-center pb-2">
                  <Switch isSelected={isCustomAlphabet} onValueChange={setIsCustomAlphabet}>
                    {t("tools.encoder.useCustomAlphabet")}
                  </Switch>
                </div>
              </div>
              
              {isCustomAlphabet && (
                <Input
                  label={t("tools.encoder.alphabet")}
                  placeholder={t("tools.encoder.alphabet")}
                  value={customAlphabet}
                  onValueChange={setCustomAlphabet}
                  variant="bordered"
                  classNames={{
                    inputWrapper: "bg-default-100/50 hover:bg-default-100 focus-within:bg-background"
                  }}
                />
              )}
            </div>

            <Textarea
              label={t("tools.encoder.input")}
              placeholder={t("tools.encoder.baseXPlaceholder")}
              minRows={6}
              variant="bordered"
              value={baseXInput}
              onValueChange={setBaseXInput}
              classNames={{
                inputWrapper: "bg-default-100/50 hover:bg-default-100 focus-within:bg-background"
              }}
            />

            <div className="flex items-center justify-center gap-4 py-2">
              <Button color="primary" variant="flat" onPress={handleBaseXEncode} startContent={<ChevronDown className="w-4 h-4" />}>
                {t("tools.encoder.encode")}
              </Button>
              <Button color="secondary" variant="flat" onPress={handleBaseXDecode} startContent={<ChevronDown className="w-4 h-4" />}>
                {t("tools.encoder.decode")}
              </Button>
              <Button isIconOnly variant="light" onPress={swapBaseX} title={t("tools.encoder.swap")}>
                <ArrowDownUp className="w-4 h-4" />
              </Button>
              <Button isIconOnly variant="light" color="danger" onPress={() => { setBaseXInput(""); setBaseXOutput(""); }} title={t("tools.encoder.clearAll")}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="relative group">
              <Textarea
                label={t("tools.encoder.output")}
                readOnly
                minRows={6}
                variant="bordered"
                value={baseXOutput}
                classNames={{
                  inputWrapper: "bg-default-100/30 group-hover:bg-default-100/50 transition-colors"
                }}
              />
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button isIconOnly size="sm" variant="flat" onPress={() => copyToClipboard(baseXOutput)} title={t("tools.encoder.copy")}>
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