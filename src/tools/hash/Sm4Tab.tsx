import { useState, useEffect } from "react"
import { Button, Input, Select, SelectItem } from "../../components/ui/base-ui"
import { Lock, Unlock } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLog } from "../../contexts/LogContext"
import { invoke } from "@tauri-apps/api/core"
import { getStoredItem, setStoredItem, removeStoredItem } from "../../lib/store"
import { HashToolbarField, HashWorkbench } from "./HashWorkbench"

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

  return (
    <HashWorkbench
      id="sm4"
      input={sm4Input}
      onInputChange={setSm4Input}
      inputPlaceholder={t("tools.hash.sm4InputPlaceholder")}
      output={sm4Output}
      onClear={() => { setSm4Input(""); setSm4Output(""); setSm4Key(""); setSm4Iv(""); removeStoredItem(STORAGE_KEY) }}
      toolbarContent={(
        <>
          <HashToolbarField label={t("tools.hash.mode")}><Select aria-label={t("tools.hash.mode")} className="w-24" classNames={{ trigger: "h-8 bg-background px-2.5 text-xs" }} selectedKeys={[sm4Mode]} onChange={(event) => setSm4Mode(event.target.value as any)}>{['ecb', 'cbc', 'cfb', 'ofb', 'ctr'].map((mode) => <SelectItem key={mode}>{mode.toUpperCase()}</SelectItem>)}</Select></HashToolbarField>
          <HashToolbarField label={t("tools.hash.padding")}><Select aria-label={t("tools.hash.padding")} className="w-32" classNames={{ trigger: "h-8 bg-background px-2.5 text-xs" }} selectedKeys={[sm4Padding]} onChange={(event) => setSm4Padding(event.target.value)}><SelectItem key="pkcs7">{t("tools.hash.pkcs7")}</SelectItem><SelectItem key="zero">{t("tools.hash.zeroPadding")}</SelectItem><SelectItem key="none">{t("tools.hash.noPadding")}</SelectItem></Select></HashToolbarField>
          <HashToolbarField label={t("tools.hash.format")}><Select aria-label={t("tools.hash.format")} className="w-24" classNames={{ trigger: "h-8 bg-background px-2.5 text-xs" }} selectedKeys={[sm4Format]} onChange={(event) => setSm4Format(event.target.value)}><SelectItem key="base64">Base64</SelectItem><SelectItem key="hex">Hex</SelectItem></Select></HashToolbarField>
        </>
      )}
      configContent={(
        <div className="grid gap-2 md:grid-cols-2">
          <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-2"><Input size="sm" label={t("tools.hash.key")} placeholder="Key (16 bytes)" value={sm4Key} onValueChange={setSm4Key} classNames={{ inputWrapper: "h-9 min-h-9 bg-background" }} /><Select size="sm" label={t("tools.hash.keyType")} selectedKeys={[sm4KeyType]} onChange={(event) => setSm4KeyType(event.target.value)}><SelectItem key="text">{t("tools.hash.text")}</SelectItem><SelectItem key="hex">{t("tools.hash.hex")}</SelectItem></Select></div>
          <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-2"><Input size="sm" label={t("tools.hash.iv")} placeholder="IV (16 bytes)" value={sm4Iv} onValueChange={setSm4Iv} isDisabled={sm4Mode === "ecb"} classNames={{ inputWrapper: "h-9 min-h-9 bg-background" }} /><Select size="sm" label={t("tools.hash.keyType")} selectedKeys={[sm4IvType]} onChange={(event) => setSm4IvType(event.target.value)} isDisabled={sm4Mode === "ecb"}><SelectItem key="text">{t("tools.hash.text")}</SelectItem><SelectItem key="hex">{t("tools.hash.hex")}</SelectItem></Select></div>
        </div>
      )}
      actions={<><Button size="sm" color="primary" onPress={handleSm4Encrypt} isDisabled={!sm4Input} startContent={<Lock className="h-4 w-4" />}>{t("tools.hash.encrypt")}</Button><Button size="sm" variant="flat" onPress={handleSm4Decrypt} isDisabled={!sm4Input} startContent={<Unlock className="h-4 w-4" />}>{t("tools.hash.decrypt")}</Button></>}
    />
  )
}
