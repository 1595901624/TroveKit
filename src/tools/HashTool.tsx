import { useState } from "react"
import { Tabs, Tab, Textarea, Button, RadioGroup, Radio } from "@heroui/react"
import { Copy, Trash2, Hash } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLog } from "../contexts/LogContext"
import CryptoJS from "crypto-js"

export function HashTool() {
  const { t } = useTranslation()
  const { addLog } = useLog()

  const [selectedKey, setSelectedKey] = useState<string>("md5")

  // MD5 State
  const [md5Input, setMd5Input] = useState("")
  const [md5Output, setMd5Output] = useState("")
  const [md5Bit, setMd5Bit] = useState("32") // "16" | "32"
  const [md5Case, setMd5Case] = useState("lower") // "lower" | "upper"

  // SHA State
  const [shaInput, setShaInput] = useState("")
  const [shaOutput, setShaOutput] = useState("")
  const [shaType, setShaType] = useState("SHA256") // "SHA1" | "SHA256" | "SHA512"
  const [shaCase, setShaCase] = useState("lower") // "lower" | "upper"

  const handleMd5Hash = () => {
    if (!md5Input) return
    try {
      let hash = CryptoJS.MD5(md5Input).toString()
      
      if (md5Bit === "16") {
        // 16-bit MD5 is usually the middle 16 characters (8 to 24) of the 32-character hex string
        hash = hash.substring(8, 24)
      }

      if (md5Case === "upper") {
        hash = hash.toUpperCase()
      }

      setMd5Output(hash)
      addLog({ 
        method: `MD5 (${md5Bit}-bit, ${md5Case})`, 
        input: md5Input, 
        output: hash 
      }, "success")

    } catch (e) {
      addLog({ method: "MD5", input: md5Input, output: (e as Error).message }, "error")
    }
  }

  const handleShaHash = () => {
    if (!shaInput) return
    try {
      let hash = ""
      switch (shaType) {
        case "SHA1":
          hash = CryptoJS.SHA1(shaInput).toString()
          break
        case "SHA256":
          hash = CryptoJS.SHA256(shaInput).toString()
          break
        case "SHA512":
          hash = CryptoJS.SHA512(shaInput).toString()
          break
        default:
          return
      }

      if (shaCase === "upper") {
        hash = hash.toUpperCase()
      }

      setShaOutput(hash)
      addLog({ 
        method: `${shaType} (${shaCase})`, 
        input: shaInput, 
        output: hash 
      }, "success")

    } catch (e) {
      addLog({ method: shaType, input: shaInput, output: (e as Error).message }, "error")
    }
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
          aria-label="Hash Options"
          color="primary"
          variant="underlined"
          selectedKey={selectedKey}
          onSelectionChange={(key) => setSelectedKey(key as string)}
        >
          <Tab key="md5" title="MD5" />
          <Tab key="sha" title="SHA" />
        </Tabs>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pt-4 pb-2">
        {selectedKey === "md5" && (
          <div className="space-y-4">
            <Textarea
              label={t("tools.hash.inputLabel", "Input Text")}
              placeholder={t("tools.hash.inputPlaceholder", "Enter text to hash...")}
              minRows={6}
              variant="bordered"
              value={md5Input}
              onValueChange={setMd5Input}
              classNames={{
                inputWrapper: "bg-default-100/50 hover:bg-default-100 focus-within:bg-background"
              }}
            />

            <div className="flex flex-wrap items-center justify-between gap-4 py-2 px-1">
               <div className="flex items-center gap-6">
                 <RadioGroup
                    orientation="horizontal"
                    value={md5Bit}
                    onValueChange={setMd5Bit}
                    label="Length"
                    size="sm"
                    className="text-tiny"
                  >
                    <Radio value="32">32-bit</Radio>
                    <Radio value="16">16-bit</Radio>
                  </RadioGroup>

                  <RadioGroup
                    orientation="horizontal"
                    value={md5Case}
                    onValueChange={setMd5Case}
                    label="Case"
                    size="sm"
                  >
                    <Radio value="lower">Lowercase</Radio>
                    <Radio value="upper">Uppercase</Radio>
                  </RadioGroup>
               </div>

               <div className="flex items-center gap-2">
                  <Button color="primary" variant="flat" onPress={handleMd5Hash} startContent={<Hash className="w-4 h-4" />}>
                    {t("tools.hash.generate", "Generate MD5")}
                  </Button>
                  <Button isIconOnly variant="light" color="danger" onPress={() => { setMd5Input(""); setMd5Output(""); }} title="Clear All">
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
                value={md5Output}
                classNames={{
                  inputWrapper: "bg-default-100/30 group-hover:bg-default-100/50 transition-colors font-mono text-small"
                }}
              />
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button isIconOnly size="sm" variant="flat" onPress={() => copyToClipboard(md5Output)}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {selectedKey === "sha" && (
          <div className="space-y-4">
            <Textarea
              label={t("tools.hash.inputLabel", "Input Text")}
              placeholder={t("tools.hash.inputPlaceholder", "Enter text to hash...")}
              minRows={6}
              variant="bordered"
              value={shaInput}
              onValueChange={setShaInput}
              classNames={{
                inputWrapper: "bg-default-100/50 hover:bg-default-100 focus-within:bg-background"
              }}
            />

            <div className="flex flex-wrap items-center justify-between gap-4 py-2 px-1">
               <div className="flex items-center gap-6">
                  <RadioGroup
                    orientation="horizontal"
                    value={shaType}
                    onValueChange={setShaType}
                    label="Algorithm"
                    size="sm"
                  >
                    <Radio value="SHA1">SHA1</Radio>
                    <Radio value="SHA256">SHA256</Radio>
                    <Radio value="SHA512">SHA512</Radio>
                  </RadioGroup>

                  <RadioGroup
                    orientation="horizontal"
                    value={shaCase}
                    onValueChange={setShaCase}
                    label="Case"
                    size="sm"
                  >
                    <Radio value="lower">Lowercase</Radio>
                    <Radio value="upper">Uppercase</Radio>
                  </RadioGroup>
               </div>

               <div className="flex items-center gap-2">
                  <Button color="primary" variant="flat" onPress={handleShaHash} startContent={<Hash className="w-4 h-4" />}>
                    {t("tools.hash.generate", "Generate Hash")}
                  </Button>
                  <Button isIconOnly variant="light" color="danger" onPress={() => { setShaInput(""); setShaOutput(""); }} title="Clear All">
                    <Trash2 className="w-4 h-4" />
                  </Button>
               </div>
            </div>

            <div className="relative group">
              <Textarea
                label={t("tools.hash.outputLabel", "Hash Output")}
                readOnly
                minRows={4}
                variant="bordered"
                value={shaOutput}
                classNames={{
                  inputWrapper: "bg-default-100/30 group-hover:bg-default-100/50 transition-colors font-mono text-small"
                }}
              />
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button isIconOnly size="sm" variant="flat" onPress={() => copyToClipboard(shaOutput)}>
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
