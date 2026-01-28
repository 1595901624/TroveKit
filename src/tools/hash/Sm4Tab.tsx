import { useState, useEffect } from "react"
import { Textarea, Button, RadioGroup, Radio, Input, Select, SelectItem } from "@heroui/react"
import { Copy, Trash2, Lock, Unlock } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLog } from "../../contexts/LogContext"
// @ts-ignore
import { sm4 } from "sm-crypto"
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
  const [sm4Mode, setSm4Mode] = useState<"cbc">("cbc")
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
        sm4Padding,
        sm4Format
      }))
    }
  }, [sm4Input, sm4Output, sm4Key, sm4KeyType, sm4Iv, sm4IvType, sm4Padding, sm4Format, isLoaded])

  // 解析密钥，SM4 密钥固定为 128 位 (16 字节)
  const parseKey = (value: string, type: string): string => {
    if (type === "hex") {
      // 如果是 hex，确保是 32 个字符 (16 字节)
      let hex = value.replace(/\s/g, '');
      if (hex.length < 32) {
        hex = hex.padEnd(32, '0');
      } else if (hex.length > 32) {
        hex = hex.substring(0, 32);
      }
      return hex;
    } else {
      // 如果是文本，转换为 hex，然后确保 32 个字符
      const encoder = new TextEncoder();
      const bytes = encoder.encode(value);
      let hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
      if (hex.length < 32) {
        hex = hex.padEnd(32, '0');
      } else if (hex.length > 32) {
        hex = hex.substring(0, 32);
      }
      return hex;
    }
  }

  // 解析 IV，SM4 IV 固定为 128 位 (16 字节)
  const parseIv = (value: string, type: string): string => {
    if (type === "hex") {
      let hex = value.replace(/\s/g, '');
      if (hex.length < 32) {
        hex = hex.padEnd(32, '0');
      } else if (hex.length > 32) {
        hex = hex.substring(0, 32);
      }
      return hex;
    } else {
      const encoder = new TextEncoder();
      const bytes = encoder.encode(value);
      let hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
      if (hex.length < 32) {
        hex = hex.padEnd(32, '0');
      } else if (hex.length > 32) {
        hex = hex.substring(0, 32);
      }
      return hex;
    }
  }

  // 填充模式处理
  const applyPadding = (data: Uint8Array, padding: string): Uint8Array => {
    const blockSize = 16;
    const padLen = blockSize - (data.length % blockSize);
    
    switch (padding) {
      case "pkcs7": {
        const pkcs7Result = new Uint8Array(data.length + padLen);
        pkcs7Result.set(data);
        pkcs7Result.fill(padLen, data.length);
        return pkcs7Result;
      }
      case "zero":
        if (padLen === blockSize) return data;
        return new Uint8Array([...data, ...new Array(padLen).fill(0)]);
      case "none":
        if (data.length % blockSize !== 0) {
          throw new Error("Data length must be multiple of block size when using NoPadding");
        }
        return data;
      default:
        return data;
    }
  }

  // 去除填充
  const removePadding = (data: Uint8Array, padding: string): Uint8Array => {
    if (padding === "none") return data;
    if (padding === "zero") {
      let i = data.length - 1;
      while (i >= 0 && data[i] === 0) i--;
      return data.slice(0, i + 1);
    }
    if (padding === "pkcs7") {
      const padLen = data[data.length - 1];
      if (padLen > 16 || padLen === 0) return data;
      // 验证填充
      for (let i = 0; i < padLen; i++) {
        if (data[data.length - 1 - i] !== padLen) return data;
      }
      return data.slice(0, data.length - padLen);
    }
    return data;
  }

  const handleSm4Encrypt = () => {
    if (!sm4Input) return;
    try {
      const keyHex = parseKey(sm4Key, sm4KeyType);
      const ivHex = parseIv(sm4Iv, sm4IvType);

      // 将输入转换为 hex
      const encoder = new TextEncoder();
      const inputBytes = applyPadding(encoder.encode(sm4Input), sm4Padding);
      const inputHex = Array.from(inputBytes).map(b => b.toString(16).padStart(2, '0')).join('');

      const encryptedHex = sm4.encrypt(inputHex, keyHex, { 
        mode: sm4Mode,
        iv: ivHex
      });

      let output = "";
      if (sm4Format === "hex") {
        output = encryptedHex;
      } else {
        // hex to base64
        const bytes = encryptedHex.match(/.{2}/g)?.map((byte: string) => parseInt(byte, 16)) || [];
        const binary = bytes.map((b: number) => String.fromCharCode(b)).join('');
        output = btoa(binary);
      }

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
      addLog({ method: "SM4 Encrypt", input: sm4Input, output: (e as Error).message }, "error");
    }
  }

  const handleSm4Decrypt = () => {
    if (!sm4Input) return;
    try {
      const keyHex = parseKey(sm4Key, sm4KeyType);
      const ivHex = parseIv(sm4Iv, sm4IvType);

      // 将输入转换为 hex
      let inputHex: string;
      if (sm4Format === "hex") {
        inputHex = sm4Input.replace(/\s/g, '');
      } else {
        // base64 to hex
        const binary = atob(sm4Input);
        inputHex = binary.split('').map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
      }

      const decryptedHex = sm4.decrypt(inputHex, keyHex, { 
        mode: sm4Mode,
        iv: ivHex
      });

      // hex to bytes
      const bytes = decryptedHex.match(/.{2}/g)?.map((byte: string) => parseInt(byte, 16)) || [];
      const outputBytes = removePadding(new Uint8Array(bytes), sm4Padding);
      
      // bytes to string
      const decoder = new TextDecoder('utf-8', { fatal: true });
      const output = decoder.decode(outputBytes);

      if (!output) throw new Error("Decryption failed or invalid key/iv/mode");

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
      addLog({ method: "SM4 Decrypt", input: sm4Input, output: (e as Error).message }, "error");
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
        placeholder={t("tools.hash.sm4InputPlaceholder", "Enter text to encrypt/decrypt...")}
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
                      className="flex-1"
                    />
                    <Select 
                      size="sm" 
                      label={t("tools.hash.text")}
                      className="w-24" 
                      selectedKeys={new Set([sm4IvType])}
                      onSelectionChange={(keys) => setSm4IvType(Array.from(keys)[0] as string)}
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
                  onValueChange={(value) => setSm4Mode(value as "cbc")}
                  label={t("tools.hash.mode")}
                  size="sm"
                  className="text-tiny"
                >
                  <Radio value="cbc">{t("tools.hash.cbc", "CBC")}</Radio>
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
                    <Radio value="pkcs7">{t("tools.hash.pkcs7", "PKCS7")}</Radio>
                    <Radio value="zero">{t("tools.hash.zeroPadding", "Zeros")}</Radio>
                    <Radio value="none">{t("tools.hash.noPadding", "None")}</Radio>
                  </RadioGroup>
                </div>

                <RadioGroup
                  orientation="horizontal"
                  value={sm4Format}
                  onValueChange={setSm4Format}
                  label={t("tools.hash.format", "Format")}
                  description={t("tools.hash.formatNote", "Encrypt: Output Format / Decrypt: Input Format")}
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
          label={t("tools.hash.outputLabel", "Output")}
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
