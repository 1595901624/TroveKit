import { useState, useEffect, useRef } from "react"
import { Tabs, Tab, Button, Input, Switch, Select, SelectItem, Popover, PopoverTrigger, PopoverContent } from "@heroui/react"
import { useTranslation } from "react-i18next"
import { TextTab } from "./TextTab"
import { WifiTab, WifiState } from "./WifiTab"
import QRCodeStyling, { Options } from "qr-code-styling"
import { Download, Upload, X, Zap, RotateCcw } from "lucide-react"
import { HexColorPicker } from "react-colorful"
import { open } from "@tauri-apps/plugin-dialog"
import { convertFileSrc } from "@tauri-apps/api/core"
import { useLog } from "../../contexts/LogContext"

type QrMode = "text" | "wifi"

interface ColorPickerProps {
    label: string
    color: string
    onChange: (color: string) => void
}

function ColorPicker({ label, color, onChange }: ColorPickerProps) {
    return (
        <div className="flex items-center justify-between gap-2 p-2 border border-default-200 rounded-lg bg-default-50/50">
            <span className="text-sm font-medium text-default-600">{label}</span>
            <Popover placement="bottom" showArrow={true}>
                <PopoverTrigger>
                    <button 
                        className="w-8 h-8 rounded-full border border-default-300 shadow-sm transition-transform hover:scale-110 active:scale-95"
                        style={{ backgroundColor: color }} 
                        aria-label="Pick color"
                    />
                </PopoverTrigger>
                <PopoverContent className="p-0 border-none shadow-xl">
                    <HexColorPicker color={color} onChange={onChange} />
                </PopoverContent>
            </Popover>
        </div>
    )
}

const DEFAULT_OPTIONS = {
    width: 300,
    height: 300,
    margin: 10,
    qrColor: "#000000",
    bgColor: "#ffffff",
    dotsType: "square" as const,
    cornersType: "square" as const,
    cornersDotType: "square" as const,
    correction: "M" as const, // L, M, Q, H
    logo: "",
}

export function QrTool() {
  const { t } = useTranslation()
  const { addLog } = useLog()
  const [selectedMode, setSelectedMode] = useState<QrMode>("text")
  const ref = useRef<HTMLDivElement>(null)
  const qrCode = useRef<QRCodeStyling>(null)

  // Content State
  const [text, setText] = useState("https://example.com")
  const [wifi, setWifi] = useState<WifiState>({
      ssid: "",
      encryption: "WPA",
      hidden: false
  })

  // Settings State
  const [width, setWidth] = useState(128)
  const [realTime, setRealTime] = useState(false)
  const [qrColor, setQrColor] = useState(DEFAULT_OPTIONS.qrColor)
  const [bgColor, setBgColor] = useState(DEFAULT_OPTIONS.bgColor)
  const [dotsColor, setDotsColor] = useState(DEFAULT_OPTIONS.qrColor)
  const [cornersColor, setCornersColor] = useState(DEFAULT_OPTIONS.qrColor)
  const [correction, setCorrection] = useState(DEFAULT_OPTIONS.correction)
  const [logo, setLogo] = useState("")

  // Init QR Code instance
  useEffect(() => {
    qrCode.current = new QRCodeStyling({
        width: 300,
        height: 300,
        type: "svg", // SVG is better for sharp rendering
        imageOptions: {
            crossOrigin: "anonymous",
            margin: 5
        }
    })
    // Initial render
    if (ref.current) {
        qrCode.current.append(ref.current)
    }
    updateQr()
  }, [])

  // Combined data for update
  const getQrData = () => {
      if (selectedMode === "text") return text
      if (selectedMode === "wifi") {
          const { ssid, password, encryption, hidden } = wifi
          let data = `WIFI:S:${ssid};`
          if (encryption !== "nopass") {
              data += `T:${encryption};`
          }
          if (password) {
              data += `P:${password};`
          }
          if (hidden) {
              data += `H:true;`
          }
          data += `;;`
          return data
      }
      return ""
  }

  const updateQr = () => {
    if (!qrCode.current) return
    const data = getQrData()
    
    const options: Options = {
        width: 300, // Display size fixed for preview
        height: 300,
        data: data,
        margin: 10,
        qrOptions: {
            typeNumber: 0,
            mode: "Byte",
            errorCorrectionLevel: correction
        },
        imageOptions: {
            hideBackgroundDots: true,
            imageSize: 0.4,
            margin: 5
        },
        dotsOptions: {
            color: qrColor,
            type: "rounded"
        },
        backgroundOptions: {
            color: bgColor,
        },
        cornersSquareOptions: {
            color: cornersColor,
            type: "extra-rounded"
        },
        cornersDotOptions: {
            color: dotsColor,
            type: "dot"
        },
        image: logo || undefined
    }
    
    qrCode.current.update(options)
  }

  // Effect for Real-time
  useEffect(() => {
    if (realTime) {
        // Debounce slightly to prevent flashing
        const timer = setTimeout(() => {
            updateQr()
        }, 100)
        return () => clearTimeout(timer)
    }
  }, [text, wifi, qrColor, bgColor, dotsColor, cornersColor, correction, logo, selectedMode, realTime])

  // Explicit Generate
  const handleGenerate = () => {
      updateQr()
      addLog({ method: "QR Generate", input: selectedMode, output: "Success" }, "success")
  }

  const handleDownload = async () => {
    if (!qrCode.current) return
    try {
        // We need to update with the *download* size right before downloading, then revert? 
        // Or just passing options to download? 
        // qr-code-styling `download` method takes downloadOptions, but it doesn't seem to override width/height of the instance easily without update.
        // So we update, download, then update back.
        
        await qrCode.current.update({ width: width, height: width })
        await qrCode.current.download({ name: "qr-code", extension: "png" })
        
        // Revert to preview size
        await qrCode.current.update({ width: 300, height: 300 })
        
        addLog({ method: "QR Download", input: `${width}x${width}`, output: "Downloaded" }, "success")
    } catch (e) {
        addLog({ method: "QR Download", input: "Error", output: (e as Error).message }, "error")
    }
  }

  const handleLogoSelect = async () => {
      try {
          const file = await open({
              multiple: false,
              filters: [{
                  name: 'Images',
                  extensions: ['png', 'jpg', 'jpeg', 'svg', 'webp']
              }]
          })
          
          if (file) {
             const assetUrl = convertFileSrc(file as string)
             setLogo(assetUrl)
             if (realTime) addLog("Logo selected", "info")
          }
      } catch (e) {
          console.error(e)
          addLog("Failed to select logo", "error")
      }
  }

  const handleReset = () => {
      setQrColor(DEFAULT_OPTIONS.qrColor)
      setBgColor(DEFAULT_OPTIONS.bgColor)
      setDotsColor(DEFAULT_OPTIONS.qrColor)
      setCornersColor(DEFAULT_OPTIONS.qrColor)
      setCorrection(DEFAULT_OPTIONS.correction)
      setLogo("")
      setWidth(128)
      if (realTime) setTimeout(updateQr, 50)
  }

  return (
    <div className="flex flex-col lg:flex-row h-full gap-6 overflow-hidden">
      {/* Left Panel: Controls */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto pr-2 space-y-6 scrollbar-hide">
        
        {/* Content Section */}
        <div className="space-y-4">
             <Tabs 
                selectedKey={selectedMode} 
                onSelectionChange={(k) => setSelectedMode(k as QrMode)}
                color="primary" 
                variant="underlined"
                aria-label="QR Mode"
             >
                <Tab key="text" title={t("tools.qr.text")} />
                <Tab key="wifi" title={t("tools.qr.wifi")} />
             </Tabs>
             
             <div className="p-1">
                 {selectedMode === "text" && <TextTab value={text} onChange={setText} />}
                 {selectedMode === "wifi" && <WifiTab value={wifi} onChange={setWifi} />}
             </div>
        </div>

        {/* Style Section */}
        <div className="space-y-4 border-t border-divider pt-4">
            <h3 className="text-sm font-semibold text-default-500 uppercase tracking-wider">{t("tools.qr.style")}</h3>
            
            <div className="grid grid-cols-2 gap-4">
                <ColorPicker label={t("tools.qr.dots")} color={qrColor} onChange={setQrColor} />
                <ColorPicker label={t("tools.qr.background")} color={bgColor} onChange={setBgColor} />
                <ColorPicker label={t("tools.qr.corners")} color={cornersColor} onChange={setCornersColor} />
                <ColorPicker label={t("tools.qr.dots")} color={dotsColor} onChange={setDotsColor} />
            </div>

            <div className="grid grid-cols-2 gap-4">
                 <Select 
                    label={t("tools.qr.correction")} 
                    size="sm" 
                    variant="bordered"
                    selectedKeys={[correction]}
                    onChange={(e) => setCorrection(e.target.value as any)}
                 >
                    <SelectItem key="L">{t("tools.qr.low")}</SelectItem>
                    <SelectItem key="M">{t("tools.qr.medium")}</SelectItem>
                    <SelectItem key="Q">{t("tools.qr.quartile")}</SelectItem>
                    <SelectItem key="H">{t("tools.qr.high")}</SelectItem>
                 </Select>

                 <div className="flex items-center gap-2 border border-default-200 rounded-xl px-3 bg-default-50/50">
                    {logo ? (
                        <div className="flex items-center gap-2 w-full justify-between">
                            <img src={logo} alt="logo" className="w-8 h-8 object-contain" />
                            <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => setLogo("")}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    ) : (
                        <Button 
                            variant="light" 
                            className="w-full justify-start text-default-500" 
                            startContent={<Upload className="w-4 h-4" />}
                            onPress={handleLogoSelect}
                        >
                            {t("tools.qr.uploadLogo")}
                        </Button>
                    )}
                 </div>
            </div>
        </div>

        {/* Actions Section */}
        <div className="space-y-4 border-t border-divider pt-4 pb-10">
            <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                    <Switch size="sm" isSelected={realTime} onValueChange={setRealTime}>
                        {t("tools.qr.realtime")}
                    </Switch>
                 </div>
                 <Button size="sm" variant="flat" color="warning" onPress={handleReset} startContent={<RotateCcw className="w-3 h-3" />}>
                     {t("tools.qr.reset")}
                 </Button>
            </div>

            <div className="flex items-end gap-4">
                <Input 
                    label={t("tools.qr.width")}
                    type="number" 
                    variant="bordered"
                    value={width.toString()} 
                    onValueChange={(v) => setWidth(Number(v))}
                    className="w-32"
                />
                <Button 
                    className="flex-1" 
                    color="primary" 
                    onPress={handleGenerate}
                    isDisabled={realTime}
                    startContent={<Zap className="w-4 h-4" />}
                >
                    {t("tools.qr.generate")}
                </Button>
                <Button 
                    className="flex-1" 
                    color="secondary" 
                    onPress={handleDownload}
                    startContent={<Download className="w-4 h-4" />}
                >
                    {t("tools.qr.download")}
                </Button>
            </div>
        </div>
      </div>

      {/* Right Panel: Preview */}
      <div className="flex-none w-full lg:w-[400px] bg-default-50/50 rounded-2xl border border-default-200 flex flex-col items-center justify-center p-8 relative">
          <div className="absolute inset-0 bg-grid-slate-200/50 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] pointer-events-none" />
          
          <div className="bg-white p-6 rounded-xl shadow-lg border border-default-100 relative z-10" ref={ref} />
          
          <div className="mt-6 text-center text-default-400 text-sm">
             {selectedMode === "wifi" ? `WIFI: ${wifi.ssid}` : "QR Code Preview"}
          </div>
      </div>
    </div>
  )
}
