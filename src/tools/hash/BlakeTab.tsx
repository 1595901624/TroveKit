import { useState, useEffect } from "react"
import { Button, RadioGroup, Radio, Select, SelectItem } from "../../components/ui/base-ui"
import { Hash } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLogActions } from "../../contexts/LogContext"
import { blake2b, blake2s } from "@noble/hashes/blake2"
import { blake3 } from "@noble/hashes/blake3"
import { getStoredItem, setStoredItem, removeStoredItem } from "../../lib/store"
import { HashToolbarField, HashWorkbench } from "./HashWorkbench"

const STORAGE_KEY = "blake-tool-state"

export function BlakeTab() {
  const { t } = useTranslation()
  const { addLog } = useLogActions()

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
    <HashWorkbench
      id="blake"
      input={blakeInput}
      onInputChange={setBlakeInput}
      output={blakeOutput}
      onClear={() => { setBlakeInput(""); setBlakeOutput(""); setBlakeType("BLAKE2b-512"); setBlakeCase("lower"); removeStoredItem(STORAGE_KEY) }}
      toolbarContent={(
        <>
          <HashToolbarField label={t("tools.hash.algorithm")}><Select aria-label={t("tools.hash.algorithm")} className="w-40" classNames={{ trigger: "h-8 bg-background px-2.5 text-xs" }} selectedKeys={[blakeType]} onChange={(event) => setBlakeType(event.target.value)}>
            <SelectItem key="BLAKE2b-512">{t("tools.hash.blake2b512")}</SelectItem>
            <SelectItem key="BLAKE2s-256">{t("tools.hash.blake2s256")}</SelectItem>
            <SelectItem key="BLAKE3-256">{t("tools.hash.blake3256")}</SelectItem>
          </Select></HashToolbarField>
          <RadioGroup orientation="horizontal" value={blakeCase} onValueChange={setBlakeCase} label={t("tools.hash.case")} size="sm">
            <Radio value="lower">{t("tools.hash.lowercase")}</Radio>
            <Radio value="upper">{t("tools.hash.uppercase")}</Radio>
          </RadioGroup>
        </>
      )}
      actions={(
        <Button size="sm" color="primary" onPress={handleBlakeHash} isDisabled={!blakeInput} startContent={<Hash className="h-4 w-4" />}>
          {t("tools.hash.generate")}
        </Button>
      )}
    />
  )
}
