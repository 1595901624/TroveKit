import { useState, useEffect } from "react"
import { Textarea, Button, Select, SelectItem } from "@heroui/react"
import { Copy, Trash2, Lock, Unlock, KeyRound } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLog } from "../../contexts/LogContext"
import JSEncrypt from "jsencrypt"
import { getStoredItem, setStoredItem, removeStoredItem } from "../../lib/store"

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

  const copyToClipboard = (text: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="space-y-4">
      <Textarea
        label={t("tools.hash.inputLabel", "Input Text")}
        placeholder={t("tools.hash.rsaInputPlaceholder", "Enter text...")}
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
                label={t("tools.hash.publicKey", "Public Key (Encryption)")}
                placeholder={t("tools.hash.publicKey", "Public Key (Encryption)")}
                value={publicKey}
                onValueChange={setPublicKey}
                minRows={4}
                classNames={{
                    input: "font-mono text-tiny"
                }}
              />
              <Textarea
                size="sm"
                label={t("tools.hash.privateKey", "Private Key (Decryption)")}
                placeholder={t("tools.hash.privateKey", "Private Key (Decryption)")}
                value={privateKey}
                onValueChange={setPrivateKey}
                minRows={4}
                classNames={{
                    input: "font-mono text-tiny"
                }}
              />
          </div>

          <div className="space-y-4">
                <div className="flex gap-4 items-center">
                    <Select 
                      size="sm" 
                      label={t("tools.hash.keySize")}
                      className="max-w-xs" 
                      selectedKeys={new Set([keySize])}
                      onSelectionChange={(keys) => setKeySize(Array.from(keys)[0] as string)}
                      disallowEmptySelection
                    >
                      <SelectItem key="512">{t("tools.hash.bit512")}</SelectItem>
                      <SelectItem key="1024">{t("tools.hash.bit1024")}</SelectItem>
                      <SelectItem key="2048">{t("tools.hash.bit2048")}</SelectItem>
                      <SelectItem key="4096">{t("tools.hash.bit4096")}</SelectItem>
                    </Select>
                    
                    <Button 
                        size="sm" 
                        color="success" 
                        variant="flat" 
                        onPress={handleGenerateKeys} 
                        isLoading={isGenerating}
                        startContent={!isGenerating && <KeyRound className="w-4 h-4" />}
                    >
                        {t("tools.hash.generateKeyPair", "Generate Key Pair")}
                    </Button>
                </div>
                
                <div className="text-tiny text-default-400 p-2">
                    {t("tools.hash.rsaNote", "Note: Generating large keys (2048+) may take a few seconds and freeze the UI temporarily.")}
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
