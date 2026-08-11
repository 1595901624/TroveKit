import { useState, useEffect } from "react"
import { Button, Input, Select, SelectItem } from "../../components/ui/base-ui"
import { Lock, Unlock } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLog } from "../../contexts/LogContext"
import CryptoJS from "crypto-js"
import { getStoredItem, setStoredItem, removeStoredItem } from "../../lib/store"
import { HashToolbarField, HashWorkbench } from "./HashWorkbench"

const STORAGE_KEY = "rc4-tool-state"

export function Rc4Tab() {
  const { t } = useTranslation()
  const { addLog } = useLog()

  const [rc4Input, setRc4Input] = useState("")
  const [rc4Output, setRc4Output] = useState("")
  const [rc4Key, setRc4Key] = useState("")
  const [rc4KeyType, setRc4KeyType] = useState("text") 
  const [rc4Format, setRc4Format] = useState("Base64") 
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    let mounted = true;
    getStoredItem(STORAGE_KEY).then((stored) => {
      if (mounted && stored) {
        try {
          const state = JSON.parse(stored);
          if (state.rc4Input) setRc4Input(state.rc4Input);
          if (state.rc4Output) setRc4Output(state.rc4Output);
          if (state.rc4Key) setRc4Key(state.rc4Key);
          if (state.rc4KeyType) setRc4KeyType(state.rc4KeyType);
          if (state.rc4Format) setRc4Format(state.rc4Format);
        } catch (e) {
          console.error("Failed to parse Rc4Tab state", e);
        }
      }
      if (mounted) setIsLoaded(true);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (isLoaded) {
      setStoredItem(STORAGE_KEY, JSON.stringify({
        rc4Input,
        rc4Output,
        rc4Key,
        rc4KeyType,
        rc4Format
      }))
    }
  }, [rc4Input, rc4Output, rc4Key, rc4KeyType, rc4Format, isLoaded])

  const parseKey = (value: string, type: string) => {
    if (type === "hex") {
      return CryptoJS.enc.Hex.parse(value);
    } else {
      return CryptoJS.enc.Utf8.parse(value);
    }
  }

  const handleRc4Encrypt = () => {
    if (!rc4Input) return;
    try {
      const key = parseKey(rc4Key, rc4KeyType);
      
      const encrypted = CryptoJS.RC4.encrypt(rc4Input, key);

      let output = "";
      if (rc4Format === "Hex") {
        output = encrypted.ciphertext.toString(CryptoJS.enc.Hex);
      } else {
        output = encrypted.ciphertext.toString(CryptoJS.enc.Base64);
      }

      setRc4Output(output);
      addLog({
        method: `RC4 Encrypt (${rc4Format})`,
        input: rc4Input,
        output: output,
        cryptoParams: {
          algorithm: "RC4",
          format: rc4Format,
          key: rc4Key,
          key_type: rc4KeyType
        }
      }, "success");
    } catch (e) {
      addLog({ method: "RC4 Encrypt", input: rc4Input, output: (e as Error).message }, "error");
    }
  }

  const handleRc4Decrypt = () => {
    if (!rc4Input) return;
    try {
      const key = parseKey(rc4Key, rc4KeyType);
      
      let cipherParams;
      if (rc4Format === "Hex") {
        cipherParams = { ciphertext: CryptoJS.enc.Hex.parse(rc4Input) };
      } else {
        cipherParams = { ciphertext: CryptoJS.enc.Base64.parse(rc4Input) };
      }

      const decrypted = CryptoJS.RC4.decrypt(cipherParams as any, key);

      const output = decrypted.toString(CryptoJS.enc.Utf8);
      if (!output && rc4Input) {
           // Sometimes empty string is valid if input is valid but decrypts to empty, 
           // but often it means bad encoding. 
           // RC4 doesn't have padding checks so it might produce garbage instead of failing,
           // but if Utf8 conversion fails it might be empty.
      }

      setRc4Output(output);
      addLog({
        method: `RC4 Decrypt (${rc4Format})`,
        input: rc4Input,
        output: output,
        cryptoParams: {
          algorithm: "RC4",
          format: rc4Format,
          key: rc4Key,
          key_type: rc4KeyType
        }
      }, "success");
    } catch (e) {
      addLog({ method: "RC4 Decrypt", input: rc4Input, output: (e as Error).message }, "error");
    }
  }

  return (
    <HashWorkbench
      id="rc4"
      input={rc4Input}
      onInputChange={setRc4Input}
      inputPlaceholder={t("tools.hash.aesInputPlaceholder")}
      output={rc4Output}
      onClear={() => { setRc4Input(""); setRc4Output(""); setRc4Key(""); removeStoredItem(STORAGE_KEY) }}
      toolbarContent={(
        <HashToolbarField label={t("tools.hash.format")}>
          <Select aria-label={t("tools.hash.format")} className="w-28" classNames={{ trigger: "h-8 bg-background px-2.5 text-xs" }} selectedKeys={[rc4Format]} onChange={(event) => setRc4Format(event.target.value)}>
            <SelectItem key="Base64">Base64</SelectItem>
            <SelectItem key="Hex">Hex</SelectItem>
          </Select>
        </HashToolbarField>
      )}
      configContent={(
        <div className="grid grid-cols-[minmax(0,1fr)_112px] gap-2">
          <Input size="sm" label={t("tools.hash.key")} placeholder="Key" value={rc4Key} onValueChange={setRc4Key} className="min-w-0" classNames={{ inputWrapper: "h-9 min-h-9 bg-background" }} />
          <Select size="sm" label={t("tools.hash.keyType")} className="w-28" selectedKeys={[rc4KeyType]} onChange={(event) => setRc4KeyType(event.target.value)} disallowEmptySelection>
            <SelectItem key="text">{t("tools.hash.text")}</SelectItem>
            <SelectItem key="hex">{t("tools.hash.hex")}</SelectItem>
          </Select>
        </div>
      )}
      actions={(
        <>
          <Button size="sm" color="primary" onPress={handleRc4Encrypt} isDisabled={!rc4Input} startContent={<Lock className="h-4 w-4" />}>{t("tools.hash.encrypt")}</Button>
          <Button size="sm" variant="flat" onPress={handleRc4Decrypt} isDisabled={!rc4Input} startContent={<Unlock className="h-4 w-4" />}>{t("tools.hash.decrypt")}</Button>
        </>
      )}
    />
  )
}
