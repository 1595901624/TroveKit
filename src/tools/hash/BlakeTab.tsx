import { useState, useEffect } from "react"
import { Textarea, Button, RadioGroup, Radio } from "@heroui/react"
import { Copy, Trash2, Hash } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLog } from "../../contexts/LogContext"
import { blake2b, blake2s } from "@noble/hashes/blake2"
import { blake3 } from "@noble/hashes/blake3"
import { getStoredItem, setStoredItem, removeStoredItem } from "../../lib/store"

const STORAGE_KEY = "blake-tool-state"

export function BlakeTab() {
  const { t } = useTranslation()
  const { addLog } = useLog()

  const [blakeInput, setBlakeInput] = useState("")
  const [blakeOutput, setBlakeOutput] = useState("")
  const [blakeType, setBlakeType] = useState("BLAKE2b-512") // "BLAKE2b-512" | "BLAKE2s-256" | "BLAKE3-256"
  const [blakeCase, setBlakeCase] = useState("lower") // "lower" | "upper"
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    let mounted = true;
    getStoredItem(STORAGE_KEY).then((stored) => {
      if (mounted && stored) {
        try {
          const state = JSON.parse(stored);
          if (state.blakeInput) setBlakeInput(state.blakeInput);
          if (state.blakeOutput) setBlakeOutput(state.blakeOutput);
          if (state.blakeType) setBlakeType(state.blakeType);
          if (state.blakeCase) setBlakeCase(state.blakeCase);
        } catch (e) {
          console.error("Failed to parse BlakeTab state", e);
        }
      }
      if (mounted) setIsLoaded(true);
    });
    return () => { mounted = false; };
  }, []);

  const handleBlakeHash = () => {
    if (!blakeInput) return
    try {
      const inputBytes = new TextEncoder().encode(blakeInput)
      let hashBytes: Uint8Array

      switch (blakeType) {
        case "BLAKE2b-512":
          hashBytes = blake2b(inputBytes, { dkLen: 64 })  // 512 bits = 64 bytes
          break
        case "BLAKE2s-256":
          hashBytes = blake2s(inputBytes, { dkLen: 32 })  // 256 bits = 32 bytes
          break
        case "BLAKE3-256":
          hashBytes = blake3(inputBytes, { dkLen: 32 })   // 256 bits = 32 bytes
          break
        default:
          return
      }

      // Convert Uint8Array to hex string
      let hash = Array.from(hashBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

      if (blakeCase === "upper") {
        hash = hash.toUpperCase()
      }

      setBlakeOutput(hash)
      addLog({
        method: `${blakeType} (${blakeCase})`,
        input: blakeInput,
        output: hash
      }, "success")

    } catch (e) {
      addLog({ method: blakeType, input: blakeInput, output: (e as Error).message }, "error")
    }
  }

  const copyToClipboard = (text: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
  }

  // Keep the displayed hash output in sync with the selected case in real-time
  useEffect(() => {
    if (!blakeOutput) return
    const converted = blakeCase === "upper" ? blakeOutput.toUpperCase() : blakeOutput.toLowerCase()
    if (converted !== blakeOutput) {
      setBlakeOutput(converted)
    }
  }, [blakeCase, blakeOutput])

  useEffect(() => {
    if (isLoaded) {
      setStoredItem(STORAGE_KEY, JSON.stringify({
        blakeInput,
        blakeOutput,
        blakeType,
        blakeCase
      }))
    }
  }, [blakeInput, blakeOutput, blakeType, blakeCase, isLoaded])

  return (
    <div className="space-y-4">
      <Textarea
        label={t("tools.hash.inputLabel")}
        placeholder={t("tools.hash.inputPlaceholder")}
        minRows={6}
        variant="bordered"
        value={blakeInput}
        onValueChange={setBlakeInput}
        classNames={{
          inputWrapper: "bg-default-100/50 hover:bg-default-100 focus-within:bg-background"
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-4 py-2 px-1">
          <div className="flex items-center gap-6">
            <RadioGroup
              orientation="horizontal"
              value={blakeType}
              onValueChange={setBlakeType}
              label={t("tools.hash.algorithm")}
              size="sm"
              className="max-w-full"
            >
              <div className="flex flex-wrap gap-4">
                <Radio value="BLAKE2b-512">{t("tools.hash.blake2b512")}</Radio>
                <Radio value="BLAKE2s-256">{t("tools.hash.blake2s256")}</Radio>
                <Radio value="BLAKE3-256">{t("tools.hash.blake3256")}</Radio>
              </div>
            </RadioGroup>

            <RadioGroup
              orientation="horizontal"
              value={blakeCase}
              onValueChange={setBlakeCase}
              label={t("tools.hash.case")}
              size="sm"
            >
              <Radio value="lower">{t("tools.hash.lowercase")}</Radio>
              <Radio value="upper">{t("tools.hash.uppercase")}</Radio>
            </RadioGroup>
          </div>

          <div className="flex items-center gap-2">
            <Button color="primary" variant="flat" onPress={handleBlakeHash} startContent={<Hash className="w-4 h-4" />}>
              {t("tools.hash.generate")}
            </Button>
            <Button isIconOnly variant="light" color="danger" onPress={() => { setBlakeInput(""); setBlakeOutput(""); setBlakeType("BLAKE2b-512"); setBlakeCase("lower"); removeStoredItem(STORAGE_KEY); }} title={t("tools.hash.clearAll")}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
      </div>

      <div className="relative group">
        <Textarea
          label={t("tools.hash.outputLabel")}
          readOnly
          minRows={4}
          variant="bordered"
          value={blakeOutput}
          classNames={{
            inputWrapper: "bg-default-100/30 group-hover:bg-default-100/50 transition-colors font-mono text-tiny"
          }}
        />
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button isIconOnly size="sm" variant="flat" onPress={() => copyToClipboard(blakeOutput)}>
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
