import { useState, useEffect } from "react"
import { Textarea, Button, RadioGroup, Radio, Input, Select, SelectItem } from "@heroui/react"
import { Copy, Trash2, Lock, Unlock } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLog } from "../../contexts/LogContext"
import CryptoJS from "crypto-js"
import { getStoredItem, setStoredItem, removeStoredItem } from "../../lib/store"

const STORAGE_KEY = "aes-tool-state"

export function AesTab() {
  const { t } = useTranslation()
  const { addLog } = useLog()

  const [aesInput, setAesInput] = useState("")
  const [aesOutput, setAesOutput] = useState("")
  const [aesKey, setAesKey] = useState("")
  const [aesKeyType, setAesKeyType] = useState("text") 
  const [aesKeySize, setAesKeySize] = useState("128") 
  const [aesIv, setAesIv] = useState("")
  const [aesIvType, setAesIvType] = useState("text") 
  const [aesMode, setAesMode] = useState("CBC") 
  const [aesPadding, setAesPadding] = useState("Pkcs7") 
  const [aesFormat, setAesFormat] = useState("Base64") 
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    let mounted = true;
    getStoredItem(STORAGE_KEY).then((stored) => {
      if (mounted && stored) {
        try {
          const state = JSON.parse(stored);
          if (state.aesInput) setAesInput(state.aesInput);
          if (state.aesOutput) setAesOutput(state.aesOutput);
          if (state.aesKey) setAesKey(state.aesKey);
          if (state.aesKeyType) setAesKeyType(state.aesKeyType);
          if (state.aesKeySize) setAesKeySize(state.aesKeySize);
          if (state.aesIv) setAesIv(state.aesIv);
          if (state.aesIvType) setAesIvType(state.aesIvType);
          if (state.aesMode) setAesMode(state.aesMode);
          if (state.aesPadding) setAesPadding(state.aesPadding);
          if (state.aesFormat) setAesFormat(state.aesFormat);
        } catch (e) {
          console.error("Failed to parse AesTab state", e);
        }
      }
      if (mounted) setIsLoaded(true);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (isLoaded) {
      setStoredItem(STORAGE_KEY, JSON.stringify({
        aesInput,
        aesOutput,
        aesKey,
        aesKeyType,
        aesKeySize,
        aesIv,
        aesIvType,
        aesMode,
        aesPadding,
        aesFormat
      }))
    }
  }, [aesInput, aesOutput, aesKey, aesKeyType, aesKeySize, aesIv, aesIvType, aesMode, aesPadding, aesFormat, isLoaded])

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

      let output = "";
      if (aesFormat === "Hex") {
        output = encrypted.ciphertext.toString(CryptoJS.enc.Hex);
      } else {
        output = encrypted.ciphertext.toString(CryptoJS.enc.Base64);
      }

      setAesOutput(output);
      addLog({
        method: `AES Encrypt (${aesMode}, ${aesKeySize}-bit, ${aesFormat})`,
        input: aesInput,
        output: output,
        cryptoParams: {
          algorithm: "AES",
          mode: aesMode,
          key_size: `${aesKeySize}-bit`,
          format: aesFormat,
          key: aesKey,
          key_type: aesKeyType,
          iv: aesIv,
          padding: aesPadding
        }
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
      
      let cipherParams;
      if (aesFormat === "Hex") {
        cipherParams = { ciphertext: CryptoJS.enc.Hex.parse(aesInput) };
      } else {
        cipherParams = { ciphertext: CryptoJS.enc.Base64.parse(aesInput) };
      }

      const decrypted = CryptoJS.AES.decrypt(cipherParams as any, key, {
        mode: getMode(aesMode),
        padding: getPadding(aesPadding),
        iv: iv
      });

      const output = decrypted.toString(CryptoJS.enc.Utf8);
      if (!output) throw new Error("Decryption failed or invalid key/iv/mode");

      setAesOutput(output);
      addLog({
        method: `AES Decrypt (${aesMode}, ${aesKeySize}-bit, ${aesFormat})`,
        input: aesInput,
        output: output,
        cryptoParams: {
          algorithm: "AES",
          mode: aesMode,
          key_size: `${aesKeySize}-bit`,
          format: aesFormat,
          key: aesKey,
          key_type: aesKeyType,
          iv: aesIv,
          padding: aesPadding
        }
      }, "success");
    } catch (e) {
      addLog({ method: "AES Decrypt", input: aesInput, output: (e as Error).message }, "error");
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
        placeholder={t("tools.hash.aesInputPlaceholder")}
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
                      selectedKeys={new Set([aesKeySize])}
                      onSelectionChange={(keys) => setAesKeySize(Array.from(keys)[0] as string)}
                      disallowEmptySelection
                    >
                      <SelectItem key="128">{t("tools.hash.bit128")}</SelectItem>
                      <SelectItem key="192">{t("tools.hash.bit192")}</SelectItem>
                      <SelectItem key="256">{t("tools.hash.bit256")}</SelectItem>
                    </Select>
                    <Select 
                      size="sm" 
                      label={t("tools.hash.text")}
                      className="w-24" 
                      selectedKeys={new Set([aesKeyType])}
                      onSelectionChange={(keys) => setAesKeyType(Array.from(keys)[0] as string)}
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
                      selectedKeys={new Set([aesIvType])}
                      onSelectionChange={(keys) => setAesIvType(Array.from(keys)[0] as string)}
                      isDisabled={aesMode === "ECB"}
                      disallowEmptySelection
                    >
                      <SelectItem key="text">{t("tools.hash.text")}</SelectItem>
                      <SelectItem key="hex">{t("tools.hash.hex")}</SelectItem>
                    </Select>
              </div>
          </div>

          <div className="space-y-2">
                <div className="flex gap-4">
                  <RadioGroup
                    orientation="horizontal"
                    value={aesMode}
                    onValueChange={setAesMode}
                    label={t("tools.hash.mode")}
                    size="sm"
                    className="text-tiny"
                  >
                    <Radio value="CBC">{t("tools.hash.cbc")}</Radio>
                    <Radio value="ECB">{t("tools.hash.ecb")}</Radio>
                    <Radio value="CTR">{t("tools.hash.ctr")}</Radio>
                    <Radio value="OFB">{t("tools.hash.ofb")}</Radio>
                    <Radio value="CFB">{t("tools.hash.cfb")}</Radio>
                  </RadioGroup>
                </div>

                <div className="flex gap-4">
                  <RadioGroup
                    orientation="horizontal"
                    value={aesPadding}
                    onValueChange={setAesPadding}
                    label={t("tools.hash.padding")}
                    size="sm"
                    className="text-tiny"
                  >
                    <Radio value="Pkcs7">{t("tools.hash.pkcs7")}</Radio>
                    <Radio value="ZeroPadding">{t("tools.hash.zeroPadding")}</Radio>
                    <Radio value="AnsiX923">{t("tools.hash.ansiX923")}</Radio>
                    <Radio value="Iso10126">{t("tools.hash.iso10126")}</Radio>
                    <Radio value="NoPadding">{t("tools.hash.noPadding")}</Radio>
                  </RadioGroup>
                </div>

                <RadioGroup
                  orientation="horizontal"
                  value={aesFormat}
                  onValueChange={setAesFormat}
                  label={t("tools.hash.format")}
                  description={t("tools.hash.formatNote")}
                  size="sm"
                  className="text-tiny"
                >
                  <Radio value="Base64">Base64</Radio>
                  <Radio value="Hex">Hex</Radio>
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
          <Button isIconOnly variant="light" color="danger" onPress={() => { setAesInput(""); setAesOutput(""); setAesKey(""); setAesIv(""); removeStoredItem(STORAGE_KEY); }} title={t("tools.hash.clearAll")}>
          <Trash2 className="w-4 h-4" />
          </Button>
      </div>

      <div className="relative group">
        <Textarea
          label={t("tools.hash.outputLabel")}
          readOnly
          minRows={4}
          variant="bordered"
          value={aesOutput}
          classNames={{
            inputWrapper: "bg-default-100/30 group-hover:bg-default-100/50 transition-colors font-mono text-tiny"
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
