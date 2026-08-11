import { useState, useEffect } from "react"
import { Button, Input, Select, SelectItem } from "../../components/ui/base-ui"
import { Lock, Unlock } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLog } from "../../contexts/LogContext"
import CryptoJS from "crypto-js"
import { getStoredItem, setStoredItem, removeStoredItem } from "../../lib/store"
import { HashOperationSwitch, HashToolbarField, HashWorkbench } from "./HashWorkbench"

const STORAGE_KEY = "des-tool-state"

export function DesTab() {
  const { t } = useTranslation()
  const { addLog } = useLog()

  const [activeTab, setActiveTab] = useState<"encrypt" | "decrypt">("encrypt")
  const [operation, setOperation] = useState<"encrypt" | "decrypt">("encrypt")
  const [desInput, setDesInput] = useState("")
  const [desOutput, setDesOutput] = useState("")
  const [desKey, setDesKey] = useState("")
  const [desKeyType, setDesKeyType] = useState("text")
  const [desIv, setDesIv] = useState("")
  const [desIvType, setDesIvType] = useState("text")
  const [desMode, setDesMode] = useState("CBC")
  const [desPadding, setDesPadding] = useState("Pkcs7")
  const [desInputFormat, setDesInputFormat] = useState("String")
  const [desOutputFormat, setDesOutputFormat] = useState("Base64")
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (operation === "decrypt" && desInputFormat === "String") setDesInputFormat("Base64")
    if (operation === "encrypt" && desOutputFormat === "String") setDesOutputFormat("Base64")
  }, [operation, desInputFormat, desOutputFormat])

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
          if (state.desInputFormat) setDesInputFormat(state.desInputFormat);
          if (state.desOutputFormat) setDesOutputFormat(state.desOutputFormat);
          if (state.activeTab) {
            const tab = state.activeTab as "encrypt" | "decrypt";
            setActiveTab(tab);
            setOperation(tab);
          }
          if (state.desFormat && !state.desInputFormat && !state.desOutputFormat) {
            setDesInputFormat(state.desFormat);
            setDesOutputFormat(state.desFormat);
          }
        } catch (e) {
          console.error("Failed to parse DesTab state", e);
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
        desInputFormat,
        desOutputFormat,
        activeTab
      }))
    }
  }, [desInput, desOutput, desKey, desKeyType, desIv, desIvType, desMode, desPadding, desInputFormat, desOutputFormat, activeTab, isLoaded])

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

  const handleDesEncrypt = () => {
    if (!desInput) return;
    try {
      const inputData = parseInputData(desInput, desInputFormat)
      const key = parseKeyIv(desKey, desKeyType, 64);
      const iv = desMode === "ECB" ? undefined : parseKeyIv(desIv, desIvType, 64); 
      
      const encrypted = CryptoJS.DES.encrypt(inputData as any, key, {
        mode: getMode(desMode),
        padding: getPadding(desPadding),
        iv: iv
      });

      const output = encodeOutputData(encrypted.ciphertext, desOutputFormat)

      setDesOutput(output);
      addLog({
        method: `DES Encrypt (${desMode}, ${desInputFormat}->${desOutputFormat})`,
        input: desInput,
        output: output,
        cryptoParams: {
          algorithm: "DES",
          mode: desMode,
          input_format: desInputFormat,
          output_format: desOutputFormat,
          key: desKey,
          key_type: desKeyType,
          iv: desIv,
          padding: desPadding
        }
      }, "success");
    } catch (e) {
      addLog({ method: "DES Encrypt", input: desInput, output: (e as Error).message }, "error");
    }
  }

  const handleDesDecrypt = () => {
    if (!desInput) return;
    try {
      const key = parseKeyIv(desKey, desKeyType, 64);
      const iv = desMode === "ECB" ? undefined : parseKeyIv(desIv, desIvType, 64);
      const cipherParams = { ciphertext: parseInputData(desInput, desInputFormat) }

      const decrypted = CryptoJS.DES.decrypt(cipherParams as any, key, {
        mode: getMode(desMode),
        padding: getPadding(desPadding),
        iv: iv
      });

      let output = ""
      if (desOutputFormat === "String") {
        output = decrypted.toString(CryptoJS.enc.Utf8)
        if (decrypted.sigBytes > 0 && !output) throw new Error("Decryption failed or invalid key/iv/mode")
      } else {
        output = encodeOutputData(decrypted, desOutputFormat)
      }
      
      setDesOutput(output);
      addLog({
        method: `DES Decrypt (${desMode}, ${desInputFormat}->${desOutputFormat})`,
        input: desInput,
        output: output,
        cryptoParams: {
          algorithm: "DES",
          mode: desMode,
          input_format: desInputFormat,
          output_format: desOutputFormat,
          key: desKey,
          key_type: desKeyType,
          iv: desIv,
          padding: desPadding
        }
      }, "success");
    } catch (e) {
      addLog({ method: "DES Decrypt", input: desInput, output: (e as Error).message }, "error");
    }
  }

  const handleRun = () => {
    if (operation === "encrypt") handleDesEncrypt()
    else handleDesDecrypt()
  }

  return (
    <HashWorkbench
      id="des"
      input={desInput}
      onInputChange={setDesInput}
      inputPlaceholder={t("tools.hash.aesInputPlaceholder")}
      output={desOutput}
      onClear={() => { setDesInput(""); setDesOutput(""); setDesKey(""); setDesIv(""); removeStoredItem(STORAGE_KEY) }}
      toolbarContent={(
        <>
          <HashOperationSwitch
            ariaLabel="DES"
            value={activeTab}
            onChange={(selected) => { setActiveTab(selected); setOperation(selected) }}
            options={[{ value: "encrypt", label: t("tools.hash.encrypt") }, { value: "decrypt", label: t("tools.hash.decrypt") }]}
          />
          <HashToolbarField label={t("tools.hash.inputFormat")}>
            <Select aria-label={t("tools.hash.inputFormat")} className="w-28" classNames={{ trigger: "h-8 bg-background px-2.5 text-xs" }} selectedKeys={[desInputFormat]} onChange={(event) => setDesInputFormat(event.target.value)}><SelectItem key="String" isDisabled={operation !== "encrypt"}>{t("tools.hash.text")}</SelectItem><SelectItem key="Base64">Base64</SelectItem><SelectItem key="Hex">Hex</SelectItem></Select>
          </HashToolbarField>
          <span aria-hidden="true" className="text-sm text-default-400">→</span>
          <HashToolbarField label={t("tools.hash.outputFormat")}>
            <Select aria-label={t("tools.hash.outputFormat")} className="w-28" classNames={{ trigger: "h-8 bg-background px-2.5 text-xs" }} selectedKeys={[desOutputFormat]} onChange={(event) => setDesOutputFormat(event.target.value)}><SelectItem key="String" isDisabled={operation !== "decrypt"}>{t("tools.hash.text")}</SelectItem><SelectItem key="Base64">Base64</SelectItem><SelectItem key="Hex">Hex</SelectItem></Select>
          </HashToolbarField>
        </>
      )}
      configContent={(
        <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_104px_144px]">
          <div className="grid grid-cols-[minmax(0,1fr)_88px] gap-2"><Input size="sm" label={t("tools.hash.key")} placeholder={t("tools.hash.keyPlaceholder")} value={desKey} onValueChange={setDesKey} classNames={{ inputWrapper: "h-9 min-h-9 bg-background" }} /><Select size="sm" label={t("tools.hash.type")} selectedKeys={[desKeyType]} onChange={(event) => setDesKeyType(event.target.value)}><SelectItem key="text">{t("tools.hash.text")}</SelectItem><SelectItem key="hex">{t("tools.hash.hex")}</SelectItem></Select></div>
          <div className="grid grid-cols-[minmax(0,1fr)_88px] gap-2"><Input size="sm" label={t("tools.hash.iv")} placeholder={t("tools.hash.iv")} value={desIv} onValueChange={setDesIv} isDisabled={desMode === "ECB"} classNames={{ inputWrapper: "h-9 min-h-9 bg-background" }} /><Select size="sm" label={t("tools.hash.type")} selectedKeys={[desIvType]} onChange={(event) => setDesIvType(event.target.value)} isDisabled={desMode === "ECB"}><SelectItem key="text">{t("tools.hash.text")}</SelectItem><SelectItem key="hex">{t("tools.hash.hex")}</SelectItem></Select></div>
          <Select size="sm" label={t("tools.hash.mode")} selectedKeys={[desMode]} onChange={(event) => setDesMode(event.target.value)}>{['CBC', 'ECB', 'CTR', 'OFB', 'CFB'].map((mode) => <SelectItem key={mode}>{mode}</SelectItem>)}</Select>
          <Select size="sm" label={t("tools.hash.padding")} selectedKeys={[desPadding]} onChange={(event) => setDesPadding(event.target.value)}><SelectItem key="Pkcs7">{t("tools.hash.pkcs7")}</SelectItem><SelectItem key="ZeroPadding">{t("tools.hash.zeroPadding")}</SelectItem><SelectItem key="AnsiX923">{t("tools.hash.ansiX923")}</SelectItem><SelectItem key="Iso10126">{t("tools.hash.iso10126")}</SelectItem><SelectItem key="NoPadding">{t("tools.hash.noPadding")}</SelectItem></Select>
        </div>
      )}
      actions={<Button size="sm" color="primary" variant="solid" className="h-8 min-w-[88px]" onPress={handleRun} isDisabled={!desInput} startContent={operation === "encrypt" ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}>{operation === "encrypt" ? t("tools.hash.encrypt") : t("tools.hash.decrypt")}</Button>}
    />
  )
}
