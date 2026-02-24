import { useState, useEffect } from "react"
import { Textarea, Button, RadioGroup, Radio, Input, Select, SelectItem } from "@heroui/react"
import { Copy, Trash2, Lock, Unlock } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLog } from "../../contexts/LogContext"
import CryptoJS from "crypto-js"
import { getStoredItem, setStoredItem, removeStoredItem } from "../../lib/store"

const STORAGE_KEY = "triple-des-tool-state"

export function TripleDesTab() {
  const { t } = useTranslation()
  const { addLog } = useLog()

  const [desInput, setDesInput] = useState("")
  const [desOutput, setDesOutput] = useState("")
  const [desKey, setDesKey] = useState("")
  const [desKeyType, setDesKeyType] = useState("text") // "text" | "hex"
  const [desIv, setDesIv] = useState("")
  const [desIvType, setDesIvType] = useState("text") // "text" | "hex"
  const [desMode, setDesMode] = useState("CBC") // CBC, ECB, OFB, CFB, CTR
  const [desPadding, setDesPadding] = useState("Pkcs7") // Pkcs7, ZeroPadding, NoPadding, AnsiX923, Iso10126
  const [desFormat, setDesFormat] = useState("Base64") // "Base64" | "Hex"
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    let mounted = true;
    getStoredItem(STORAGE_KEY).then((stored) => {
      if (mounted && stored) {
        try {
          const state = JSON.parse(stored);
          if (state.desInput) setDesInput(state.desInput);
          if (state.desOutput) setDesOutput(state.desOutput);
          if (state.desKey) setDesKey(state.desKey);
          if (state.desKeyType) setDesKeyType(state.desKeyType);
          if (state.desIv) setDesIv(state.desIv);
          if (state.desIvType) setDesIvType(state.desIvType);
          if (state.desMode) setDesMode(state.desMode);
          if (state.desPadding) setDesPadding(state.desPadding);
          if (state.desFormat) setDesFormat(state.desFormat);
        } catch (e) {
          console.error("Failed to parse TripleDesTab state", e);
        }
      }
      if (mounted) setIsLoaded(true);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (isLoaded) {
      setStoredItem(STORAGE_KEY, JSON.stringify({
        desInput,
        desOutput,
        desKey,
        desKeyType,
        desIv,
        desIvType,
        desMode,
        desPadding,
        desFormat
      }))
    }
  }, [desInput, desOutput, desKey, desKeyType, desIv, desIvType, desMode, desPadding, desFormat, isLoaded])

  const parseKeyIv = (value: string, type: string, lengthBits?: number) => {
    let wordArr;
    if (type === "hex") {
      wordArr = CryptoJS.enc.Hex.parse(value);
    } else {
      wordArr = CryptoJS.enc.Utf8.parse(value);
    }

    if (lengthBits) {
      const targetBytes = lengthBits / 8;
      let hex = CryptoJS.enc.Hex.stringify(wordArr);
      const targetHexChars = targetBytes * 2;

      if (hex.length < targetHexChars) {
        hex = hex.padEnd(targetHexChars, "0");
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

  const handleEncrypt = () => {
    if (!desInput) return;
    try {
      const key = parseKeyIv(desKey, desKeyType, 192);
      const iv = desMode === "ECB" ? undefined : parseKeyIv(desIv, desIvType, 64);

      const encrypted = CryptoJS.TripleDES.encrypt(desInput, key, {
        mode: getMode(desMode),
        padding: getPadding(desPadding),
        iv: iv
      });

      let output = "";
      if (desFormat === "Hex") {
        output = encrypted.ciphertext.toString(CryptoJS.enc.Hex);
      } else {
        output = encrypted.ciphertext.toString(CryptoJS.enc.Base64);
      }

      setDesOutput(output);
      addLog({
        method: `3DES Encrypt (${desMode}, ${desFormat})`,
        input: desInput,
        output: output,
        cryptoParams: {
          algorithm: "TripleDES",
          mode: desMode,
          format: desFormat,
          key: desKey,
          key_type: desKeyType,
          iv: desIv,
          padding: desPadding
        }
      }, "success");
    } catch (e) {
      addLog({ method: "3DES Encrypt", input: desInput, output: (e as Error).message }, "error");
    }
  }

  const handleDecrypt = () => {
    if (!desInput) return;
    try {
      const key = parseKeyIv(desKey, desKeyType, 192);
      const iv = desMode === "ECB" ? undefined : parseKeyIv(desIv, desIvType, 64);

      let cipherParams;
      if (desFormat === "Hex") {
        cipherParams = { ciphertext: CryptoJS.enc.Hex.parse(desInput) };
      } else {
        cipherParams = { ciphertext: CryptoJS.enc.Base64.parse(desInput) };
      }

      const decrypted = CryptoJS.TripleDES.decrypt(cipherParams as any, key, {
        mode: getMode(desMode),
        padding: getPadding(desPadding),
        iv: iv
      });

      const output = decrypted.toString(CryptoJS.enc.Utf8);

      setDesOutput(output);
      addLog({
        method: `3DES Decrypt (${desMode}, ${desFormat})`,
        input: desInput,
        output: output,
        cryptoParams: {
          algorithm: "TripleDES",
          mode: desMode,
          format: desFormat,
          key: desKey,
          key_type: desKeyType,
          iv: desIv,
          padding: desPadding
        }
      }, "success");
    } catch (e) {
      addLog({ method: "3DES Decrypt", input: desInput, output: (e as Error).message }, "error");
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
        value={desInput}
        onValueChange={setDesInput}
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
              value={desKey}
              onValueChange={setDesKey}
              className="flex-1"
            />
            <Select
              size="sm"
              label={t("tools.hash.text")}
              className="w-24"
              selectedKeys={new Set([desKeyType])}
              onSelectionChange={(keys) => setDesKeyType(Array.from(keys)[0] as string)}
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
              placeholder={`${t("tools.hash.iv")} (${t("tools.hash.bit64")})`}
              value={desIv}
              onValueChange={setDesIv}
              isDisabled={desMode === "ECB"}
              className="flex-1"
            />
            <Select
              size="sm"
              label={t("tools.hash.text")}
              className="w-24"
              selectedKeys={new Set([desIvType])}
              onSelectionChange={(keys) => setDesIvType(Array.from(keys)[0] as string)}
              isDisabled={desMode === "ECB"}
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
              value={desMode}
              onValueChange={setDesMode}
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
              value={desPadding}
              onValueChange={setDesPadding}
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
            value={desFormat}
            onValueChange={setDesFormat}
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
        <Button color="primary" variant="flat" onPress={handleEncrypt} startContent={<Lock className="w-4 h-4" />}>
          {t("tools.hash.encrypt")}
        </Button>
        <Button color="secondary" variant="flat" onPress={handleDecrypt} startContent={<Unlock className="w-4 h-4" />}>
          {t("tools.hash.decrypt")}
        </Button>
        <Button isIconOnly variant="light" color="danger" onPress={() => { setDesInput(""); setDesOutput(""); setDesKey(""); setDesIv(""); removeStoredItem(STORAGE_KEY); }} title={t("tools.hash.clearAll")}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="relative group">
        <Textarea
          label={t("tools.hash.outputLabel")}
          readOnly
          minRows={4}
          variant="bordered"
          value={desOutput}
          classNames={{
            inputWrapper: "bg-default-100/30 group-hover:bg-default-100/50 transition-colors font-mono text-tiny"
          }}
        />
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button isIconOnly size="sm" variant="flat" onPress={() => copyToClipboard(desOutput)}>
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}