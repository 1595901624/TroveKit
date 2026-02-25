import { useState, useEffect, useRef } from "react"
import { Textarea, Button, Input, Select, SelectItem, Tabs, Tab, Card, CardBody, CardHeader } from "@heroui/react"
import { Copy, Trash2, Lock, Unlock, FileUp, FolderOpen } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLog } from "../../contexts/LogContext"
import CryptoJS from "crypto-js"
import { open as openDialog } from "@tauri-apps/plugin-dialog"
import { writeFile } from "@tauri-apps/plugin-fs"
import { desktopDir, join } from "@tauri-apps/api/path"
import { getStoredItem, setStoredItem, removeStoredItem } from "../../lib/store"

const STORAGE_KEY = "aes-tool-state"
const MAX_FILE_SIZE = 30 * 1024 * 1024
const FILE_MAGIC = new TextEncoder().encode("TKAESF1")

// 兼容 Tauri v1 / v2 的运行时检测（用于默认桌面目录和目录写入）
const isTauriRuntime =
  typeof window !== "undefined" &&
  ((window as any).__TAURI__ != null || (window as any).__TAURI_INTERNALS__ != null)

const uint8ArrayToWordArray = (u8arr: Uint8Array) => {
  const words = []
  let i = 0
  while (i < u8arr.length) {
    words.push(
      ((u8arr[i] || 0) << 24) |
      ((u8arr[i + 1] || 0) << 16) |
      ((u8arr[i + 2] || 0) << 8) |
      (u8arr[i + 3] || 0)
    )
    i += 4
  }
  return CryptoJS.lib.WordArray.create(words, u8arr.length)
}

const wordArrayToUint8Array = (wordArray: CryptoJS.lib.WordArray) => {
  const sigBytes = Math.max(0, wordArray.sigBytes)
  const words = wordArray.words
  const u8 = new Uint8Array(sigBytes)
  for (let i = 0; i < sigBytes; i++) {
    u8[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff
  }
  return u8
}

const concatUint8Arrays = (arrays: Uint8Array[]) => {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const arr of arrays) {
    result.set(arr, offset)
    offset += arr.length
  }
  return result
}

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function AesTab2() {
  const { t } = useTranslation()
  const { addLog } = useLog()

  const [activeTab, setActiveTab] = useState<"encrypt" | "decrypt" | "fileEncrypt" | "fileDecrypt">("encrypt")
  const [operation, setOperation] = useState<"encrypt" | "decrypt">("encrypt")
  const [aesInput, setAesInput] = useState("")
  const [aesOutput, setAesOutput] = useState("")
  const [aesKey, setAesKey] = useState("")
  const [aesKeyType, setAesKeyType] = useState("text") 
  const [aesKeySize, setAesKeySize] = useState("128") 
  const [aesIv, setAesIv] = useState("")
  const [aesIvType, setAesIvType] = useState("text") 
  const [aesMode, setAesMode] = useState("CBC") 
  const [aesPadding, setAesPadding] = useState("Pkcs7") 
  const [aesInputFormat, setAesInputFormat] = useState("String")
  const [aesOutputFormat, setAesOutputFormat] = useState("Base64")
  const [fileOperation, setFileOperation] = useState<"fileEncrypt" | "fileDecrypt">("fileEncrypt")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileStatus, setFileStatus] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null)
  const [fileOutputDir, setFileOutputDir] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (operation === "decrypt" && aesInputFormat === "String") setAesInputFormat("Base64")
    if (operation === "encrypt" && aesOutputFormat === "String") setAesOutputFormat("Base64")
  }, [operation, aesInputFormat, aesOutputFormat])

  useEffect(() => {
    let mounted = true;
    getStoredItem(STORAGE_KEY).then((stored) => {
      if (mounted && stored) {
        try {
          const state = JSON.parse(stored);
          if (state.aesInput) setAesInput(state.aesInput);
          if (state.aesOutput) setAesOutput(state.aesOutput);
          if (state.aesKey) setAesKey(state.aesKey);
          if (state.aesKeyType) setAesKeyType(state.aesKeyType);
          if (state.aesKeySize) setAesKeySize(state.aesKeySize);
          if (state.aesIv) setAesIv(state.aesIv);
          if (state.aesIvType) setAesIvType(state.aesIvType);
          if (state.aesMode) setAesMode(state.aesMode);
          if (state.aesPadding) setAesPadding(state.aesPadding);
          if (state.aesInputFormat) setAesInputFormat(state.aesInputFormat);
          if (state.aesOutputFormat) setAesOutputFormat(state.aesOutputFormat);
          if (state.activeTab) setActiveTab(state.activeTab);
          if (state.fileOperation) setFileOperation(state.fileOperation);
          if (state.fileOutputDir) setFileOutputDir(state.fileOutputDir);
          if (state.aesFormat && !state.aesInputFormat && !state.aesOutputFormat) {
            setAesInputFormat(state.aesFormat);
            setAesOutputFormat(state.aesFormat);
          }
        } catch (e) {
          console.error("Failed to parse AesTab state", e);
        }
      }
      if (mounted) setIsLoaded(true);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!isLoaded) return
    if (fileOutputDir) return
    if (!isTauriRuntime) return
    let mounted = true
    desktopDir()
      .then((dir) => {
        if (mounted && dir) setFileOutputDir(dir)
      })
      .catch(() => {
        // ignore: non-tauri or permission issues
      })
    return () => {
      mounted = false
    }
  }, [isLoaded, fileOutputDir])

  useEffect(() => {
    if (isLoaded) {
      setStoredItem(STORAGE_KEY, JSON.stringify({
        aesInput,
        aesOutput,
        aesKey,
        aesKeyType,
        aesKeySize,
        aesIv,
        aesIvType,
        aesMode,
        aesPadding,
        aesInputFormat,
        aesOutputFormat,
        activeTab,
        fileOperation,
        fileOutputDir
      }))
    }
  }, [aesInput, aesOutput, aesKey, aesKeyType, aesKeySize, aesIv, aesIvType, aesMode, aesPadding, aesInputFormat, aesOutputFormat, activeTab, fileOperation, fileOutputDir, isLoaded])

  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute("webkitdirectory", "")
      folderInputRef.current.setAttribute("directory", "")
      folderInputRef.current.setAttribute("multiple", "")
    }
  }, [])

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
        // case "CTS": 
        //   // @ts-ignore
        //   return CryptoJS.mode.CTS || CryptoJS.mode.CBC; 
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

  const handleAesEncrypt = () => {
    if (!aesInput) return;
    try {
      const inputData = parseInputData(aesInput, aesInputFormat)
      const key = parseKeyIv(aesKey, aesKeyType, parseInt(aesKeySize));
      // IV is always 128-bit (16 bytes) for AES block size, regardless of key size
      // Except ECB which doesn't use IV, but passing it doesn't hurt usually, though we can skip it.
      const iv = aesMode === "ECB" ? undefined : parseKeyIv(aesIv, aesIvType, 128); 
      
      const encrypted = CryptoJS.AES.encrypt(inputData, key, {
        mode: getMode(aesMode),
        padding: getPadding(aesPadding),
        iv: iv
      });

      const output = encodeOutputData(encrypted.ciphertext, aesOutputFormat)

      setAesOutput(output);
      addLog({
        method: `AES Encrypt (${aesMode}, ${aesKeySize}-bit, ${aesInputFormat}→${aesOutputFormat})`,
        input: aesInput,
        output: output,
        cryptoParams: {
          algorithm: "AES",
          mode: aesMode,
          key_size: `${aesKeySize}-bit`,
          input_format: aesInputFormat,
          output_format: aesOutputFormat,
          key: aesKey,
          key_type: aesKeyType,
          iv: aesIv,
          padding: aesPadding
        }
      }, "success");
    } catch (e) {
      addLog({ method: "AES Encrypt", input: aesInput, output: (e as Error).message }, "error");
    }
  }

  const handleAesDecrypt = () => {
    if (!aesInput) return;
    try {
      const key = parseKeyIv(aesKey, aesKeyType, parseInt(aesKeySize));
      const iv = aesMode === "ECB" ? undefined : parseKeyIv(aesIv, aesIvType, 128);
      
      const cipherParams = { ciphertext: parseInputData(aesInput, aesInputFormat) }

      const decrypted = CryptoJS.AES.decrypt(cipherParams as any, key, {
        mode: getMode(aesMode),
        padding: getPadding(aesPadding),
        iv: iv
      });

      let output = ""
      if (aesOutputFormat === "String") {
        output = decrypted.toString(CryptoJS.enc.Utf8)
        if (decrypted.sigBytes > 0 && !output) throw new Error("Decryption failed or invalid key/iv/mode")
      } else {
        output = encodeOutputData(decrypted, aesOutputFormat)
      }

      setAesOutput(output);
      addLog({
        method: `AES Decrypt (${aesMode}, ${aesKeySize}-bit, ${aesInputFormat}→${aesOutputFormat})`,
        input: aesInput,
        output: output,
        cryptoParams: {
          algorithm: "AES",
          mode: aesMode,
          key_size: `${aesKeySize}-bit`,
          input_format: aesInputFormat,
          output_format: aesOutputFormat,
          key: aesKey,
          key_type: aesKeyType,
          iv: aesIv,
          padding: aesPadding
        }
      }, "success");
    } catch (e) {
      addLog({ method: "AES Decrypt", input: aesInput, output: (e as Error).message }, "error");
    }
  }

  const copyToClipboard = (text: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
  }

  const handleRun = () => {
    if (operation === "encrypt") handleAesEncrypt()
    else handleAesDecrypt()
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const triggerFolderInput = () => {
    folderInputRef.current?.click()
  }

  const pickFile = (files?: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    if (file.size > MAX_FILE_SIZE) {
      setSelectedFile(null)
      setFileStatus({
        type: "error",
        message: t("tools.hash.fileSizeExceeded", { max: "30MB" })
      })
      return
    }

    setSelectedFile(file)
    setFileStatus({
      type: "info",
      message: files.length > 1
        ? t("tools.hash.folderMultipleFilesNotice", { count: files.length, name: file.name })
        : t("tools.hash.fileSelected", { name: file.name })
    })
  }

  const onFileDrop: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault()
    setIsDragging(false)
    pickFile(event.dataTransfer.files)
  }

  const onFileDragOver: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault()
    if (!isDragging) setIsDragging(true)
  }

  const onFileDragLeave: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault()
    setIsDragging(false)
  }

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const chooseFileOutputDir = async () => {
    try {
      const picked = await openDialog({
        directory: true,
        multiple: false,
        defaultPath: fileOutputDir || undefined,
      })
      if (typeof picked === "string" && picked) {
        setFileOutputDir(picked)
        setFileStatus({ type: "info", message: t("tools.hash.outputDirSelected", { path: picked }) })
      }
    } catch (e) {
      const msg = (e as Error).message || t("common.error")
      setFileStatus({ type: "error", message: msg })
    }
  }

  const writeOutputBytes = async (fileName: string, bytes: Uint8Array): Promise<{ output: string; savedToDir: boolean }> => {
    // 优先尝试写入用户设置的输出目录；如果失败（例如 Web 环境）再回退为浏览器下载。
    if (isTauriRuntime) {
      try {
        let dir = fileOutputDir
        if (!dir) {
          dir = await desktopDir()
          if (dir) setFileOutputDir(dir)
        }
        if (dir) {
          const outputPath = await join(dir, fileName)
          await writeFile(outputPath, bytes)
          return { output: outputPath, savedToDir: true }
        }
      } catch {
        // 失败后走下载回退，避免用户无结果
      }
    }

    // TS lib.dom BlobPart typing is stricter about ArrayBuffer vs SharedArrayBuffer;
    // copy into a fresh ArrayBuffer-backed Uint8Array.
    downloadBlob(new Blob([new Uint8Array(bytes)], { type: "application/octet-stream" }), fileName)
    return { output: fileName, savedToDir: false }
  }

  const handleFileEncrypt = async () => {
    if (!selectedFile) {
      setFileStatus({ type: "error", message: t("tools.hash.selectFileFirst") })
      return
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setFileStatus({ type: "error", message: t("tools.hash.fileSizeExceeded", { max: "30MB" }) })
      return
    }

    try {
      const source = new Uint8Array(await selectedFile.arrayBuffer())
      const inputData = uint8ArrayToWordArray(source)
      const key = parseKeyIv(aesKey, aesKeyType, parseInt(aesKeySize))
      const ivWordArray = aesMode === "ECB" ? undefined : parseKeyIv(aesIv, aesIvType, 128)

      const encrypted = CryptoJS.AES.encrypt(inputData, key, {
        mode: getMode(aesMode),
        padding: getPadding(aesPadding),
        iv: ivWordArray
      })

      const modeFlag = new Uint8Array([aesMode === "ECB" ? 0 : 1])
      const ivBytes = aesMode === "ECB" || !ivWordArray ? new Uint8Array() : wordArrayToUint8Array(ivWordArray)
      const cipherBytes = wordArrayToUint8Array(encrypted.ciphertext)
      const payload = concatUint8Arrays([FILE_MAGIC, modeFlag, ivBytes, cipherBytes])

      const outputFileName = `${selectedFile.name}.aes`
      const outputResult = await writeOutputBytes(outputFileName, payload)

      const successMessage = outputResult.savedToDir
        ? t("tools.hash.fileEncryptedAndSaved", { name: outputFileName, path: outputResult.output })
        : t("tools.hash.fileEncryptedAndDownloaded", { name: outputFileName })
      setFileStatus({ type: "success", message: successMessage })
      addLog({
        method: `AES File Encrypt (${aesMode}, ${aesKeySize}-bit)`,
        input: `${selectedFile.name} (${formatBytes(selectedFile.size)})`,
        output: outputResult.output,
        cryptoParams: {
          algorithm: "AES",
          mode: aesMode,
          key_size: `${aesKeySize}-bit`,
          key: aesKey,
          key_type: aesKeyType,
          iv: aesIv,
          padding: aesPadding
        }
      }, "success")
    } catch (e) {
      const errorMessage = (e as Error).message || t("tools.hash.fileEncryptFailed")
      setFileStatus({ type: "error", message: errorMessage })
      addLog({ method: "AES File Encrypt", input: selectedFile.name, output: errorMessage }, "error")
    }
  }

  const handleFileDecrypt = async () => {
    if (!selectedFile) {
      setFileStatus({ type: "error", message: t("tools.hash.selectFileFirst") })
      return
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setFileStatus({ type: "error", message: t("tools.hash.fileSizeExceeded", { max: "30MB" }) })
      return
    }

    try {
      const allBytes = new Uint8Array(await selectedFile.arrayBuffer())
      const key = parseKeyIv(aesKey, aesKeyType, parseInt(aesKeySize))
      let ivWordArray = aesMode === "ECB" ? undefined : parseKeyIv(aesIv, aesIvType, 128)

      let offset = 0
      const hasMagic = allBytes.length > FILE_MAGIC.length + 1 && FILE_MAGIC.every((byte, index) => allBytes[index] === byte)

      if (hasMagic) {
        const hasIv = allBytes[FILE_MAGIC.length] === 1
        offset = FILE_MAGIC.length + 1
        if (hasIv) {
          if (allBytes.length < offset + 16) {
            throw new Error(t("tools.hash.invalidEncryptedFile"))
          }
          ivWordArray = uint8ArrayToWordArray(allBytes.slice(offset, offset + 16))
          offset += 16
        }
      }

      const cipherBytes = allBytes.slice(offset)
      if (!cipherBytes.length) throw new Error(t("tools.hash.invalidEncryptedFile"))

      const decrypted = CryptoJS.AES.decrypt({ ciphertext: uint8ArrayToWordArray(cipherBytes) } as any, key, {
        mode: getMode(aesMode),
        padding: getPadding(aesPadding),
        iv: ivWordArray
      })

      const decryptedBytes = wordArrayToUint8Array(decrypted)
      if (decrypted.sigBytes <= 0) {
        throw new Error(t("tools.hash.decryptionFailed"))
      }

      const outputName = selectedFile.name.toLowerCase().endsWith(".aes")
        ? selectedFile.name.replace(/\.aes$/i, "")
        : `${selectedFile.name}.dec`

      const outputResult = await writeOutputBytes(outputName, decryptedBytes)

      const successMessage = outputResult.savedToDir
        ? t("tools.hash.fileDecryptedAndSaved", { name: outputName, path: outputResult.output })
        : t("tools.hash.fileDecryptedAndDownloaded", { name: outputName })
      setFileStatus({ type: "success", message: successMessage })
      addLog({
        method: `AES File Decrypt (${aesMode}, ${aesKeySize}-bit)`,
        input: `${selectedFile.name} (${formatBytes(selectedFile.size)})`,
        output: outputResult.output,
        cryptoParams: {
          algorithm: "AES",
          mode: aesMode,
          key_size: `${aesKeySize}-bit`,
          key: aesKey,
          key_type: aesKeyType,
          iv: aesIv,
          padding: aesPadding
        }
      }, "success")
    } catch (e) {
      const errorMessage = (e as Error).message || t("tools.hash.fileDecryptFailed")
      setFileStatus({ type: "error", message: errorMessage })
      addLog({ method: "AES File Decrypt", input: selectedFile.name, output: errorMessage }, "error")
    }
  }

  const runFileAction = () => {
    if (fileOperation === "fileEncrypt") void handleFileEncrypt()
    else void handleFileDecrypt()
  }

  return (
    <div className="space-y-4">
      <Tabs
        aria-label="AES"
        color="primary"
        selectedKey={activeTab}
        onSelectionChange={(k) => {
          const selected = k as "encrypt" | "decrypt" | "fileEncrypt" | "fileDecrypt"
          setActiveTab(selected)
          if (selected === "encrypt" || selected === "decrypt") {
            setOperation(selected)
          } else {
            setFileOperation(selected)
          }
        }}
        className="w-full"
      >
        <Tab key="encrypt" title={t("tools.hash.encrypt")} />
        <Tab key="decrypt" title={t("tools.hash.decrypt")} />
        <Tab key="fileEncrypt" title={t("tools.hash.fileEncrypt")} />
        <Tab key="fileDecrypt" title={t("tools.hash.fileDecrypt")} />
      </Tabs>

      {(activeTab === "encrypt" || activeTab === "decrypt") && (
      <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="shadow-none border border-divider/50">
          <CardHeader className="flex gap-2 items-center justify-between">
            <div className="text-sm font-medium">{t("tools.hash.inputLabel")}</div>
            <div className="flex items-center gap-2">
              <Select
                size="sm"
                label={t("tools.hash.inputFormat")}
                className="w-40"
                selectedKeys={new Set([aesInputFormat])}
                onSelectionChange={(keys) => setAesInputFormat(Array.from(keys)[0] as string)}
                disallowEmptySelection
              >
                <SelectItem key="String" isDisabled={operation !== "encrypt"}>{t("tools.hash.text")}</SelectItem>
                <SelectItem key="Base64">Base64</SelectItem>
                <SelectItem key="Hex">Hex</SelectItem>
              </Select>
              <Button
                isIconOnly
                size="sm"
                variant="flat"
                color="danger"
                onPress={() => setAesInput("")}
                title={t("tools.hash.clear")}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardBody className="pt-0">
            <Textarea
              placeholder={t("tools.hash.aesInputPlaceholder")}
              minRows={8}
              variant="bordered"
              value={aesInput}
              onValueChange={setAesInput}
              classNames={{
                inputWrapper: "bg-default-100/50 hover:bg-default-100 focus-within:bg-background"
              }}
            />
          </CardBody>
        </Card>

        <Card className="shadow-none border border-divider/50">
          <CardHeader className="flex gap-2 items-center justify-between">
            <div className="text-sm font-medium">{t("tools.hash.outputLabel")}</div>
            <div className="flex items-center gap-2">
              <Select
                size="sm"
                label={t("tools.hash.outputFormat")}
                className="w-40"
                selectedKeys={new Set([aesOutputFormat])}
                onSelectionChange={(keys) => setAesOutputFormat(Array.from(keys)[0] as string)}
                disallowEmptySelection
              >
                <SelectItem key="String" isDisabled={operation !== "decrypt"}>{t("tools.hash.text")}</SelectItem>
                <SelectItem key="Base64">Base64</SelectItem>
                <SelectItem key="Hex">Hex</SelectItem>
              </Select>
              <Button isIconOnly size="sm" variant="flat" onPress={() => copyToClipboard(aesOutput)} title={t("tools.hash.copy")}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardBody className="pt-0">
            <Textarea
              readOnly
              minRows={8}
              variant="bordered"
              value={aesOutput}
              classNames={{
                inputWrapper: "bg-default-100/30 transition-colors font-mono text-tiny"
              }}
            />
          </CardBody>
        </Card>
      </div>

      <div className="p-3 bg-default-50 rounded-lg">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                size="sm"
                label={t("tools.hash.key")}
                placeholder={t("tools.hash.keyPlaceholder")}
                value={aesKey}
                onValueChange={setAesKey}
                className="flex-1"
              />
              <Select
                size="sm"
                label={t("tools.hash.keySize")}
                className="w-28"
                selectedKeys={new Set([aesKeySize])}
                onSelectionChange={(keys) => setAesKeySize(Array.from(keys)[0] as string)}
                disallowEmptySelection
              >
                <SelectItem key="128">{t("tools.hash.bit128")}</SelectItem>
                <SelectItem key="192">{t("tools.hash.bit192")}</SelectItem>
                <SelectItem key="256">{t("tools.hash.bit256")}</SelectItem>
              </Select>
              <Select
                size="sm"
                label={t("tools.hash.type")}
                className="w-24"
                selectedKeys={new Set([aesKeyType])}
                onSelectionChange={(keys) => setAesKeyType(Array.from(keys)[0] as string)}
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
                placeholder={t("tools.hash.iv")}
                value={aesIv}
                onValueChange={setAesIv}
                isDisabled={aesMode === "ECB"}
                className="flex-1"
              />
              <Select
                size="sm"
                label={t("tools.hash.type")}
                className="w-24"
                selectedKeys={new Set([aesIvType])}
                onSelectionChange={(keys) => setAesIvType(Array.from(keys)[0] as string)}
                isDisabled={aesMode === "ECB"}
                disallowEmptySelection
              >
                <SelectItem key="text">{t("tools.hash.text")}</SelectItem>
                <SelectItem key="hex">{t("tools.hash.hex")}</SelectItem>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Select
              size="sm"
              label={t("tools.hash.mode")}
              selectedKeys={new Set([aesMode])}
              onSelectionChange={(keys) => setAesMode(Array.from(keys)[0] as string)}
              disallowEmptySelection
            >
              <SelectItem key="CBC">{t("tools.hash.cbc")}</SelectItem>
              <SelectItem key="ECB">{t("tools.hash.ecb")}</SelectItem>
              <SelectItem key="CTR">{t("tools.hash.ctr")}</SelectItem>
              <SelectItem key="OFB">{t("tools.hash.ofb")}</SelectItem>
              <SelectItem key="CFB">{t("tools.hash.cfb")}</SelectItem>
            </Select>

            <Select
              size="sm"
              label={t("tools.hash.padding")}
              selectedKeys={new Set([aesPadding])}
              onSelectionChange={(keys) => setAesPadding(Array.from(keys)[0] as string)}
              disallowEmptySelection
            >
              <SelectItem key="Pkcs7">{t("tools.hash.pkcs7")}</SelectItem>
              <SelectItem key="ZeroPadding">{t("tools.hash.zeroPadding")}</SelectItem>
              <SelectItem key="AnsiX923">{t("tools.hash.ansiX923")}</SelectItem>
              <SelectItem key="Iso10126">{t("tools.hash.iso10126")}</SelectItem>
              <SelectItem key="NoPadding">{t("tools.hash.noPadding")}</SelectItem>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 justify-end">
        <Button
          color={operation === "encrypt" ? "primary" : "secondary"}
          variant="flat"
          onPress={handleRun}
          startContent={operation === "encrypt" ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
        >
          {operation === "encrypt" ? t("tools.hash.encrypt") : t("tools.hash.decrypt")}
        </Button>
        <Button
          isIconOnly
          variant="light"
          color="danger"
          onPress={() => {
            setAesInput("")
            setAesOutput("")
            setAesKey("")
            setAesIv("")
            setSelectedFile(null)
            setFileStatus(null)
            removeStoredItem(STORAGE_KEY)
          }}
          title={t("tools.hash.clearAll")}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
      </>
      )}

      {(activeTab === "fileEncrypt" || activeTab === "fileDecrypt") && (
      <Card className="shadow-none border border-divider/50">
        <CardHeader className="pb-0">
          <div className="w-full">
            <div className="text-sm font-medium mb-1">{t("tools.hash.fileCrypto")}</div>
          </div>
        </CardHeader>
        <CardBody className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => pickFile(e.target.files)}
          />
          <input
            ref={folderInputRef}
            type="file"
            className="hidden"
            onChange={(e) => pickFile(e.target.files)}
          />

          <div
            className={`rounded-lg border-2 border-dashed p-5 text-center transition-colors ${isDragging ? "border-primary bg-primary/10" : "border-divider bg-default-50"}`}
            onDrop={onFileDrop}
            onDragOver={onFileDragOver}
            onDragLeave={onFileDragLeave}
          >
            <div className="text-sm font-medium">{t("tools.hash.fileDropHint")}</div>
            <div className="text-xs text-default-500 mt-1">{t("tools.hash.fileSizeLimit", { max: "30MB" })}</div>
            <div className="mt-3 flex justify-center gap-2">
              <Button variant="flat" size="sm" startContent={<FileUp className="w-4 h-4" />} onPress={triggerFileInput}>
                {t("tools.hash.chooseFile")}
              </Button>
            </div>
            {selectedFile && (
              <div className="mt-3 text-xs text-default-600">
                {t("tools.hash.selectedFileInfo", { name: selectedFile.name, size: formatBytes(selectedFile.size) })}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                size="sm"
                label={t("tools.hash.outputDir")}
                placeholder={t("tools.hash.outputDirPlaceholder")}
                value={fileOutputDir}
                isReadOnly
                className="flex-1"
              />
              <Button
                variant="flat"
                startContent={<FolderOpen className="w-4 h-4" />}
                onPress={chooseFileOutputDir}
              >
                {t("tools.hash.chooseOutputDir")}
              </Button>
            </div>

            <div className="p-3 bg-default-50 rounded-lg">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      size="sm"
                      label={t("tools.hash.key")}
                      placeholder={t("tools.hash.keyPlaceholder")}
                      value={aesKey}
                      onValueChange={setAesKey}
                      className="flex-1"
                    />
                    <Select
                      size="sm"
                      label={t("tools.hash.keySize")}
                      className="w-28"
                      selectedKeys={new Set([aesKeySize])}
                      onSelectionChange={(keys) => setAesKeySize(Array.from(keys)[0] as string)}
                      disallowEmptySelection
                    >
                      <SelectItem key="128">{t("tools.hash.bit128")}</SelectItem>
                      <SelectItem key="192">{t("tools.hash.bit192")}</SelectItem>
                      <SelectItem key="256">{t("tools.hash.bit256")}</SelectItem>
                    </Select>
                    <Select
                      size="sm"
                      label={t("tools.hash.type")}
                      className="w-24"
                      selectedKeys={new Set([aesKeyType])}
                      onSelectionChange={(keys) => setAesKeyType(Array.from(keys)[0] as string)}
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
                      placeholder={t("tools.hash.iv")}
                      value={aesIv}
                      onValueChange={setAesIv}
                      isDisabled={aesMode === "ECB"}
                      className="flex-1"
                    />
                    <Select
                      size="sm"
                      label={t("tools.hash.type")}
                      className="w-24"
                      selectedKeys={new Set([aesIvType])}
                      onSelectionChange={(keys) => setAesIvType(Array.from(keys)[0] as string)}
                      isDisabled={aesMode === "ECB"}
                      disallowEmptySelection
                    >
                      <SelectItem key="text">{t("tools.hash.text")}</SelectItem>
                      <SelectItem key="hex">{t("tools.hash.hex")}</SelectItem>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Select
                    size="sm"
                    label={t("tools.hash.mode")}
                    selectedKeys={new Set([aesMode])}
                    onSelectionChange={(keys) => setAesMode(Array.from(keys)[0] as string)}
                    disallowEmptySelection
                  >
                    <SelectItem key="CBC">{t("tools.hash.cbc")}</SelectItem>
                    <SelectItem key="ECB">{t("tools.hash.ecb")}</SelectItem>
                    <SelectItem key="CTR">{t("tools.hash.ctr")}</SelectItem>
                    <SelectItem key="OFB">{t("tools.hash.ofb")}</SelectItem>
                    <SelectItem key="CFB">{t("tools.hash.cfb")}</SelectItem>
                  </Select>

                  <Select
                    size="sm"
                    label={t("tools.hash.padding")}
                    selectedKeys={new Set([aesPadding])}
                    onSelectionChange={(keys) => setAesPadding(Array.from(keys)[0] as string)}
                    disallowEmptySelection
                  >
                    <SelectItem key="Pkcs7">{t("tools.hash.pkcs7")}</SelectItem>
                    <SelectItem key="ZeroPadding">{t("tools.hash.zeroPadding")}</SelectItem>
                    <SelectItem key="AnsiX923">{t("tools.hash.ansiX923")}</SelectItem>
                    <SelectItem key="Iso10126">{t("tools.hash.iso10126")}</SelectItem>
                    <SelectItem key="NoPadding">{t("tools.hash.noPadding")}</SelectItem>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="flat" startContent={<FolderOpen className="w-4 h-4" />} onPress={triggerFolderInput}>
              {t("tools.hash.chooseFolder")}
            </Button>
            <Button
              color={fileOperation === "fileEncrypt" ? "primary" : "secondary"}
              onPress={runFileAction}
              startContent={fileOperation === "fileEncrypt" ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            >
              {fileOperation === "fileEncrypt" ? t("tools.hash.fileEncrypt") : t("tools.hash.fileDecrypt")}
            </Button>
            <Button
              isIconOnly
              variant="light"
              color="danger"
              onPress={() => {
                setSelectedFile(null)
                setFileStatus(null)
              }}
              title={t("tools.hash.clear")}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {fileStatus && (
            <div className={`text-sm rounded-md px-3 py-2 ${fileStatus.type === "success" ? "bg-success-100 text-success-700" : fileStatus.type === "error" ? "bg-danger-100 text-danger-700" : "bg-default-100 text-default-700"}`}>
              {fileStatus.message}
            </div>
          )}
        </CardBody>
      </Card>
      )}
    </div>
  )
}
