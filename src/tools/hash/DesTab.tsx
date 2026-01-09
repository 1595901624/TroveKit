import { useState, useEffect } from "react"
import { Textarea, Button, RadioGroup, Radio, Input, Select, SelectItem } from "@heroui/react"
import { Copy, Trash2, Lock, Unlock } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLog } from "../../contexts/LogContext"
import CryptoJS from "crypto-js"

const STORAGE_KEY = "des-tool-state"

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

export function DesTab() {
  const { t } = useTranslation()
  const { addLog } = useLog()

  const savedState = loadStateFromStorage()

  const [desInput, setDesInput] = useState(savedState.desInput || "")
  const [desOutput, setDesOutput] = useState(savedState.desOutput || "")
  const [desKey, setDesKey] = useState(savedState.desKey || "")
  const [desKeyType, setDesKeyType] = useState(savedState.desKeyType || "text") // "text" | "hex"
  const [desAlgorithm, setDesAlgorithm] = useState(savedState.desAlgorithm || "DES") // "DES" | "TripleDES"
  const [desIv, setDesIv] = useState(savedState.desIv || "")
  const [desIvType, setDesIvType] = useState(savedState.desIvType || "text") // "text" | "hex"
  const [desMode, setDesMode] = useState(savedState.desMode || "CBC") // CBC, ECB, OFB, CFB, CTR, CTS
  const [desPadding, setDesPadding] = useState(savedState.desPadding || "Pkcs7") // Pkcs7, ZeroPadding, NoPadding, AnsiX923, Iso10126
  const [desFormat, setDesFormat] = useState(savedState.desFormat || "Base64") // "Base64" | "Hex"

  useEffect(() => {
    saveStateToStorage({
      desInput,
      desOutput,
      desKey,
      desKeyType,
      desAlgorithm,
      desIv,
      desIvType,
      desMode,
      desPadding,
      desFormat
    })
  }, [desInput, desOutput, desKey, desKeyType, desAlgorithm, desIv, desIvType, desMode, desPadding, desFormat])

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

  const getAlgo = (algo: string) => {
      return algo === "TripleDES" ? CryptoJS.TripleDES : CryptoJS.DES;
  }

  const getKeySize = (algo: string) => {
      return algo === "TripleDES" ? 192 : 64;
  }

  const handleDesEncrypt = () => {
    if (!desInput) return;
    try {
      const keySize = getKeySize(desAlgorithm);
      const key = parseKeyIv(desKey, desKeyType, keySize);
      // IV is always 64-bit (8 bytes) for DES/3DES block size
      const iv = desMode === "ECB" ? undefined : parseKeyIv(desIv, desIvType, 64); 
      
      const cipher = getAlgo(desAlgorithm);
      const encrypted = cipher.encrypt(desInput, key, {
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
        method: `${desAlgorithm} Encrypt (${desMode}, ${desFormat})`,
        input: desInput,
        output: output,
        algorithm: desAlgorithm,
        mode: desMode,
        format: desFormat,
        key_type: desKeyType,
        iv: desIv,
        padding: desPadding
      }, "success");
    } catch (e) {
      addLog({ method: `${desAlgorithm} Encrypt`, input: desInput, output: (e as Error).message }, "error");
    }
  }

  const handleDesDecrypt = () => {
    if (!desInput) return;
    try {
      const keySize = getKeySize(desAlgorithm);
      const key = parseKeyIv(desKey, desKeyType, keySize);
      const iv = desMode === "ECB" ? undefined : parseKeyIv(desIv, desIvType, 64);
      
      let cipherParams;
      if (desFormat === "Hex") {
        cipherParams = { ciphertext: CryptoJS.enc.Hex.parse(desInput) };
      } else {
        cipherParams = { ciphertext: CryptoJS.enc.Base64.parse(desInput) };
      }

      const cipher = getAlgo(desAlgorithm);
      const decrypted = cipher.decrypt(cipherParams as any, key, {
        mode: getMode(desMode),
        padding: getPadding(desPadding),
        iv: iv
      });

      const output = decrypted.toString(CryptoJS.enc.Utf8);
      // if (!output) throw new Error("Decryption failed or invalid key/iv/mode");
      // Note: Sometimes empty string is valid, but usually it means failure if input was not empty.
      
      setDesOutput(output);
      addLog({
        method: `${desAlgorithm} Decrypt (${desMode}, ${desFormat})`,
        input: desInput,
        output: output,
        algorithm: desAlgorithm,
        mode: desMode,
        format: desFormat,
        key_type: desKeyType,
        iv: desIv,
        padding: desPadding
      }, "success");
    } catch (e) {
      addLog({ method: `${desAlgorithm} Decrypt`, input: desInput, output: (e as Error).message }, "error");
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
                      label={t("tools.hash.algorithm")}
                      className="w-40" 
                      selectedKeys={new Set([desAlgorithm])}
                      onSelectionChange={(keys) => setDesAlgorithm(Array.from(keys)[0] as string)}
                      disallowEmptySelection
                    >
                      <SelectItem key="DES">DES(64 Bit)</SelectItem>
                      <SelectItem key="TripleDES">3DES(192 Bit)</SelectItem>
                      {/* <SelectItem key="DES">{t("tools.hash.des")} ({t("tools.hash.bit64")})</SelectItem> */}
                      {/* <SelectItem key="TripleDES">{t("tools.hash.tripleDes")} ({t("tools.hash.bit192")})</SelectItem> */}
                    </Select>
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
                    <Radio value="CBC">{t("tools.hash.cbc", "CBC")}</Radio>
                    <Radio value="ECB">{t("tools.hash.ecb", "ECB")}</Radio>
                    <Radio value="CTR">{t("tools.hash.ctr", "CTR")}</Radio>
                    <Radio value="OFB">{t("tools.hash.ofb", "OFB")}</Radio>
                    <Radio value="CFB">{t("tools.hash.cfb", "CFB")}</Radio>
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
                    <Radio value="Pkcs7">{t("tools.hash.pkcs7", "PKCS7")}</Radio>
                    <Radio value="ZeroPadding">{t("tools.hash.zeroPadding", "Zeros")}</Radio>
                    <Radio value="AnsiX923">{t("tools.hash.ansiX923", "ANSI")}</Radio>
                    <Radio value="Iso10126">{t("tools.hash.iso10126", "ISO")}</Radio>
                    <Radio value="NoPadding">{t("tools.hash.noPadding", "None")}</Radio>
                  </RadioGroup>
                </div>

                <RadioGroup
                  orientation="horizontal"
                  value={desFormat}
                  onValueChange={setDesFormat}
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
          <Button color="primary" variant="flat" onPress={handleDesEncrypt} startContent={<Lock className="w-4 h-4" />}>
          {t("tools.hash.encrypt")}
          </Button>
          <Button color="secondary" variant="flat" onPress={handleDesDecrypt} startContent={<Unlock className="w-4 h-4" />}>
          {t("tools.hash.decrypt")}
          </Button>
          <Button isIconOnly variant="light" color="danger" onPress={() => { setDesInput(""); setDesOutput(""); setDesKey(""); setDesIv(""); localStorage.removeItem(STORAGE_KEY); }} title={t("tools.hash.clearAll")}>
          <Trash2 className="w-4 h-4" />
          </Button>
      </div>

      <div className="relative group">
        <Textarea
          label={t("tools.hash.outputLabel", "Output")}
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
