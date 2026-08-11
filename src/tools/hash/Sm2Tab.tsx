import { useState, useEffect } from "react"
import { Textarea, Button, RadioGroup, Radio } from "../../components/ui/base-ui"
import { Lock, Unlock, KeyRound } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLog } from "../../contexts/LogContext"
// @ts-ignore
import { CipherMode, sm2 } from "sm-crypto"
import { getStoredItem, setStoredItem, removeStoredItem } from "../../lib/store"
import { HashWorkbench } from "./HashWorkbench"

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
        method: t("tools.hash.sm2GenerateKeyPair"),
        input: t("tools.hash.generate"),
        output: t("common.success"),
        cryptoParams: {
            publicKey: keypair.publicKey,
            privateKey: keypair.privateKey
        }
      }, "success")
    } catch (e) {
      addLog({ method: t("tools.hash.sm2GenerateKeyPair"), input: t("tools.hash.generate"), output: (e as Error).message }, "error")
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
      const modeStr = mode === "1" ? t("tools.hash.c1c3c2") : t("tools.hash.c1c2c3")
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
      addLog({ method: t("tools.hash.sm2EncryptMethod"), input: input, output: e.message || e }, "error")
    }
  }

  const handleDecrypt = () => {
    if (!input || !privateKey) return;
    try {
      // sm2.doDecrypt(encryptData, privateKey, cipherMode)
      const cipherMode = parseInt(mode) as CipherMode
      const decrypted = sm2.doDecrypt(input, privateKey, cipherMode)
      
      if (!decrypted) throw new Error(t("tools.hash.decryptionFailed"))

      setOutput(decrypted)
      const modeStr = mode === "1" ? t("tools.hash.c1c3c2") : t("tools.hash.c1c2c3")
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
      addLog({ method: t("tools.hash.sm2DecryptMethod"), input: input, output: e.message || e }, "error")
    }
  }

  return (
    <HashWorkbench
      id="sm2"
      input={input}
      onInputChange={setInput}
      inputPlaceholder={t("tools.hash.aesInputPlaceholder")}
      output={output}
      onClear={() => { setInput(""); setOutput(""); setPublicKey(""); setPrivateKey(""); removeStoredItem(STORAGE_KEY) }}
      toolbarContent={<><RadioGroup orientation="horizontal" value={mode} onValueChange={setMode} label={t("tools.hash.cipherMode")} size="sm"><Radio value="1">{t("tools.hash.c1c3c2")}</Radio><Radio value="0">{t("tools.hash.c1c2c3")}</Radio></RadioGroup><Button size="sm" variant="flat" className="h-8" onPress={handleGenerateKeys} startContent={<KeyRound className="h-4 w-4" />}>{t("tools.hash.generateKeyPair")}</Button></>}
      configContent={<div className="grid gap-2 md:grid-cols-2"><Textarea aria-label={t("tools.hash.publicKey")} placeholder={t("tools.hash.publicKey")} value={publicKey} onValueChange={setPublicKey} minRows={2} classNames={{ inputWrapper: "h-20 min-h-20 bg-background p-2.5", input: "min-h-0 overflow-auto font-mono text-[10px] leading-4" }} /><Textarea aria-label={t("tools.hash.privateKey")} placeholder={t("tools.hash.privateKey")} value={privateKey} onValueChange={setPrivateKey} minRows={2} classNames={{ inputWrapper: "h-20 min-h-20 bg-background p-2.5", input: "min-h-0 overflow-auto font-mono text-[10px] leading-4" }} /></div>}
      actions={<><Button size="sm" color="primary" onPress={handleEncrypt} isDisabled={!input} startContent={<Lock className="h-4 w-4" />}>{t("tools.hash.encrypt")}</Button><Button size="sm" variant="flat" onPress={handleDecrypt} isDisabled={!input} startContent={<Unlock className="h-4 w-4" />}>{t("tools.hash.decrypt")}</Button></>}
    />
  )
}
