import { useState, useEffect } from "react"
import { Button, Input, Select, SelectItem } from "../../components/ui/base-ui"
import { Lock, Unlock } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLogActions } from "../../contexts/LogContext"
import CryptoJS from "crypto-js"
import { getStoredItem, setStoredItem, removeStoredItem } from "../../lib/store"
import { HashToolbarField, HashWorkbench } from "./HashWorkbench"

const STORAGE_KEY = "triple-des-tool-state"

export function TripleDesTab() {
  const { t } = useTranslation()
  const { addLog } = useLogActions()

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

  return (
    <HashWorkbench
      id="triple-des"
      input={desInput}
      onInputChange={setDesInput}
      inputPlaceholder={t("tools.hash.aesInputPlaceholder")}
      output={desOutput}
      onClear={() => { setDesInput(""); setDesOutput(""); setDesKey(""); setDesIv(""); removeStoredItem(STORAGE_KEY) }}
      toolbarContent={(
        <>
          <HashToolbarField label={t("tools.hash.mode")}><Select aria-label={t("tools.hash.mode")} className="w-24" classNames={{ trigger: "h-8 bg-background px-2.5 text-xs" }} selectedKeys={[desMode]} onChange={(event) => setDesMode(event.target.value)}>
            {['CBC', 'ECB', 'CTR', 'OFB', 'CFB'].map((mode) => <SelectItem key={mode}>{mode}</SelectItem>)}
          </Select></HashToolbarField>
          <HashToolbarField label={t("tools.hash.padding")}><Select aria-label={t("tools.hash.padding")} className="w-36" classNames={{ trigger: "h-8 bg-background px-2.5 text-xs" }} selectedKeys={[desPadding]} onChange={(event) => setDesPadding(event.target.value)}>
            <SelectItem key="Pkcs7">{t("tools.hash.pkcs7")}</SelectItem><SelectItem key="ZeroPadding">{t("tools.hash.zeroPadding")}</SelectItem><SelectItem key="AnsiX923">{t("tools.hash.ansiX923")}</SelectItem><SelectItem key="Iso10126">{t("tools.hash.iso10126")}</SelectItem><SelectItem key="NoPadding">{t("tools.hash.noPadding")}</SelectItem>
          </Select></HashToolbarField>
          <HashToolbarField label={t("tools.hash.format")}><Select aria-label={t("tools.hash.format")} className="w-24" classNames={{ trigger: "h-8 bg-background px-2.5 text-xs" }} selectedKeys={[desFormat]} onChange={(event) => setDesFormat(event.target.value)}>
            <SelectItem key="Base64">Base64</SelectItem><SelectItem key="Hex">Hex</SelectItem>
          </Select></HashToolbarField>
        </>
      )}
      configContent={(
        <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr))]">
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_96px] gap-2"><Input size="sm" label={t("tools.hash.key")} placeholder="Key" value={desKey} onValueChange={setDesKey} className="min-w-0" classNames={{ inputWrapper: "h-9 min-h-9 bg-background" }} /><Select size="sm" label={t("tools.hash.keyType")} selectedKeys={[desKeyType]} onChange={(event) => setDesKeyType(event.target.value)}><SelectItem key="text">{t("tools.hash.text")}</SelectItem><SelectItem key="hex">{t("tools.hash.hex")}</SelectItem></Select></div>
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_96px] gap-2"><Input size="sm" label={t("tools.hash.iv")} placeholder={`${t("tools.hash.iv")} (${t("tools.hash.bit64")})`} value={desIv} onValueChange={setDesIv} isDisabled={desMode === "ECB"} className="min-w-0" classNames={{ inputWrapper: "h-9 min-h-9 bg-background" }} /><Select size="sm" label={t("tools.hash.keyType")} selectedKeys={[desIvType]} onChange={(event) => setDesIvType(event.target.value)} isDisabled={desMode === "ECB"}><SelectItem key="text">{t("tools.hash.text")}</SelectItem><SelectItem key="hex">{t("tools.hash.hex")}</SelectItem></Select></div>
        </div>
      )}
      actions={<><Button size="sm" color="primary" onPress={handleEncrypt} isDisabled={!desInput} startContent={<Lock className="h-4 w-4" />}>{t("tools.hash.encrypt")}</Button><Button size="sm" variant="flat" onPress={handleDecrypt} isDisabled={!desInput} startContent={<Unlock className="h-4 w-4" />}>{t("tools.hash.decrypt")}</Button></>}
    />
  )
}
