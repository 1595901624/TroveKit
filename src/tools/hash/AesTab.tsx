import { useState } from "react"
import { Textarea, Button, RadioGroup, Radio, Input, Select, SelectItem } from "@heroui/react"
import { Copy, Trash2, Lock, Unlock } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLog } from "../../contexts/LogContext"
import CryptoJS from "crypto-js"

export function AesTab() {
  const { t } = useTranslation()
  const { addLog } = useLog()

  const [aesInput, setAesInput] = useState("")
  const [aesOutput, setAesOutput] = useState("")
  const [aesKey, setAesKey] = useState("")
  const [aesKeyType, setAesKeyType] = useState("text") // "text" | "hex"
  const [aesKeySize, setAesKeySize] = useState("128") // "128" | "192" | "256"
  const [aesIv, setAesIv] = useState("")
  const [aesIvType, setAesIvType] = useState("text") // "text" | "hex"
  const [aesMode, setAesMode] = useState("CBC") // CBC, ECB, OFB, CFB, CTR, CTS
  const [aesPadding, setAesPadding] = useState("Pkcs7") // Pkcs7, ZeroPadding, NoPadding, AnsiX923, Iso10126

  const parseKeyIv = (value: string, type: string, lengthBits?: number) => {
    let wordArr;
    if (type === "hex") {
      wordArr = CryptoJS.enc.Hex.parse(value);
    } else {
      wordArr = CryptoJS.enc.Utf8.parse(value);
    }

    if (lengthBits) {
      const targetBytes = lengthBits / 8;
      // Resize logic: Pad with zeros or truncate
      // Simplest way with CryptoJS: Convert to Hex, pad/truncate string, parse back
      let hex = CryptoJS.enc.Hex.stringify(wordArr);
      const targetHexChars = targetBytes * 2;
      
      if (hex.length < targetHexChars) {
        hex = hex.padEnd(targetHexChars, '0');
      } else if (hex.length > targetHexChars) {
        hex = hex.substring(0, targetHexChars);
      }
      return CryptoJS.enc.Hex.parse(hex);
    }
    return wordArr;
  }

  const getMode = (modeStr: string) => {
    switch (modeStr) {
        case "CBC": return CryptoJS.mode.CBC;
        case "ECB": return CryptoJS.mode.ECB;
        case "CTR": return CryptoJS.mode.CTR;
        case "OFB": return CryptoJS.mode.OFB;
        case "CFB": return CryptoJS.mode.CFB;
        // case "CTS": 
        //   // @ts-ignore
        //   return CryptoJS.mode.CTS || CryptoJS.mode.CBC; 
        default: return CryptoJS.mode.CBC;
    }
  }

  const getPadding = (padStr: string) => {
      switch (padStr) {
          case "Pkcs7": return CryptoJS.pad.Pkcs7;
          case "ZeroPadding": return CryptoJS.pad.ZeroPadding;
          case "NoPadding": return CryptoJS.pad.NoPadding;
          case "AnsiX923": return CryptoJS.pad.AnsiX923;
          case "Iso10126": return CryptoJS.pad.Iso10126;
          default: return CryptoJS.pad.Pkcs7;
      }
  }

  const handleAesEncrypt = () => {
    if (!aesInput) return;
    try {
      const key = parseKeyIv(aesKey, aesKeyType, parseInt(aesKeySize));
      // IV is always 128-bit (16 bytes) for AES block size, regardless of key size
      // Except ECB which doesn't use IV, but passing it doesn't hurt usually, though we can skip it.
      const iv = aesMode === "ECB" ? undefined : parseKeyIv(aesIv, aesIvType, 128); 
      
      const encrypted = CryptoJS.AES.encrypt(aesInput, key, {
        mode: getMode(aesMode),
        padding: getPadding(aesPadding),
        iv: iv
      });

      const output = encrypted.toString();
      setAesOutput(output);
      addLog({ 
        method: `AES Encrypt (${aesMode}, ${aesKeySize}-bit)`, 
        input: aesInput, 
        output: output 
      }, "success");
    } catch (e) {
      addLog({ method: "AES Encrypt", input: aesInput, output: (e as Error).message }, "error");
    }
  }

  const handleAesDecrypt = () => {
    if (!aesInput) return;
    try {
      const key = parseKeyIv(aesKey, aesKeyType, parseInt(aesKeySize));
      const iv = aesMode === "ECB" ? undefined : parseKeyIv(aesIv, aesIvType, 128);
      
      const decrypted = CryptoJS.AES.decrypt(aesInput, key, {
        mode: getMode(aesMode),
        padding: getPadding(aesPadding),
        iv: iv
      });

      const output = decrypted.toString(CryptoJS.enc.Utf8);
      if (!output) throw new Error("Decryption failed or invalid key/iv/mode");

      setAesOutput(output);
      addLog({ 
        method: `AES Decrypt (${aesMode}, ${aesKeySize}-bit)`, 
        input: aesInput, 
        output: output 
      }, "success");
    } catch (e) {
      addLog({ method: "AES Decrypt", input: aesInput, output: (e as Error).message }, "error");
    }
  }

  const copyToClipboard = (text: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    addLog(t("tools.hash.copiedToClipboard"), "info")
  }

  return (
    <div className="space-y-4">
      <Textarea
        label={t("tools.hash.inputLabel", "Input Text")}
        placeholder={t("tools.hash.aesInputPlaceholder", "Enter text to encrypt/decrypt...")}
        minRows={4}
        variant="bordered"
        value={aesInput}
        onValueChange={setAesInput}
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
                      value={aesKey}
                      onValueChange={setAesKey}
                      className="flex-1"
                    />
                    <Select 
                      size="sm" 
                      label={t("tools.hash.keySize")}
                      className="w-28" 
                      selectedKeys={[aesKeySize]} 
                      onChange={(e) => setAesKeySize(e.target.value)}
                    >
                      <SelectItem key="128">{t("tools.hash.bit128", "128-bit")}</SelectItem>
                      <SelectItem key="192">{t("tools.hash.bit192", "192-bit")}</SelectItem>
                      <SelectItem key="256">{t("tools.hash.bit256", "256-bit")}</SelectItem>
                    </Select>
                    <Select 
                      size="sm" 
                      label={t("tools.hash.text")}
                      className="w-24" 
                      selectedKeys={[aesKeyType]} 
                      onChange={(e) => setAesKeyType(e.target.value)}
                    >
                      <SelectItem key="text">{t("tools.hash.text")}</SelectItem>
                      <SelectItem key="hex">{t("tools.hash.hex")}</SelectItem>
                    </Select>
              </div>

              <div className="flex gap-2">
                  <Input 
                      size="sm"
                      label={t("tools.hash.iv")}
                      placeholder="IV"
                      value={aesIv}
                      onValueChange={setAesIv}
                      isDisabled={aesMode === "ECB"}
                      className="flex-1"
                    />
                    <Select 
                      size="sm" 
                      label={t("tools.hash.text")}
                      className="w-24" 
                      selectedKeys={[aesIvType]} 
                      onChange={(e) => setAesIvType(e.target.value)}
                      isDisabled={aesMode === "ECB"}
                    >
                      <SelectItem key="text">{t("tools.hash.text")}</SelectItem>
                      <SelectItem key="hex">{t("tools.hash.hex")}</SelectItem>
                    </Select>
              </div>
          </div>

          <div className="space-y-2">
                <RadioGroup
                  orientation="horizontal"
                  value={aesMode}
                  onValueChange={setAesMode}
                  label={t("tools.hash.mode")}
                  size="sm"
                  className="text-tiny"
                >
                  <Radio value="CBC">{t("tools.hash.cbc", "CBC")}</Radio>
                  <Radio value="ECB">{t("tools.hash.ecb", "ECB")}</Radio>
                  <Radio value="CTR">{t("tools.hash.ctr", "CTR")}</Radio>
                  <Radio value="OFB">{t("tools.hash.ofb", "OFB")}</Radio>
                  <Radio value="CFB">{t("tools.hash.cfb", "CFB")}</Radio>
                </RadioGroup>

                <RadioGroup
                  orientation="horizontal"
                  value={aesPadding}
                  onValueChange={setAesPadding}
                  label={t("tools.hash.padding")}
                  size="sm"
                  className="text-tiny"
                >
                  <Radio value="Pkcs7">{t("tools.hash.pkcs7", "PKCS7")}</Radio>
                  <Radio value="ZeroPadding">{t("tools.hash.zeroPadding", "Zeros")}</Radio>
                  <Radio value="AnsiX923">{t("tools.hash.ansiX923", "ANSI")}</Radio>
                  <Radio value="Iso10126">{t("tools.hash.iso10126", "ISO")}</Radio>
                  <Radio value="NoPadding">{t("tools.hash.noPadding", "None")}</Radio>
                </RadioGroup>
          </div>
      </div>

      <div className="flex items-center gap-2 justify-end">
          <Button color="primary" variant="flat" onPress={handleAesEncrypt} startContent={<Lock className="w-4 h-4" />}>
          {t("tools.hash.encrypt")}
          </Button>
          <Button color="secondary" variant="flat" onPress={handleAesDecrypt} startContent={<Unlock className="w-4 h-4" />}>
          {t("tools.hash.decrypt")}
          </Button>
          <Button isIconOnly variant="light" color="danger" onPress={() => { setAesInput(""); setAesOutput(""); setAesKey(""); setAesIv(""); }} title={t("tools.hash.clearAll")}>
          <Trash2 className="w-4 h-4" />
          </Button>
      </div>

      <div className="relative group">
        <Textarea
          label={t("tools.hash.outputLabel", "Output")}
          readOnly
          minRows={4}
          variant="bordered"
          value={aesOutput}
          classNames={{
            inputWrapper: "bg-default-100/30 group-hover:bg-default-100/50 transition-colors font-mono text-small"
          }}
        />
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button isIconOnly size="sm" variant="flat" onPress={() => copyToClipboard(aesOutput)}>
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
