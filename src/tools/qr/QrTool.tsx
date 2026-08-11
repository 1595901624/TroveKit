import { useState, useEffect, useRef } from "react"
import { Button, Input, Switch, Select, SelectItem, Popover, PopoverTrigger, PopoverContent, ButtonGroup, addToast } from "../../components/ui/base-ui"
import { useTranslation } from "react-i18next"
import { TextTab } from "./TextTab"
import { WifiTab, WifiState } from "./WifiTab"
import QRCodeStyling, { Options } from "qr-code-styling"
import { Download, Upload, X, Zap, RotateCcw, Type, Wifi } from "lucide-react"
import { HexAlphaColorPicker } from "react-colorful"
import { open, save } from "@tauri-apps/plugin-dialog"
import { readFile, writeFile } from "@tauri-apps/plugin-fs"
import { getStoredItem, setStoredItem, removeStoredItem } from "../../lib/store"

type QrMode = "text" | "wifi"

const STORAGE_KEY = "qr-tool-state"

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
        <Popover placement="bottom" showArrow={true}>
            <PopoverTrigger>
                <Button
                    variant="bordered"
                    className="h-11 w-full justify-start gap-2.5 bg-background px-2.5"
                    aria-label={`${t("tools.qr.pickColor")}: ${label}`}
                >
                    <span className="h-6 w-6 shrink-0 rounded-md border border-default-300 shadow-sm" style={{ backgroundColor: color }} />
                    <span className="min-w-0 text-left">
                        <span className="block text-[11px] font-medium text-default-600">{label}</span>
                        <span className="block truncate font-mono text-[10px] text-default-400">{color.toUpperCase()}</span>
                    </span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[270px] space-y-3 p-3 shadow-xl">
                <HexAlphaColorPicker color={color} onChange={onChange} className="!w-full" />
                <Input
                    size="sm"
                    label={t("tools.qr.hexa")}
                    value={hexInput}
                    onValueChange={handleHexChange}
                    classNames={{ input: "font-mono text-xs", label: "text-xs" }}
                />
                <div className="grid grid-cols-4 gap-1.5">
                    {[
                        { key: 'r', label: t("tools.qr.red") },
                        { key: 'g', label: t("tools.qr.green") },
                        { key: 'b', label: t("tools.qr.blue") },
                        { key: 'a', label: t("tools.qr.alpha") }
                    ].map(({ key, label: channelLabel }) => (
                        <Input
                            key={key}
                            size="sm"
                            label={channelLabel}
                            type="number"
                            step={key === 'a' ? 0.1 : 1}
                            max={key === 'a' ? 1 : 255}
                            min={0}
                            value={key === 'a' ? rgba.a.toFixed(2) : rgba[key as keyof typeof rgba].toString()}
                            onValueChange={(value) => handleRgbaChange(key as keyof typeof rgba, value)}
                            classNames={{ input: "px-1 text-center text-[10px]", label: "text-[10px]" }}
                        />
                    ))}
                </div>
            </PopoverContent>
        </Popover>
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
    return str.replace(/([\\;:,])/g, '\\');
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
  
  const [selectedMode, setSelectedMode] = useState<QrMode>("text")
  const ref = useRef<HTMLDivElement>(null)
  const qrCode = useRef<QRCodeStyling>(null)
  const downloadRef = useRef<HTMLDivElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)

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

  useEffect(() => {
      let mounted = true;
      getStoredItem(STORAGE_KEY).then((stored) => {
          if (mounted && stored) {
              try {
                  const state = JSON.parse(stored);
                  if (state.selectedMode) setSelectedMode(state.selectedMode);
                  if (state.text) setText(state.text);
                  if (state.wifi) setWifi(state.wifi);
                  if (state.width) setWidth(state.width);
                  if (state.realTime !== undefined) setRealTime(state.realTime);
                  if (state.qrColor) setQrColor(state.qrColor);
                  if (state.bgColor) setBgColor(state.bgColor);
                  if (state.dotsColor) setDotsColor(state.dotsColor);
                  if (state.cornersColor) setCornersColor(state.cornersColor);
                  if (state.correction) setCorrection(state.correction);
                  if (state.logo) setLogo(state.logo);
              } catch (e) {
                  console.error("Failed to parse QR tool state", e);
              }
          }
          if (mounted) setIsLoaded(true);
      });
      return () => { mounted = false; };
  }, []);

  // Input Validation Helper
  const handleTextChange = (newText: string) => {
    const encoder = new TextEncoder()
    const bytes = encoder.encode(newText).length
    if (bytes > MAX_INPUT_BYTES) {
        addToast({ title: t("tools.qr.error.inputTooLong"), severity: "danger" })
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

  // Effect for Real-time and Saving
  useEffect(() => {
    if (!isLoaded) return;
    // Save state
    setStoredItem(STORAGE_KEY, JSON.stringify({
        selectedMode,
        text,
        wifi,
        width,
        realTime,
        qrColor,
        bgColor,
        dotsColor,
        cornersColor,
        correction,
        logo
    }));

    if (realTime) {
        // Debounce slightly to prevent flashing
        const timer = setTimeout(() => {
            updateQr()
        }, 100)
        return () => clearTimeout(timer)
    }
  }, [text, wifi, qrColor, bgColor, dotsColor, cornersColor, correction, logo, selectedMode, realTime, width, isLoaded])

  // Explicit Generate
  const handleGenerate = () => {
      updateQr()
  }

  const handleDownload = async () => {
    if (width > MAX_QR_SIZE) {
        addToast({ title: t("tools.qr.error.tooLarge"), severity: "danger" })
        return
    }
    if (width < MIN_QR_SIZE) {
        addToast({ title: t("tools.qr.error.tooSmall"), severity: "danger" })
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
      removeStoredItem(STORAGE_KEY)
      if (realTime) setTimeout(() => updateQr(), 50)
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <div className="flex min-h-[46px] shrink-0 flex-wrap items-center gap-2 rounded-xl border border-default-200 bg-default-50/70 p-1.5">
        <ButtonGroup size="sm" variant="light" className="rounded-lg border border-default-200 bg-background p-0.5">
          <Button
            size="sm"
            color={selectedMode === "text" ? "primary" : "default"}
            variant={selectedMode === "text" ? "flat" : "light"}
            className="h-7 px-3"
            onPress={() => setSelectedMode("text")}
            startContent={<Type className="h-4 w-4" />}
          >
            {t("tools.qr.text")}
          </Button>
          <Button
            size="sm"
            color={selectedMode === "wifi" ? "primary" : "default"}
            variant={selectedMode === "wifi" ? "flat" : "light"}
            className="h-7 px-3"
            onPress={() => setSelectedMode("wifi")}
            startContent={<Wifi className="h-4 w-4" />}
          >
            {t("tools.qr.wifi")}
          </Button>
        </ButtonGroup>

        <div className="hidden h-5 w-px bg-default-200 sm:block" />
        <Switch size="sm" isSelected={realTime} onValueChange={setRealTime} className="h-8 rounded-lg border border-default-200 bg-background px-3">
          {t("tools.qr.realtime")}
        </Switch>

        <Button
          size="sm"
          variant="light"
          className="ml-auto h-8 text-default-500"
          onPress={handleReset}
          startContent={<RotateCcw className="h-4 w-4" />}
        >
          {t("tools.qr.reset")}
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] overflow-hidden rounded-xl border border-default-200 bg-background lg:grid-cols-[minmax(420px,1fr)_360px] lg:grid-rows-1">
        <section className="min-h-0 min-w-0 overflow-y-auto" aria-label={t("tools.qr.content")}>
          <div className="space-y-5 p-4">
            <div className="space-y-2">
              {selectedMode === "text" && <TextTab value={text} onChange={handleTextChange} />}
              {selectedMode === "wifi" && <WifiTab value={wifi} onChange={setWifi} />}
            </div>

            <div className="space-y-3 border-t border-default-200 pt-4">
              <h2 className="text-sm font-semibold text-foreground">{t("settings.title")}</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Select
                  label={t("tools.qr.correction")}
                  size="sm"
                  variant="bordered"
                  selectedKeys={[correction]}
                  onChange={(event) => setCorrection(event.target.value as typeof correction)}
                >
                  <SelectItem key="L">{t("tools.qr.low")}</SelectItem>
                  <SelectItem key="M">{t("tools.qr.medium")}</SelectItem>
                  <SelectItem key="Q">{t("tools.qr.quartile")}</SelectItem>
                  <SelectItem key="H">{t("tools.qr.high")}</SelectItem>
                </Select>

                <div className="flex flex-col gap-1">
                  <span className="px-0.5 text-[11px] text-default-500">{t("tools.qr.logo")}</span>
                  <div className="flex h-8 items-center rounded-lg border border-default-200 bg-background px-1.5">
                    {logo ? (
                      <>
                        <img src={logo} alt={t("tools.qr.logoAlt")} className="h-6 w-6 shrink-0 object-contain" />
                        <span className="min-w-0 flex-1 truncate px-2 text-xs text-default-500">{t("tools.qr.logo")}</span>
                        <Button isIconOnly size="sm" variant="light" className="h-7 min-w-7 text-danger" onPress={() => setLogo("")} title={t("tools.qr.removeLogo")}>
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <Button variant="light" size="sm" className="h-7 w-full justify-start px-1.5 text-default-500" startContent={<Upload className="h-4 w-4" />} onPress={handleLogoSelect}>
                        {t("tools.qr.uploadLogo")}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 border-t border-default-200 pt-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">{t("tools.qr.style")}</h2>
                <p className="mt-0.5 text-[11px] text-default-400">{t("tools.qr.pickColor")}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <ColorPicker label={t("tools.qr.dots")} color={qrColor} onChange={setQrColor} t={t} />
                <ColorPicker label={t("tools.qr.background")} color={bgColor} onChange={setBgColor} t={t} />
                <ColorPicker label={t("tools.qr.corners")} color={cornersColor} onChange={setCornersColor} t={t} />
                <ColorPicker label={t("tools.qr.cornerDots")} color={dotsColor} onChange={setDotsColor} t={t} />
              </div>
            </div>
          </div>
        </section>

        <section className="flex min-h-0 min-w-0 flex-col border-t border-default-200 bg-default-50/35 lg:border-l lg:border-t-0" aria-label={t("tools.qr.preview")}>
          <div className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-default-200 bg-background px-3.5">
            <h2 className="text-sm font-semibold text-foreground">{t("tools.qr.preview")}</h2>
            <span className="text-[11px] text-default-400">250 × 250 SVG</span>
          </div>

          <div className="relative flex min-h-[290px] flex-1 flex-col items-center justify-center overflow-hidden p-5">
            <div className="pointer-events-none absolute inset-0 bg-grid-slate-200/50 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
            <div className="relative z-10 rounded-xl border border-default-100 bg-white p-3 shadow-lg" ref={ref} />
            <div className="relative z-10 mt-3 max-w-full truncate px-4 text-center font-mono text-[10px] text-default-400">
              {selectedMode === "wifi" ? t("tools.qr.wifiPreview", { ssid: wifi.ssid }) : t("tools.qr.preview")}
            </div>
          </div>

          <div className="shrink-0 space-y-3 border-t border-default-200 bg-background p-3">
            <Input
              type="number"
              size="sm"
              label={t("tools.qr.width")}
              aria-label={t("tools.qr.width")}
              value={width.toString()}
              onValueChange={(value) => setWidth(Number(value))}
              min={MIN_QR_SIZE}
              max={MAX_QR_SIZE}
              isInvalid={width < MIN_QR_SIZE || width > MAX_QR_SIZE}
              classNames={{ input: "text-right font-mono text-xs", inputWrapper: "bg-background" }}
              endContent={<span className="text-[10px] text-default-400">px</span>}
            />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="bordered" className="w-full" onPress={handleGenerate} isDisabled={realTime} startContent={<Zap className="h-4 w-4" />}>
                {t("tools.qr.generate")}
              </Button>
              <Button color="primary" className="w-full" onPress={handleDownload} startContent={<Download className="h-4 w-4" />}>
                {t("tools.qr.download")}
              </Button>
            </div>
          </div>
        </section>
      </div>

      {/* Hidden container for download generation */}
      <div ref={downloadRef} className="hidden" />
    </div>
  )
}
