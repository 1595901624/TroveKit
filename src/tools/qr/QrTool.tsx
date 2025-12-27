import { useState, useEffect, useRef } from "react"
import { Tabs, Tab, Button, Input, Switch, Select, SelectItem, Popover, PopoverTrigger, PopoverContent } from "@heroui/react"
import { useTranslation } from "react-i18next"
import { TextTab } from "./TextTab"
import { WifiTab, WifiState } from "./WifiTab"
import QRCodeStyling, { Options } from "qr-code-styling"
import { Download, Upload, X, Zap, RotateCcw } from "lucide-react"
import { HexAlphaColorPicker } from "react-colorful"
import { open, save } from "@tauri-apps/plugin-dialog"
import { readFile, writeFile } from "@tauri-apps/plugin-fs"

type QrMode = "text" | "wifi"

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
}

function ColorPicker({ label, color, onChange }: ColorPickerProps) {
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
        if (key === 'a') {
             // Input is 0-100 for user friendliness? Or 0-1? Let's use 0-1 as standard but maybe display %?
             // Prompt requested A, R, G, B inputs.
             // Standard color pickers usually show 0-255 for RGB.
             // Let's assume input 'a' is 0-1 range for simplicity in calculation, 
             // but user might type 0.5.
        }
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
        <div className="flex flex-col gap-2 p-3 border border-default-200 rounded-lg bg-default-50/50">
            <div className="flex items-center justify-between">
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
                        <HexAlphaColorPicker color={color} onChange={onChange} />
                    </PopoverContent>
                </Popover>
            </div>
            
            <div className="space-y-2">
                <Input 
                    size="sm" 
                    label="Hex" 
                    value={hexInput} 
                    onValueChange={handleHexChange} 
                    classNames={{ input: "font-mono" }}
                />
                <div className="grid grid-cols-4 gap-1">
                    <Input 
                        size="sm" label="R" type="number" 
                        value={rgba.r.toString()} 
                        onValueChange={(v) => handleRgbaChange('r', v)} 
                    />
                    <Input 
                        size="sm" label="G" type="number" 
                        value={rgba.g.toString()} 
                        onValueChange={(v) => handleRgbaChange('g', v)} 
                    />
                    <Input 
                        size="sm" label="B" type="number" 
                        value={rgba.b.toString()} 
                        onValueChange={(v) => handleRgbaChange('b', v)} 
                    />
                    <Input 
                        size="sm" label="A" type="number" step={0.1} max={1} min={0}
                        value={rgba.a.toFixed(2)} 
                        onValueChange={(v) => handleRgbaChange('a', v)} 
                    />
                </div>
            </div>
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

// Escape special characters for WiFi string
const escapeWifi = (str: string) => {
    if (!str) return "";
    return str.replace(/([\\;:,])/g, '\\$1');
}

export function QrTool() {
  const { t } = useTranslation()
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
        width: 300,
        height: 300,
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

  // Combined data for update
  const getQrData = () => {
      if (selectedMode === "text") return text
      if (selectedMode === "wifi") {
          const { ssid, password, encryption, hidden } = wifi
          // Format: WIFI:T:WPA;S:mynetwork;P:mypass;;
          // Order doesn't strictly matter but convention helps.
          // Special chars in SSID and Password must be escaped.
          let data = `WIFI:`
          
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
          return data
      }
      return ""
  }

  const updateQr = (overrideOptions?: Partial<Options>) => {
    if (!qrCode.current) return
    const data = getQrData()
    
    // Default options
    const options: Options = {
        width: 300, // Preview always 300
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
        image: logo || undefined,
        ...overrideOptions
    }
    
    return qrCode.current.update(options)
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
    if (!qrCode.current) return
    try {
        // Switch to canvas for reliable PNG export
        // And set user defined dimensions
        await updateQr({ 
            width: width, 
            height: width,
            type: "canvas" // Important for getRawData to work reliably in some contexts
        })
        
        // Short delay to ensure render
        await new Promise(resolve => setTimeout(resolve, 50))
        
        // Get raw data (Blob)
        const blob = await qrCode.current.getRawData("png")
        if (!blob) throw new Error("Failed to generate QR data")
            
        // Ask user where to save
        const filePath = await save({
            defaultPath: 'qr-code.png',
            filters: [{
                name: 'PNG Image',
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
        // Always revert to preview settings
        // Revert type to svg for sharp preview
        updateQr({ 
            width: 300, 
            height: 300,
            type: "svg"
        })
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
      setWidth(128)
      if (realTime) setTimeout(() => updateQr(), 50)
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
