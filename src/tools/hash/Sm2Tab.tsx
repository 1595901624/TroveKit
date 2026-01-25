import { useState, useEffect } from "react"
import { Textarea, Button, RadioGroup, Radio, Input } from "@heroui/react"
import { Copy, Trash2, Lock, Unlock, KeyRound } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLog } from "../../contexts/LogContext"
// @ts-ignore
import { CipherMode, sm2 } from "sm-crypto"
import { getStoredItem, setStoredItem, removeStoredItem } from "../../lib/store"

const STORAGE_KEY = "sm2-tool-state"

export function Sm2Tab() {
  const { t } = useTranslation()
  const { addLog } = useLog()

  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")
  const [publicKey, setPublicKey] = useState("")
  const [privateKey, setPrivateKey] = useState("")
  const [mode, setMode] = useState("1") // 1: C1C3C2 (default in standard, but library might use 0/1 differently)
  // sm-crypto: cipherMode: 1 - C1C3C2, 0 - C1C2C3. 
  // Wait, commonly 1 is C1C3C2 (GM standard) in sm-crypto docs.
  // Let's verify documentation or comments.
  // Actually, sm-crypto docs say: cipherMode 1 - C1C3C2 (default), 0 - C1C2C3
  
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    let mounted = true;
    getStoredItem(STORAGE_KEY).then((stored) => {
      if (mounted && stored) {
        try {
          const state = JSON.parse(stored);
          if (state.input) setInput(state.input);
          if (state.output) setOutput(state.output);
          if (state.publicKey) setPublicKey(state.publicKey);
          if (state.privateKey) setPrivateKey(state.privateKey);
          if (state.mode) setMode(state.mode);
        } catch (e) {
          console.error("Failed to parse Sm2Tab state", e);
        }
      }
      if (mounted) setIsLoaded(true);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (isLoaded) {
      setStoredItem(STORAGE_KEY, JSON.stringify({
        input,
        output,
        publicKey,
        privateKey,
        mode
      }))
    }
  }, [input, output, publicKey, privateKey, mode, isLoaded])

  const handleGenerateKeys = () => {
    try {
      const keypair = sm2.generateKeyPairHex()
      setPublicKey(keypair.publicKey)
      setPrivateKey(keypair.privateKey)
      addLog({
        method: t("tools.hash.sm2GenerateKeyPair", "SM2 Generate KeyPair"),
        input: t("tools.hash.generate", "Generate"),
        output: t("common.success", "Success"),
        cryptoParams: {
            publicKey: keypair.publicKey,
            privateKey: keypair.privateKey
        }
      }, "success")
    } catch (e) {
      addLog({ method: t("tools.hash.sm2GenerateKeyPair", "SM2 Generate KeyPair"), input: t("tools.hash.generate", "Generate"), output: (e as Error).message }, "error")
    }
  }

  const handleEncrypt = () => {
    if (!input || !publicKey) return;
    try {
      // sm2.doEncrypt(msgString, publicKey, cipherMode)
      // cipherMode: 1 - C1C3C2, 0 - C1C2C3
      const cipherMode = parseInt(mode) as CipherMode
      const encrypted = sm2.doEncrypt(input, publicKey, cipherMode)
      // encrypted is hex string usually '04' + ...
      
      setOutput(encrypted)
      const modeStr = mode === "1" ? t("tools.hash.c1c3c2", "C1C3C2 (Standard)") : t("tools.hash.c1c2c3", "C1C2C3 (Old)")
      addLog({
        method: t("tools.hash.sm2Encrypt", { mode: modeStr }),
        input: input,
        output: encrypted,
        cryptoParams: {
          algorithm: "SM2",
          mode: modeStr,
          publicKey: publicKey
        }
      }, "success")
    } catch (e) {
        // @ts-ignore
      addLog({ method: t("tools.hash.sm2EncryptMethod", "SM2 Encrypt"), input: input, output: e.message || e }, "error")
    }
  }

  const handleDecrypt = () => {
    if (!input || !privateKey) return;
    try {
      // sm2.doDecrypt(encryptData, privateKey, cipherMode)
      const cipherMode = parseInt(mode) as CipherMode
      const decrypted = sm2.doDecrypt(input, privateKey, cipherMode)
      
      if (!decrypted) throw new Error(t("tools.hash.decryptionFailed", "Decryption failed"))

      setOutput(decrypted)
      const modeStr = mode === "1" ? t("tools.hash.c1c3c2", "C1C3C2 (Standard)") : t("tools.hash.c1c2c3", "C1C2C3 (Old)")
      addLog({
        method: t("tools.hash.sm2Decrypt", { mode: modeStr }),
        input: input,
        output: decrypted,
        cryptoParams: {
          algorithm: "SM2",
          mode: modeStr,
          privateKey: privateKey
        }
      }, "success")
    } catch (e) {
        // @ts-ignore
      addLog({ method: t("tools.hash.sm2DecryptMethod", "SM2 Decrypt"), input: input, output: e.message || e }, "error")
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
        placeholder={t("tools.hash.aesInputPlaceholder", "Enter text...")}
        minRows={4}
        variant="bordered"
        value={input}
        onValueChange={setInput}
        classNames={{
          inputWrapper: "bg-default-100/50 hover:bg-default-100 focus-within:bg-background"
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-2 bg-default-50 rounded-lg">
          <div className="space-y-4">
              <Textarea
                size="sm"
                label={t("tools.hash.publicKey", "Public Key")}
                placeholder={t("tools.hash.publicKey", "Public Key")}
                value={publicKey}
                onValueChange={setPublicKey}
                minRows={2}
              />
              <Textarea
                size="sm"
                label={t("tools.hash.privateKey", "Private Key")}
                placeholder={t("tools.hash.privateKey", "Private Key")}
                value={privateKey}
                onValueChange={setPrivateKey}
                minRows={2}
              />
          </div>

          <div className="space-y-4">
                <div className="flex gap-4">
                  <RadioGroup
                    orientation="horizontal"
                    value={mode}
                    onValueChange={setMode}
                    label={t("tools.hash.cipherMode", "Cipher Mode")}
                    size="sm"
                    className="text-tiny"
                  >
                    <Radio value="1">{t("tools.hash.c1c3c2", "C1C3C2 (Standard)")}</Radio>
                    <Radio value="0">{t("tools.hash.c1c2c3", "C1C2C3 (Old)")}</Radio>
                  </RadioGroup>
                </div>

                <div className="flex flex-col gap-2">
                    <Button size="sm" color="success" variant="flat" onPress={handleGenerateKeys} startContent={<KeyRound className="w-4 h-4" />}>
                        {t("tools.hash.generateKeyPair", "Generate Key Pair")}
                    </Button>
                </div>
          </div>
      </div>

      <div className="flex items-center gap-2 justify-end">
          <Button color="primary" variant="flat" onPress={handleEncrypt} startContent={<Lock className="w-4 h-4" />}>
          {t("tools.hash.encrypt")}
          </Button>
          <Button color="secondary" variant="flat" onPress={handleDecrypt} startContent={<Unlock className="w-4 h-4" />}>
          {t("tools.hash.decrypt")}
          </Button>
          <Button isIconOnly variant="light" color="danger" onPress={() => { setInput(""); setOutput(""); setPublicKey(""); setPrivateKey(""); removeStoredItem(STORAGE_KEY); }} title={t("tools.hash.clearAll")}>
          <Trash2 className="w-4 h-4" />
          </Button>
      </div>

      <div className="relative group">
        <Textarea
          label={t("tools.hash.outputLabel", "Output")}
          readOnly
          minRows={4}
          variant="bordered"
          value={output}
          classNames={{
            inputWrapper: "bg-default-100/30 group-hover:bg-default-100/50 transition-colors font-mono text-tiny"
          }}
        />
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button isIconOnly size="sm" variant="flat" onPress={() => copyToClipboard(output)}>
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
