import { useState, useEffect } from "react"
import { Textarea, Button, Select, SelectItem } from "../../components/ui/base-ui"
import { Lock, Unlock, KeyRound } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLog } from "../../contexts/LogContext"
import JSEncrypt from "jsencrypt"
import { getStoredItem, setStoredItem, removeStoredItem } from "../../lib/store"
import { HashWorkbench } from "./HashWorkbench"

const STORAGE_KEY = "rsa-tool-state"

export function RsaTab() {
  const { t } = useTranslation()
  const { addLog } = useLog()

  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")
  const [publicKey, setPublicKey] = useState("")
  const [privateKey, setPrivateKey] = useState("")
  const [keySize, setKeySize] = useState("1024")
  
  const [isLoaded, setIsLoaded] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

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
          if (state.keySize) setKeySize(state.keySize);
        } catch (e) {
          console.error("Failed to parse RsaTab state", e);
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
        keySize
      }))
    }
  }, [input, output, publicKey, privateKey, keySize, isLoaded])

  const handleGenerateKeys = async () => {
    setIsGenerating(true)
    // Use setTimeout to allow UI to update (show loading state) before heavy calculation
    setTimeout(() => {
        try {
            const currentKeySize = parseInt(keySize)
            const crypt = new JSEncrypt({ default_key_size: currentKeySize.toString() });
            crypt.getKey(); // This generates the key
            
            const pub = crypt.getPublicKey();
            const priv = crypt.getPrivateKey();
            
            setPublicKey(pub);
            setPrivateKey(priv);
            
            addLog({
                method: t("tools.hash.rsaGenerateKeyPair"),
                input: `${t("tools.hash.keySize")}: ${keySize}`,
                output: t("common.success"),
                cryptoParams: {
                    publicKey: pub,
                    privateKey: priv,
                    keySize: keySize
                }
            }, "success")
        } catch (e) {
            addLog({ method: t("tools.hash.rsaGenerateKeyPair"), input: `${t("tools.hash.keySize")}: ${keySize}`, output: (e as Error).message }, "error")
        } finally {
            setIsGenerating(false)
        }
    }, 100)
  }

  const handleEncrypt = () => {
    if (!input || !publicKey) return;
    try {
      const crypt = new JSEncrypt();
      crypt.setPublicKey(publicKey);
      const encrypted = crypt.encrypt(input);
      
      if (!encrypted) throw new Error(t("tools.hash.encryptionFailed"));
      
      setOutput(encrypted);
      addLog({
        method: t("tools.hash.rsaEncrypt"),
        input: input,
        output: encrypted,
        cryptoParams: {
          algorithm: "RSA",
          publicKey: publicKey
        }
      }, "success")
    } catch (e) {
      addLog({ method: t("tools.hash.rsaEncrypt"), input: input, output: (e as Error).message || "Error" }, "error")
    }
  }

  const handleDecrypt = () => {
    if (!input || !privateKey) return;
    try {
      const crypt = new JSEncrypt();
      crypt.setPrivateKey(privateKey);
      const decrypted = crypt.decrypt(input);
      
      if (!decrypted) throw new Error(t("tools.hash.decryptionFailed"));

      setOutput(decrypted);
      addLog({
        method: t("tools.hash.rsaDecrypt"),
        input: input,
        output: decrypted,
        cryptoParams: {
          algorithm: "RSA",
          privateKey: privateKey
        }
      }, "success")
    } catch (e) {
      addLog({ method: t("tools.hash.rsaDecrypt"), input: input, output: (e as Error).message || "Error" }, "error")
    }
  }

  return (
    <HashWorkbench
      id="rsa"
      input={input}
      onInputChange={setInput}
      inputPlaceholder={t("tools.hash.rsaInputPlaceholder", "Enter text...")}
      output={output}
      onClear={() => { setInput(""); setOutput(""); setPublicKey(""); setPrivateKey(""); removeStoredItem(STORAGE_KEY) }}
      toolbarContent={(
        <>
          <Select aria-label={t("tools.hash.keySize")} className="w-28" classNames={{ trigger: "h-8 bg-background px-2.5 text-xs" }} selectedKeys={[keySize]} onChange={(event) => setKeySize(event.target.value)}><SelectItem key="512">{t("tools.hash.bit512")}</SelectItem><SelectItem key="1024">{t("tools.hash.bit1024")}</SelectItem><SelectItem key="2048">{t("tools.hash.bit2048")}</SelectItem><SelectItem key="4096">{t("tools.hash.bit4096")}</SelectItem></Select>
          <Button size="sm" variant="flat" className="h-8" onPress={handleGenerateKeys} isLoading={isGenerating} startContent={!isGenerating && <KeyRound className="h-4 w-4" />}>{t("tools.hash.generateKeyPair", "Generate Key Pair")}</Button>
          <span className="hidden truncate text-[11px] text-default-400 xl:inline">{t("tools.hash.rsaNote", "Generating large keys may take a few seconds.")}</span>
        </>
      )}
      configContent={(
        <div className="grid gap-2 md:grid-cols-2">
          <Textarea aria-label={t("tools.hash.publicKey")} placeholder={t("tools.hash.publicKey")} value={publicKey} onValueChange={setPublicKey} minRows={2} classNames={{ inputWrapper: "h-20 min-h-20 bg-background p-2.5", input: "min-h-0 overflow-auto font-mono text-[10px] leading-4" }} />
          <Textarea aria-label={t("tools.hash.privateKey")} placeholder={t("tools.hash.privateKey")} value={privateKey} onValueChange={setPrivateKey} minRows={2} classNames={{ inputWrapper: "h-20 min-h-20 bg-background p-2.5", input: "min-h-0 overflow-auto font-mono text-[10px] leading-4" }} />
        </div>
      )}
      actions={<><Button size="sm" color="primary" onPress={handleEncrypt} isDisabled={!input} startContent={<Lock className="h-4 w-4" />}>{t("tools.hash.encrypt")}</Button><Button size="sm" variant="flat" onPress={handleDecrypt} isDisabled={!input} startContent={<Unlock className="h-4 w-4" />}>{t("tools.hash.decrypt")}</Button></>}
    />
  )
}
