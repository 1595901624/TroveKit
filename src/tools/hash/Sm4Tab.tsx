import { useState, useEffect } from "react"
import { Textarea, Button, RadioGroup, Radio, Input, Select, SelectItem } from "@heroui/react"
import { Copy, Trash2, Lock, Unlock } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLog } from "../../contexts/LogContext"
import { invoke } from "@tauri-apps/api/core"
import { getStoredItem, setStoredItem, removeStoredItem } from "../../lib/store"

const STORAGE_KEY = "sm4-tool-state"

export function Sm4Tab() {
  const { t } = useTranslation()
  const { addLog } = useLog()

  const [sm4Input, setSm4Input] = useState("")
  const [sm4Output, setSm4Output] = useState("")
  const [sm4Key, setSm4Key] = useState("")
  const [sm4KeyType, setSm4KeyType] = useState("text")
  const [sm4Iv, setSm4Iv] = useState("")
  const [sm4IvType, setSm4IvType] = useState("text")
  const [sm4Mode, setSm4Mode] = useState<"ecb" | "cbc" | "cfb" | "ofb" | "ctr">("cbc")
  const [sm4Padding, setSm4Padding] = useState("pkcs7")
  const [sm4Format, setSm4Format] = useState("base64")
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    let mounted = true;
    getStoredItem(STORAGE_KEY).then((stored) => {
      if (mounted && stored) {
        try {
          const state = JSON.parse(stored);
          if (state.sm4Input) setSm4Input(state.sm4Input);
          if (state.sm4Output) setSm4Output(state.sm4Output);
          if (state.sm4Key) setSm4Key(state.sm4Key);
          if (state.sm4KeyType) setSm4KeyType(state.sm4KeyType);
          if (state.sm4Iv) setSm4Iv(state.sm4Iv);
          if (state.sm4IvType) setSm4IvType(state.sm4IvType);
          if (state.sm4Mode) setSm4Mode(state.sm4Mode);
          if (state.sm4Padding) setSm4Padding(state.sm4Padding);
          if (state.sm4Format) setSm4Format(state.sm4Format);
        } catch (e) {
          console.error("Failed to parse Sm4Tab state", e);
        }
      }
      if (mounted) setIsLoaded(true);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (isLoaded) {
      setStoredItem(STORAGE_KEY, JSON.stringify({
        sm4Input,
        sm4Output,
        sm4Key,
        sm4KeyType,
        sm4Iv,
        sm4IvType,
        sm4Mode,
        sm4Padding,
        sm4Format
      }))
    }
  }, [sm4Input, sm4Output, sm4Key, sm4KeyType, sm4Iv, sm4IvType, sm4Mode, sm4Padding, sm4Format, isLoaded])

  const handleSm4Encrypt = async () => {
    if (!sm4Input) return;
    try {
      const request: any = {
        input: sm4Input,
        mode: sm4Mode,
        padding: sm4Padding,
        format: sm4Format,
        key: sm4Key,
        keyType: sm4KeyType,
        ...(sm4Mode !== "ecb" ? { iv: sm4Iv, ivType: sm4IvType } : {})
      };

      const output = await invoke<string>("sm4_encrypt", { request });

      setSm4Output(output);
      addLog({
        method: `SM4 Encrypt (${sm4Mode.toUpperCase()}, ${sm4Format})`,
        input: sm4Input,
        output: output,
        cryptoParams: {
          algorithm: "SM4",
          mode: sm4Mode.toUpperCase(),
          format: sm4Format,
          key: sm4Key,
          key_type: sm4KeyType,
          iv: sm4Iv,
          padding: sm4Padding
        }
      }, "success");
    } catch (e) {
      const msg = (e as Error).message || String(e);
      setSm4Output(msg);
      addLog({ method: "SM4 Encrypt", input: sm4Input, output: msg }, "error");
    }
  }

  const handleSm4Decrypt = async () => {
    if (!sm4Input) return;
    try {
      const request: any = {
        input: sm4Input,
        mode: sm4Mode,
        padding: sm4Padding,
        format: sm4Format,
        key: sm4Key,
        keyType: sm4KeyType,
        ...(sm4Mode !== "ecb" ? { iv: sm4Iv, ivType: sm4IvType } : {})
      };

      const output = await invoke<string>("sm4_decrypt", { request });

      setSm4Output(output);
      addLog({
        method: `SM4 Decrypt (${sm4Mode.toUpperCase()}, ${sm4Format})`,
        input: sm4Input,
        output: output,
        cryptoParams: {
          algorithm: "SM4",
          mode: sm4Mode.toUpperCase(),
          format: sm4Format,
          key: sm4Key,
          key_type: sm4KeyType,
          iv: sm4Iv,
          padding: sm4Padding
        }
      }, "success");
    } catch (e) {
      const msg = (e as Error).message || String(e);
      setSm4Output(msg);
      addLog({ method: "SM4 Decrypt", input: sm4Input, output: msg }, "error");
    }
  }

  const copyToClipboard = (text: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="space-y-4">
      <Textarea
        label={t("tools.hash.inputLabel")}
        placeholder={t("tools.hash.sm4InputPlaceholder")}
        minRows={4}
        variant="bordered"
        value={sm4Input}
        onValueChange={setSm4Input}
        classNames={{
          inputWrapper: "bg-default-100/50 hover:bg-default-100 focus-within:bg-background"
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-2 bg-default-50 rounded-lg">
          <div className="space-y-4">
              <div className="flex gap-2">
                    <Input 
                      size="sm"
                      label={t("tools.hash.key")}
                      placeholder="Key (16 bytes)"
                      value={sm4Key}
                      onValueChange={setSm4Key}
                      className="flex-1"
                    />
                    <Select 
                      size="sm" 
                      label={t("tools.hash.text")}
                      className="w-24" 
                      selectedKeys={new Set([sm4KeyType])}
                      onSelectionChange={(keys) => setSm4KeyType(Array.from(keys)[0] as string)}
                      disallowEmptySelection
                    >
                      <SelectItem key="text">{t("tools.hash.text")}</SelectItem>
                      <SelectItem key="hex">{t("tools.hash.hex")}</SelectItem>
                    </Select>
              </div>

              <div className="flex gap-2">
                  <Input 
                      size="sm"
                      label={t("tools.hash.iv")}
                      placeholder="IV (16 bytes)"
                      value={sm4Iv}
                      onValueChange={setSm4Iv}
                      isDisabled={sm4Mode === "ecb"}
                      className="flex-1"
                    />
                    <Select 
                      size="sm" 
                      label={t("tools.hash.text")}
                      className="w-24" 
                      selectedKeys={new Set([sm4IvType])}
                      onSelectionChange={(keys) => setSm4IvType(Array.from(keys)[0] as string)}
                      isDisabled={sm4Mode === "ecb"}
                      disallowEmptySelection
                    >
                      <SelectItem key="text">{t("tools.hash.text")}</SelectItem>
                      <SelectItem key="hex">{t("tools.hash.hex")}</SelectItem>
                    </Select>
              </div>
          </div>

          <div className="space-y-2">
                <RadioGroup
                  orientation="horizontal"
                  value={sm4Mode}
                  onValueChange={(value) => setSm4Mode(value as any)}
                  label={t("tools.hash.mode")}
                  size="sm"
                  className="text-tiny"
                >
                  <Radio value="ecb">{t("tools.hash.ecb")}</Radio>
                  <Radio value="cbc">{t("tools.hash.cbc")}</Radio>
                  <Radio value="cfb">{t("tools.hash.cfb")}</Radio>
                  <Radio value="ofb">{t("tools.hash.ofb")}</Radio>
                  <Radio value="ctr">{t("tools.hash.ctr")}</Radio>
                </RadioGroup>

                <div className="flex gap-4">
                  <RadioGroup
                    orientation="horizontal"
                    value={sm4Padding}
                    onValueChange={setSm4Padding}
                    label={t("tools.hash.padding")}
                    size="sm"
                    className="text-tiny"
                  >
                    <Radio value="pkcs7">{t("tools.hash.pkcs7")}</Radio>
                    <Radio value="zero">{t("tools.hash.zeroPadding")}</Radio>
                    <Radio value="none">{t("tools.hash.noPadding")}</Radio>
                  </RadioGroup>
                </div>

                <RadioGroup
                  orientation="horizontal"
                  value={sm4Format}
                  onValueChange={setSm4Format}
                  label={t("tools.hash.format")}
                  description={t("tools.hash.formatNote")}
                  size="sm"
                  className="text-tiny"
                >
                  <Radio value="base64">Base64</Radio>
                  <Radio value="hex">Hex</Radio>
                </RadioGroup>
          </div>
      </div>

      <div className="flex items-center gap-2 justify-end">
          <Button color="primary" variant="flat" onPress={handleSm4Encrypt} startContent={<Lock className="w-4 h-4" />}>
          {t("tools.hash.encrypt")}
          </Button>
          <Button color="secondary" variant="flat" onPress={handleSm4Decrypt} startContent={<Unlock className="w-4 h-4" />}>
          {t("tools.hash.decrypt")}
          </Button>
          <Button isIconOnly variant="light" color="danger" onPress={() => { setSm4Input(""); setSm4Output(""); setSm4Key(""); setSm4Iv(""); removeStoredItem(STORAGE_KEY); }} title={t("tools.hash.clearAll")}>
          <Trash2 className="w-4 h-4" />
          </Button>
      </div>

      <div className="relative group">
        <Textarea
          label={t("tools.hash.outputLabel")}
          readOnly
          minRows={4}
          variant="bordered"
          value={sm4Output}
          classNames={{
            inputWrapper: "bg-default-100/30 group-hover:bg-default-100/50 transition-colors font-mono text-tiny"
          }}
        />
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button isIconOnly size="sm" variant="flat" onPress={() => copyToClipboard(sm4Output)}>
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
