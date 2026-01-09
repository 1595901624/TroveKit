import { useState, useEffect } from "react"
import { Textarea, Button, RadioGroup, Radio, Input, Select, SelectItem } from "@heroui/react"
import { Copy, Trash2, Lock, Unlock } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLog } from "../../contexts/LogContext"
import CryptoJS from "crypto-js"

const STORAGE_KEY = "rc4-tool-state"

const loadStateFromStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

const saveStateToStorage = (state: Record<string, any>) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function Rc4Tab() {
  const { t } = useTranslation()
  const { addLog } = useLog()

  const savedState = loadStateFromStorage()

  const [rc4Input, setRc4Input] = useState(savedState.rc4Input || "")
  const [rc4Output, setRc4Output] = useState(savedState.rc4Output || "")
  const [rc4Key, setRc4Key] = useState(savedState.rc4Key || "")
  const [rc4KeyType, setRc4KeyType] = useState(savedState.rc4KeyType || "text") 
  const [rc4Format, setRc4Format] = useState(savedState.rc4Format || "Base64") 

  useEffect(() => {
    saveStateToStorage({
      rc4Input,
      rc4Output,
      rc4Key,
      rc4KeyType,
      rc4Format
    })
  }, [rc4Input, rc4Output, rc4Key, rc4KeyType, rc4Format])

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
        algorithm: "RC4",
        format: rc4Format,
        key_type: rc4KeyType
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
        algorithm: "RC4",
        format: rc4Format,
        key_type: rc4KeyType
      }, "success");
    } catch (e) {
      addLog({ method: "RC4 Decrypt", input: rc4Input, output: (e as Error).message }, "error");
    }
  }

  const copyToClipboard = (text: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="space-y-4">
      <Textarea
        label={t("tools.hash.inputLabel", "Input Text")}
        placeholder={t("tools.hash.aesInputPlaceholder", "Enter text to encrypt/decrypt...")}
        minRows={4}
        variant="bordered"
        value={rc4Input}
        onValueChange={setRc4Input}
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
                      placeholder="Key"
                      value={rc4Key}
                      onValueChange={setRc4Key}
                      className="flex-1"
                    />
                    <Select 
                      size="sm" 
                      label={t("tools.hash.text")}
                      className="w-24" 
                      selectedKeys={new Set([rc4KeyType])}
                      onSelectionChange={(keys) => setRc4KeyType(Array.from(keys)[0] as string)}
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
                  value={rc4Format}
                  onValueChange={setRc4Format}
                  label={t("tools.hash.format", "Format")}
                  description={t("tools.hash.formatNote", "Encrypt: Output Format / Decrypt: Input Format")}
                  size="sm"
                  className="text-tiny"
                >
                  <Radio value="Base64">Base64</Radio>
                  <Radio value="Hex">Hex</Radio>
                </RadioGroup>
          </div>
      </div>

      <div className="flex items-center gap-2 justify-end">
          <Button color="primary" variant="flat" onPress={handleRc4Encrypt} startContent={<Lock className="w-4 h-4" />}>
          {t("tools.hash.encrypt")}
          </Button>
          <Button color="secondary" variant="flat" onPress={handleRc4Decrypt} startContent={<Unlock className="w-4 h-4" />}>
          {t("tools.hash.decrypt")}
          </Button>
          <Button isIconOnly variant="light" color="danger" onPress={() => { setRc4Input(""); setRc4Output(""); setRc4Key(""); localStorage.removeItem(STORAGE_KEY); }} title={t("tools.hash.clearAll")}>
          <Trash2 className="w-4 h-4" />
          </Button>
      </div>

      <div className="relative group">
        <Textarea
          label={t("tools.hash.outputLabel", "Output")}
          readOnly
          minRows={4}
          variant="bordered"
          value={rc4Output}
          classNames={{
            inputWrapper: "bg-default-100/30 group-hover:bg-default-100/50 transition-colors font-mono text-tiny"
          }}
        />
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button isIconOnly size="sm" variant="flat" onPress={() => copyToClipboard(rc4Output)}>
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
