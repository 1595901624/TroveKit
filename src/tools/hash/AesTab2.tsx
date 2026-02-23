import { useState, useEffect } from "react"
import { Textarea, Button, Input, Select, SelectItem, Tabs, Tab, Card, CardBody, CardHeader } from "@heroui/react"
import { Copy, Trash2, Lock, Unlock } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLog } from "../../contexts/LogContext"
import CryptoJS from "crypto-js"
import { getStoredItem, setStoredItem, removeStoredItem } from "../../lib/store"

const STORAGE_KEY = "aes-tool-state"

export function AesTab2() {
  const { t } = useTranslation()
  const { addLog } = useLog()

  const [operation, setOperation] = useState<"encrypt" | "decrypt">("encrypt")
  const [aesInput, setAesInput] = useState("")
  const [aesOutput, setAesOutput] = useState("")
  const [aesKey, setAesKey] = useState("")
  const [aesKeyType, setAesKeyType] = useState("text") 
  const [aesKeySize, setAesKeySize] = useState("128") 
  const [aesIv, setAesIv] = useState("")
  const [aesIvType, setAesIvType] = useState("text") 
  const [aesMode, setAesMode] = useState("CBC") 
  const [aesPadding, setAesPadding] = useState("Pkcs7") 
  const [aesInputFormat, setAesInputFormat] = useState("String")
  const [aesOutputFormat, setAesOutputFormat] = useState("Base64")
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (operation === "decrypt" && aesInputFormat === "String") setAesInputFormat("Base64")
    if (operation === "encrypt" && aesOutputFormat === "String") setAesOutputFormat("Base64")
  }, [operation, aesInputFormat, aesOutputFormat])

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
          if (state.aesInputFormat) setAesInputFormat(state.aesInputFormat);
          if (state.aesOutputFormat) setAesOutputFormat(state.aesOutputFormat);
          if (state.aesFormat && !state.aesInputFormat && !state.aesOutputFormat) {
            setAesInputFormat(state.aesFormat);
            setAesOutputFormat(state.aesFormat);
          }
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
        aesInputFormat,
        aesOutputFormat
      }))
    }
  }, [aesInput, aesOutput, aesKey, aesKeyType, aesKeySize, aesIv, aesIvType, aesMode, aesPadding, aesInputFormat, aesOutputFormat, isLoaded])

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

  const parseInputData = (value: string, format: string) => {
    switch (format) {
      case "Hex":
        return CryptoJS.enc.Hex.parse(value)
      case "Base64":
        return CryptoJS.enc.Base64.parse(value)
      default:
        return CryptoJS.enc.Utf8.parse(value)
    }
  }

  const encodeOutputData = (data: CryptoJS.lib.WordArray, format: string) => {
    if (format === "String") return data.toString(CryptoJS.enc.Utf8)
    if (format === "Hex") return data.toString(CryptoJS.enc.Hex)
    return data.toString(CryptoJS.enc.Base64)
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
      const inputData = parseInputData(aesInput, aesInputFormat)
      const key = parseKeyIv(aesKey, aesKeyType, parseInt(aesKeySize));
      // IV is always 128-bit (16 bytes) for AES block size, regardless of key size
      // Except ECB which doesn't use IV, but passing it doesn't hurt usually, though we can skip it.
      const iv = aesMode === "ECB" ? undefined : parseKeyIv(aesIv, aesIvType, 128); 
      
      const encrypted = CryptoJS.AES.encrypt(inputData, key, {
        mode: getMode(aesMode),
        padding: getPadding(aesPadding),
        iv: iv
      });

      const output = encodeOutputData(encrypted.ciphertext, aesOutputFormat)

      setAesOutput(output);
      addLog({
        method: `AES Encrypt (${aesMode}, ${aesKeySize}-bit, ${aesInputFormat}→${aesOutputFormat})`,
        input: aesInput,
        output: output,
        cryptoParams: {
          algorithm: "AES",
          mode: aesMode,
          key_size: `${aesKeySize}-bit`,
          input_format: aesInputFormat,
          output_format: aesOutputFormat,
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
      
      const cipherParams = { ciphertext: parseInputData(aesInput, aesInputFormat) }

      const decrypted = CryptoJS.AES.decrypt(cipherParams as any, key, {
        mode: getMode(aesMode),
        padding: getPadding(aesPadding),
        iv: iv
      });

      let output = ""
      if (aesOutputFormat === "String") {
        output = decrypted.toString(CryptoJS.enc.Utf8)
        if (decrypted.sigBytes > 0 && !output) throw new Error("Decryption failed or invalid key/iv/mode")
      } else {
        output = encodeOutputData(decrypted, aesOutputFormat)
      }

      setAesOutput(output);
      addLog({
        method: `AES Decrypt (${aesMode}, ${aesKeySize}-bit, ${aesInputFormat}→${aesOutputFormat})`,
        input: aesInput,
        output: output,
        cryptoParams: {
          algorithm: "AES",
          mode: aesMode,
          key_size: `${aesKeySize}-bit`,
          input_format: aesInputFormat,
          output_format: aesOutputFormat,
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

  const handleRun = () => {
    if (operation === "encrypt") handleAesEncrypt()
    else handleAesDecrypt()
  }

  return (
    <div className="space-y-4">
      <Tabs
        aria-label="AES"
        color="primary"
        selectedKey={operation}
        onSelectionChange={(k) => setOperation(k as "encrypt" | "decrypt")}
        className="w-full"
      >
        <Tab key="encrypt" title={t("tools.hash.encrypt")} />
        <Tab key="decrypt" title={t("tools.hash.decrypt")} />
      </Tabs>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="shadow-none border border-divider/50">
          <CardHeader className="flex gap-2 items-center justify-between">
            <div className="text-sm font-medium">{t("tools.hash.inputLabel")}</div>
            <div className="flex items-center gap-2">
              <Select
                size="sm"
                label={t("tools.hash.inputFormat")}
                className="w-40"
                selectedKeys={new Set([aesInputFormat])}
                onSelectionChange={(keys) => setAesInputFormat(Array.from(keys)[0] as string)}
                disallowEmptySelection
              >
                <SelectItem key="String" isDisabled={operation !== "encrypt"}>{t("tools.hash.text")}</SelectItem>
                <SelectItem key="Base64">Base64</SelectItem>
                <SelectItem key="Hex">Hex</SelectItem>
              </Select>
              <Button
                isIconOnly
                size="sm"
                variant="flat"
                color="danger"
                onPress={() => setAesInput("")}
                title={t("tools.hash.clear")}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardBody className="pt-0">
            <Textarea
              placeholder={t("tools.hash.aesInputPlaceholder")}
              minRows={8}
              variant="bordered"
              value={aesInput}
              onValueChange={setAesInput}
              classNames={{
                inputWrapper: "bg-default-100/50 hover:bg-default-100 focus-within:bg-background"
              }}
            />
          </CardBody>
        </Card>

        <Card className="shadow-none border border-divider/50">
          <CardHeader className="flex gap-2 items-center justify-between">
            <div className="text-sm font-medium">{t("tools.hash.outputLabel")}</div>
            <div className="flex items-center gap-2">
              <Select
                size="sm"
                label={t("tools.hash.outputFormat")}
                className="w-40"
                selectedKeys={new Set([aesOutputFormat])}
                onSelectionChange={(keys) => setAesOutputFormat(Array.from(keys)[0] as string)}
                disallowEmptySelection
              >
                <SelectItem key="String" isDisabled={operation !== "decrypt"}>{t("tools.hash.text")}</SelectItem>
                <SelectItem key="Base64">Base64</SelectItem>
                <SelectItem key="Hex">Hex</SelectItem>
              </Select>
              <Button isIconOnly size="sm" variant="flat" onPress={() => copyToClipboard(aesOutput)} title={t("tools.hash.copy")}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardBody className="pt-0">
            <Textarea
              readOnly
              minRows={8}
              variant="bordered"
              value={aesOutput}
              classNames={{
                inputWrapper: "bg-default-100/30 transition-colors font-mono text-tiny"
              }}
            />
          </CardBody>
        </Card>
      </div>

      <div className="p-3 bg-default-50 rounded-lg">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                size="sm"
                label={t("tools.hash.key")}
                placeholder={t("tools.hash.keyPlaceholder")}
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
                label={t("tools.hash.type")}
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
                placeholder={t("tools.hash.iv")}
                value={aesIv}
                onValueChange={setAesIv}
                isDisabled={aesMode === "ECB"}
                className="flex-1"
              />
              <Select
                size="sm"
                label={t("tools.hash.type")}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Select
              size="sm"
              label={t("tools.hash.mode")}
              selectedKeys={new Set([aesMode])}
              onSelectionChange={(keys) => setAesMode(Array.from(keys)[0] as string)}
              disallowEmptySelection
            >
              <SelectItem key="CBC">{t("tools.hash.cbc")}</SelectItem>
              <SelectItem key="ECB">{t("tools.hash.ecb")}</SelectItem>
              <SelectItem key="CTR">{t("tools.hash.ctr")}</SelectItem>
              <SelectItem key="OFB">{t("tools.hash.ofb")}</SelectItem>
              <SelectItem key="CFB">{t("tools.hash.cfb")}</SelectItem>
            </Select>

            <Select
              size="sm"
              label={t("tools.hash.padding")}
              selectedKeys={new Set([aesPadding])}
              onSelectionChange={(keys) => setAesPadding(Array.from(keys)[0] as string)}
              disallowEmptySelection
            >
              <SelectItem key="Pkcs7">{t("tools.hash.pkcs7")}</SelectItem>
              <SelectItem key="ZeroPadding">{t("tools.hash.zeroPadding")}</SelectItem>
              <SelectItem key="AnsiX923">{t("tools.hash.ansiX923")}</SelectItem>
              <SelectItem key="Iso10126">{t("tools.hash.iso10126")}</SelectItem>
              <SelectItem key="NoPadding">{t("tools.hash.noPadding")}</SelectItem>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 justify-end">
        <Button
          color={operation === "encrypt" ? "primary" : "secondary"}
          variant="flat"
          onPress={handleRun}
          startContent={operation === "encrypt" ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
        >
          {operation === "encrypt" ? t("tools.hash.encrypt") : t("tools.hash.decrypt")}
        </Button>
        <Button
          isIconOnly
          variant="light"
          color="danger"
          onPress={() => {
            setAesInput("")
            setAesOutput("")
            setAesKey("")
            setAesIv("")
            removeStoredItem(STORAGE_KEY)
          }}
          title={t("tools.hash.clearAll")}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
