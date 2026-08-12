import { useState, useEffect } from "react"
import { Button, RadioGroup, Radio, Select, SelectItem } from "../../components/ui/base-ui"
import { Hash } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLogActions } from "../../contexts/LogContext"
import CryptoJS from "crypto-js"
import { getStoredItem, setStoredItem, removeStoredItem } from "../../lib/store"
import { HashToolbarField, HashWorkbench } from "./HashWorkbench"

const STORAGE_KEY = "sha-tool-state"

export function ShaTab() {
  const { t } = useTranslation()
  const { addLog } = useLogActions()

  const [shaInput, setShaInput] = useState("")
  const [shaOutput, setShaOutput] = useState("")
  const [shaType, setShaType] = useState("SHA256") // "SHA1" | "SHA256" | "SHA512"
  const [shaCase, setShaCase] = useState("lower") // "lower" | "upper"
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    let mounted = true;
    getStoredItem(STORAGE_KEY).then((stored) => {
      if (mounted && stored) {
        try {
          const state = JSON.parse(stored);
          if (state.shaInput) setShaInput(state.shaInput);
          if (state.shaOutput) setShaOutput(state.shaOutput);
          if (state.shaType) setShaType(state.shaType);
          if (state.shaCase) setShaCase(state.shaCase);
        } catch (e) {
          console.error("Failed to parse ShaTab state", e);
        }
      }
      if (mounted) setIsLoaded(true);
    });
    return () => { mounted = false; };
  }, []);

  const handleShaHash = () => {
    if (!shaInput) return
    try {
      let hash = ""
      switch (shaType) {
        case "SHA1":
          hash = CryptoJS.SHA1(shaInput).toString()
          break
        case "SHA224":
          hash = CryptoJS.SHA224(shaInput).toString()
          break
        case "SHA256":
          hash = CryptoJS.SHA256(shaInput).toString()
          break
        case "SHA384":
          hash = CryptoJS.SHA384(shaInput).toString()
          break
        case "SHA512":
          hash = CryptoJS.SHA512(shaInput).toString()
          break
        case "SHA3":
          hash = CryptoJS.SHA3(shaInput).toString()
          break
        default:
          return
      }

      if (shaCase === "upper") {
        hash = hash.toUpperCase()
      }

      setShaOutput(hash)
      addLog({ 
        method: `${shaType} (${shaCase})`, 
        input: shaInput, 
        output: hash 
      }, "success")

    } catch (e) {
      addLog({ method: shaType, input: shaInput, output: (e as Error).message }, "error")
    }
  }

  useEffect(() => {
    if (isLoaded) {
      setStoredItem(STORAGE_KEY, JSON.stringify({
        shaInput,
        shaOutput,
        shaType,
        shaCase
      }))
    }
  }, [shaInput, shaOutput, shaType, shaCase, isLoaded])

  return (
    <HashWorkbench
      id="sha"
      input={shaInput}
      onInputChange={setShaInput}
      output={shaOutput}
      onClear={() => { setShaInput(""); setShaOutput(""); setShaType("SHA256"); setShaCase("lower"); removeStoredItem(STORAGE_KEY) }}
      toolbarContent={(
        <>
          <HashToolbarField label={t("tools.hash.algorithm")}><Select aria-label={t("tools.hash.algorithm")} className="w-32" classNames={{ trigger: "h-8 bg-background px-2.5 text-xs" }} selectedKeys={[shaType]} onChange={(event) => setShaType(event.target.value)}>
            <SelectItem key="SHA1">{t("tools.hash.sha1")}</SelectItem>
            <SelectItem key="SHA224">{t("tools.hash.sha224")}</SelectItem>
            <SelectItem key="SHA256">{t("tools.hash.sha256")}</SelectItem>
            <SelectItem key="SHA384">{t("tools.hash.sha384")}</SelectItem>
            <SelectItem key="SHA512">{t("tools.hash.sha512")}</SelectItem>
            <SelectItem key="SHA3">{t("tools.hash.sha3")}</SelectItem>
          </Select></HashToolbarField>
          <RadioGroup orientation="horizontal" value={shaCase} onValueChange={setShaCase} label={t("tools.hash.case")} size="sm">
            <Radio value="lower">{t("tools.hash.lowercase")}</Radio>
            <Radio value="upper">{t("tools.hash.uppercase")}</Radio>
          </RadioGroup>
        </>
      )}
      actions={(
        <Button size="sm" color="primary" onPress={handleShaHash} isDisabled={!shaInput} startContent={<Hash className="h-4 w-4" />}>
          {t("tools.hash.generate")}
        </Button>
      )}
    />
  )
}
