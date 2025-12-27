import { useState, useEffect, useRef } from "react"
import { Button, Input, Switch, Select, SelectItem, Popover, PopoverTrigger, PopoverContent, ButtonGroup } from "@heroui/react"
import { useTranslation } from "react-i18next"
import { useToast } from "../../contexts/ToastContext"
import { TextTab } from "./TextTab"
import { WifiTab, WifiState } from "./WifiTab"
import QRCodeStyling, { Options } from "qr-code-styling"
import { Download, Upload, X, Zap, RotateCcw, Type, Wifi } from "lucide-react"
import { HexAlphaColorPicker } from "react-colorful"
import { open, save } from "@tauri-apps/plugin-dialog"
import { readFile, writeFile } from "@tauri-apps/plugin-fs"

type QrMode = "text" | "wifi"

const MAX_QR_SIZE = 5000
const MIN_QR_SIZE = 50
const MAX_INPUT_BYTES = 2000

// Color Utils
const hexToRgba = (hex: string) => {
    let r = 0, g = 0, b = 0, a = 1;
    if (hex.startsWith("#")) hex = hex.slice(1);
    
    if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6) {
        r = parseInt(hex.slice(0, 2), 16);
        g = parseInt(hex.slice(2, 4), 16);
        b = parseInt(hex.slice(4, 6), 16);
    } else if (hex.length === 8) {
        r = parseInt(hex.slice(0, 2), 16);
        g = parseInt(hex.slice(2, 4), 16);
        b = parseInt(hex.slice(4, 6), 16);
        a = parseInt(hex.slice(6, 8), 16) / 255;
    }
    return { r, g, b, a };
}

const rgbaToHex = (r: number, g: number, b: number, a: number) => {
    const toHex = (n: number) => {
        const hex = Math.max(0, Math.min(255, Math.round(n))).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    }
    const alpha = Math.max(0, Math.min(255, Math.round(a * 255)));
    if (alpha === 255) {
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }
    return `#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(alpha)}`;
}

interface ColorPickerProps {
    label: string
    color: string
    onChange: (color: string) => void
    t: (key: string) => string
}

function ColorPicker({ label, color, onChange, t }: ColorPickerProps) {
    const [rgba, setRgba] = useState(hexToRgba(color));
    const [hexInput, setHexInput] = useState(color);

    useEffect(() => {
        setRgba(hexToRgba(color));
        setHexInput(color);
    }, [color]);

    const handleRgbaChange = (key: keyof typeof rgba, val: string) => {
        const num = parseFloat(val);
        if (isNaN(num)) return;
        
        const newRgba = { ...rgba, [key]: num };
        setRgba(newRgba);
        onChange(rgbaToHex(newRgba.r, newRgba.g, newRgba.b, newRgba.a));
    };

    const handleHexChange = (val: string) => {
        setHexInput(val);
        if (/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(val)) {
             onChange(val);
        }
    };

    return (
        <div className="flex items-center justify-between p-2 border border-default-200 rounded-lg bg-default-50/50 gap-3 group hover:border-default-300 transition-colors">
            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-default-500 truncate">{label}</span>
                 <Input 
                    size="sm" 
                    variant="flat"
                    value={hexInput} 
                    onValueChange={handleHexChange} 
                    classNames={{ 
                        input: "font-mono text-xs", 
                        inputWrapper: "h-6 min-h-6 bg-transparent px-0 shadow-none data-[hover=true]:bg-transparent group-hover:text-primary transition-colors" 
                    }}
                    startContent={<span className="text-default-400 text-xs">#</span>}
                />
            </div>

            <Popover placement="bottom" showArrow={true} offset={10}>
                <PopoverTrigger>
                    <button 
                        className="w-8 h-8 rounded-full border-2 border-white dark:border-default-100 shadow-sm ring-1 ring-default-200 transition-transform hover:scale-105 active:scale-95 flex-none"
                        style={{ backgroundColor: color }} 
                        aria-label={t("tools.qr.pickColor")}
                    />
                </PopoverTrigger>
                <PopoverContent className="p-3 w-[240px]">
                    <HexAlphaColorPicker color={color} onChange={onChange} className="!w-full !h-[200px]" />
                    <div className="grid grid-cols-4 gap-2 mt-3">
                         {['r', 'g', 'b', 'a'].map((key) => (
                             <Input 
                                key={key}
                                size="sm" 
                                label={key.toUpperCase()} 
                                type="number" 
                                labelPlacement="outside"
                                placeholder="0"
                                value={key === 'a' ? rgba.a.toFixed(2) : rgba[key as keyof typeof rgba].toString()} 
                                onValueChange={(v) => handleRgbaChange(key as keyof typeof rgba, v)}
                                classNames={{ input: "text-xs px-1 text-center", label: "text-[10px] text-default-500" }}
                            />
                        ))}
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}

const DEFAULT_OPTIONS = {
    width: 250,
    height: 250,
    margin: 10,
    qrColor: "#000000",
    bgColor: "#ffffff",
    dotsType: "square" as const,
    cornersType: "square" as const,
    cornersDotType: "square" as const,
    correction: "M" as const, // L, M, Q, H
    logo: "",
}

// Escape special characters for WiFi string
const escapeWifi = (str: string) => {
    if (!str) return "";
    return str.replace(/([\\;:,])/g, '\\$1');
}

// Encode string to UTF-8 bytes represented as Latin-1 string
// This is needed because qr-code-styling uses ISO-8859-1 by default
const utf8Encode = (str: string): string => {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    return Array.from(bytes).map(b => String.fromCharCode(b)).join('');
}

export function QrTool() {
  const { t } = useTranslation()
  const { addToast } = useToast()
  const [selectedMode, setSelectedMode] = useState<QrMode>("text")
  const ref = useRef<HTMLDivElement>(null)
  const qrCode = useRef<QRCodeStyling>(null)
  const downloadRef = useRef<HTMLDivElement>(null)

  // Content State
  const [text, setText] = useState("https://example.com")
  const [wifi, setWifi] = useState<WifiState>({
      ssid: "",
      encryption: "WPA",
      hidden: false
  })

  // Settings State
  const [width, setWidth] = useState(512)
  const [realTime, setRealTime] = useState(true)
  const [qrColor, setQrColor] = useState(DEFAULT_OPTIONS.qrColor)
  const [bgColor, setBgColor] = useState(DEFAULT_OPTIONS.bgColor)
  const [dotsColor, setDotsColor] = useState(DEFAULT_OPTIONS.qrColor)
  const [cornersColor, setCornersColor] = useState(DEFAULT_OPTIONS.qrColor)
  const [correction, setCorrection] = useState(DEFAULT_OPTIONS.correction)
  const [logo, setLogo] = useState("")

  // Init QR Code instance
  useEffect(() => {
    qrCode.current = new QRCodeStyling({
        width: 250,
        height: 250,
        type: "svg", // SVG is better for sharp rendering in preview
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

  // Input Validation Helper
  const handleTextChange = (newText: string) => {
    const encoder = new TextEncoder()
    const bytes = encoder.encode(newText).length
    if (bytes > MAX_INPUT_BYTES) {
        addToast(t("tools.qr.error.inputTooLong"), "error")
        return
    }
    setText(newText)
  }

  // Combined data for update
  const getQrData = () => {
      let data = "";
      if (selectedMode === "text") {
          data = text;
      } else if (selectedMode === "wifi") {
          const { ssid, password, encryption, hidden } = wifi
          data = `WIFI:`
          
          if (encryption !== "nopass") {
              data += `T:${encryption};`
          } else {
              data += `T:nopass;`
          }
          
          data += `S:${escapeWifi(ssid)};`
          
          if (password && encryption !== "nopass") {
              data += `P:${escapeWifi(password)};`
          }
          
          if (hidden) {
              data += `H:true;`
          }
          
          data += `;;`
      }
      // Encode to UTF-8 for proper Chinese/Unicode support
      return utf8Encode(data);
  }

  const getQrOptions = (overrideOptions?: Partial<Options>): Options => {
    const data = getQrData()
    return {
        width: 250, // Preview size
        height: 250,
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
        image: logo || undefined,
        ...overrideOptions
    }
  }

  const updateQr = (overrideOptions?: Partial<Options>) => {
    if (!qrCode.current) return
    return qrCode.current.update(getQrOptions(overrideOptions))
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
  }

  const handleDownload = async () => {
    if (width > MAX_QR_SIZE) {
        addToast(t("tools.qr.error.tooLarge"), "error")
        return
    }
    if (width < MIN_QR_SIZE) {
        addToast(t("tools.qr.error.tooSmall"), "error")
        return
    }

    try {
        const options = getQrOptions({ 
            width: width, 
            height: width,
            type: "canvas"
        })

        const tempQr = new QRCodeStyling(options)
        
        if (downloadRef.current) {
            downloadRef.current.innerHTML = ""
            tempQr.append(downloadRef.current)
        }
        
        await new Promise(resolve => setTimeout(resolve, 50))
        
        const blob = await tempQr.getRawData("png")
        if (!blob) throw new Error("Failed to generate QR data")
            
        const filePath = await save({
            defaultPath: t("tools.qr.defaultFilename"),
            filters: [{
                name: t("tools.qr.pngImage"),
                extensions: ['png']
            }]
        })

        if (filePath) {
            const buffer = await blob.arrayBuffer()
            await writeFile(filePath, new Uint8Array(buffer))
        }
        
    } catch (e) {
        console.error("QR Download Error:", e)
    } finally {
        if (downloadRef.current) {
            downloadRef.current.innerHTML = ""
        }
    }
  }

  const handleLogoSelect = async () => {
      try {
          const file = await open({
              multiple: false,
              filters: [{
                  name: t("tools.qr.images"),
                  extensions: ['png', 'jpg', 'jpeg', 'svg', 'webp']
              }]
          })
          
          if (file) {
             const contents = await readFile(file as string);
             const len = contents.byteLength;
             let binary = '';
             for (let i = 0; i < len; i++) {
                 binary += String.fromCharCode(contents[i]);
             }
             const base64 = window.btoa(binary);
             
             const ext = (file as string).split('.').pop()?.toLowerCase();
             let mime = 'image/png';
             if (ext === 'svg') mime = 'image/svg+xml';
             else if (ext === 'jpg' || ext === 'jpeg') mime = 'image/jpeg';
             else if (ext === 'webp') mime = 'image/webp';
             
             setLogo(`data:${mime};base64,${base64}`)
          }
      } catch (e) {
          console.error(e)
      }
  }

  const handleReset = () => {
      setQrColor(DEFAULT_OPTIONS.qrColor)
      setBgColor(DEFAULT_OPTIONS.bgColor)
      setDotsColor(DEFAULT_OPTIONS.qrColor)
      setCornersColor(DEFAULT_OPTIONS.qrColor)
      setCorrection(DEFAULT_OPTIONS.correction)
      setLogo("")
      setWidth(512)
      if (realTime) setTimeout(() => updateQr(), 50)
  }

  return (
    <div className="flex flex-col lg:flex-row h-full gap-4 overflow-hidden p-2">
      {/* Left Panel: Configuration */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto space-y-4 scrollbar-hide pb-20 lg:pb-0">
        
        {/* Card 1: Content Input */}
        <div className="flex flex-col gap-4 p-4 bg-content1 rounded-2xl border border-default-200 shadow-sm">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-default-700 flex items-center gap-2">
                    <Type className="w-4 h-4 text-primary" />
                    {t("tools.qr.content")}
                </h3>
                <ButtonGroup variant="flat" size="sm">
                    <Button
                        onPress={() => setSelectedMode("text")}
                        color={selectedMode === "text" ? "primary" : "default"}
                        startContent={<Type className="w-4 h-4" />}
                        isIconOnly={false}
                    >
                        {t("tools.qr.text")}
                    </Button>
                    <Button
                        onPress={() => setSelectedMode("wifi")}
                        color={selectedMode === "wifi" ? "primary" : "default"}
                        startContent={<Wifi className="w-4 h-4" />}
                        isIconOnly={false}
                    >
                        {t("tools.qr.wifi")}
                    </Button>
                </ButtonGroup>
            </div>
            
             {selectedMode === "text" && <TextTab value={text} onChange={handleTextChange} />}
             {selectedMode === "wifi" && <WifiTab value={wifi} onChange={setWifi} />}
        </div>

        {/* Card 2: Appearance */}
        <div className="flex flex-col gap-4 p-4 bg-content1 rounded-2xl border border-default-200 shadow-sm">
             <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-default-700 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-warning" />
                    {t("tools.qr.style")}
                </h3>
             </div>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ColorPicker label={t("tools.qr.dots")} color={qrColor} onChange={setQrColor} t={t} />
                <ColorPicker label={t("tools.qr.background")} color={bgColor} onChange={setBgColor} t={t} />
                <ColorPicker label={t("tools.qr.corners")} color={cornersColor} onChange={setCornersColor} t={t} />
                <ColorPicker label={t("tools.qr.cornerDots")} color={dotsColor} onChange={setDotsColor} t={t} />
            </div>
        </div>

         {/* Card 3: Advanced Settings */}
        <div className="flex flex-col gap-4 p-4 bg-content1 rounded-2xl border border-default-200 shadow-sm">
             <h3 className="text-sm font-semibold text-default-700">{t("tools.qr.settings")}</h3>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <Select 
                    label={t("tools.qr.correction")} 
                    size="sm" 
                    variant="bordered"
                    selectedKeys={[correction]}
                    onChange={(e) => setCorrection(e.target.value as any)}
                    labelPlacement="outside"
                 >
                    <SelectItem key="L">{t("tools.qr.low")}</SelectItem>
                    <SelectItem key="M">{t("tools.qr.medium")}</SelectItem>
                    <SelectItem key="Q">{t("tools.qr.quartile")}</SelectItem>
                    <SelectItem key="H">{t("tools.qr.high")}</SelectItem>
                 </Select>

                 <div className="flex flex-col gap-2">
                    <span className="text-small text-default-500">{t("tools.qr.logo")}</span>
                    <div className="flex items-center gap-2 border border-default-200 rounded-xl px-3 bg-default-50/50 h-10 hover:border-default-300 transition-colors">
                        {logo ? (
                            <div className="flex items-center gap-2 w-full justify-between">
                                <div className="flex items-center gap-2">
                                    <img src={logo} alt={t("tools.qr.logoAlt")} className="w-6 h-6 object-contain" />
                                    <span className="text-xs text-default-500 truncate max-w-[100px]">Logo Set</span>
                                </div>
                                <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => setLogo("")}>
                                    <X className="w-3 h-3" />
                                </Button>
                            </div>
                        ) : (
                            <Button 
                                variant="light" 
                                size="sm"
                                className="w-full justify-start text-default-500 px-0 data-[hover=true]:bg-transparent" 
                                startContent={<Upload className="w-3 h-3" />}
                                onPress={handleLogoSelect}
                            >
                                {t("tools.qr.uploadLogo")}
                            </Button>
                        )}
                    </div>
                 </div>
             </div>
        </div>
      </div>

      {/* Right Panel: Preview & Actions */}
      <div className="flex-none w-full lg:w-[360px] flex flex-col gap-4 h-full min-h-[500px]">
           {/* Preview Card */}
          <div className="flex-1 bg-default-50/50 rounded-2xl border border-default-200 flex flex-col items-center justify-center p-6 relative overflow-hidden shadow-inner group">
              <div className="absolute inset-0 bg-grid-slate-200/50 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] pointer-events-none" />
              
              <div className="bg-white p-4 rounded-xl shadow-lg border border-default-100 relative z-10 transition-all duration-300 group-hover:shadow-xl group-hover:scale-[1.02]" ref={ref} />
              
              <div className="mt-6 text-center text-default-400 text-xs font-mono break-all px-4 py-2 bg-white/50 backdrop-blur-md rounded-lg border border-default-100 max-w-full">
                 {selectedMode === "wifi" ? t("tools.qr.wifiPreview", { ssid: wifi.ssid }) : t("tools.qr.preview")}
              </div>
          </div>
           
           {/* Actions Card */}
           <div className="bg-content1 rounded-2xl border border-default-200 p-5 shadow-sm space-y-4 shrink-0">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-default-700">{t("tools.qr.realtime")}</span>
                    <Switch size="sm" isSelected={realTime} onValueChange={setRealTime} />
                </div>
                
                <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-default-700 whitespace-nowrap">{t("tools.qr.width")}</span>
                    <Input 
                        type="number" 
                        variant="bordered"
                        size="sm"
                        value={width.toString()} 
                        onValueChange={(v) => setWidth(Number(v))}
                        className="w-28"
                        endContent={<span className="text-default-400 text-xs">px</span>}
                    />
                </div>

                <div className="pt-2 flex flex-col gap-2">
                     <div className="flex gap-2">
                        <Button 
                            className="flex-1" 
                            color="primary" 
                            onPress={handleGenerate}
                            isDisabled={realTime}
                            startContent={<Zap className="w-4 h-4" />}
                            variant={realTime ? "flat" : "solid"}
                        >
                            {t("tools.qr.generate")}
                        </Button>
                        <Button 
                            isIconOnly
                            variant="flat" 
                            color="warning" 
                            onPress={handleReset} 
                            title={t("tools.qr.reset")}
                        >
                             <RotateCcw className="w-4 h-4" />
                        </Button>
                     </div>
                    <Button 
                        className="w-full" 
                        color="secondary" 
                        onPress={handleDownload}
                        startContent={<Download className="w-4 h-4" />}
                        variant="shadow"
                    >
                        {t("tools.qr.download")}
                    </Button>
                </div>
           </div>
      </div>

      {/* Hidden container for download generation */}
      <div ref={downloadRef} className="hidden" />
    </div>
  )
}
