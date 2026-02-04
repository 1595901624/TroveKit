import { useState, useEffect } from "react"
import { Layout } from "./components/Layout"
import { ThemeProvider } from "./components/theme-provider"
import { HashTool } from "./tools/HashTool"
import { EncoderTool } from "./tools/EncoderTool"
import { ClassicalTool } from "./tools/ClassicalTool"
import { GeneratorTool } from "./tools/GeneratorTool"
import { Settings } from "./tools/Settings"
import { FormatterTool } from "./tools/FormatterTool"
import { ConverterTool } from "./tools/ConverterTool"
import { OthersTool } from "./tools/OthersTool"
import { LogManagementTool } from "./tools/LogManagementTool"
import { ToolId } from "./components/Sidebar"
import { Card, CardBody } from "@heroui/react"
import { ArrowRight, Lock, Code2, FileCode2, Shield, Wand2, ArrowRightLeft } from "lucide-react"
import { useTranslation } from "react-i18next"
import { getStoredItem, setStoredItem } from "./lib/store"

function App() {
  const [activeTool, setActiveTool] = useState<ToolId>("home")
  const [activeTab, setActiveTab] = useState<string | undefined>()
  const [visitedTools, setVisitedTools] = useState<Set<ToolId>>(new Set(["home"]))
  const { t, i18n } = useTranslation()

  useEffect(() => {
    setVisitedTools(prev => {
      if (prev.has(activeTool)) return prev
      const newSet = new Set(prev)
      newSet.add(activeTool)
      return newSet
    })
  }, [activeTool])

  useEffect(() => {
    getStoredItem("i18nextLng").then((lang) => {
      if (lang) {
        i18n.changeLanguage(lang)
      } else {
        const systemLang = navigator.language
        let targetLang = "en"

        if (systemLang.startsWith("zh")) {
          const lower = systemLang.toLowerCase()
          if (lower.includes("tw") || lower.includes("hant")) {
            targetLang = "zh-TW"
          } else if (lower.includes("hk")) {
            targetLang = "zh-HK"
          } else {
            targetLang = "zh"
          }
        } else if (systemLang.startsWith("ja")) {
          targetLang = "ja"
        }

        i18n.changeLanguage(targetLang)
        // Store the detected language
        setStoredItem("i18nextLng", targetLang)
      }
    })
  }, [i18n])

  const handleToolChange = (id: ToolId) => {
    setActiveTool(id)
    setActiveTab(undefined)
  }

  const handleNavigate = (toolId: ToolId, tabId?: string) => {
    setActiveTool(toolId)
    setActiveTab(tabId)
  }

  const getTitle = () => {
    switch (activeTool) {
      case "home": return t("home.title")
      case "crypto": return t("nav.crypto")
      case "encoder": return t("nav.encoder")
      case "classical": return t("nav.classical")
      case "formatters": return t("nav.formatters")
      case "generators": return t("nav.generators")
      case "converter": return t("nav.converter")
      case "others": return t("nav.others")
      case "logManagement": return t("nav.logManagement")
      case "settings": return t("settings.title")
      default: return "TroveKit"
    }
  }

  return (
    <ThemeProvider storageKey="trovekit-theme">
      <Layout
        activeTool={activeTool}
        onToolChange={handleToolChange}
        onNavigate={handleNavigate}
        title={getTitle()}
      >
        <div className="max-w-7xl mx-auto h-full">
          {visitedTools.has("home") && (
            <div className={activeTool === "home" ? "block h-full" : "hidden"}>
              <HomeView onNavigate={handleToolChange} />
            </div>
          )}
          {visitedTools.has("crypto") && (
            <div className={activeTool === "crypto" ? "block h-full" : "hidden"}>
              <HashTool activeTab={activeTool === "crypto" ? activeTab : undefined} isVisible={activeTool === "crypto"} />
            </div>
          )}
          {visitedTools.has("encoder") && (
            <div className={activeTool === "encoder" ? "block h-full" : "hidden"}>
              <EncoderTool activeTab={activeTool === "encoder" ? activeTab : undefined} isVisible={activeTool === "encoder"} />
            </div>
          )}
          {visitedTools.has("classical") && (
            <div className={activeTool === "classical" ? "block h-full" : "hidden"}>
              <ClassicalTool activeTab={activeTool === "classical" ? activeTab : undefined} isVisible={activeTool === "classical"} />
            </div>
          )}
          {visitedTools.has("formatters") && (
            <div className={activeTool === "formatters" ? "block h-full" : "hidden"}>
              <FormatterTool activeTab={activeTool === "formatters" ? activeTab : undefined} isVisible={activeTool === "formatters"} />
            </div>
          )}
          {visitedTools.has("generators") && (
            <div className={activeTool === "generators" ? "block h-full" : "hidden"}>
              <GeneratorTool activeTab={activeTool === "generators" ? activeTab : undefined} isVisible={activeTool === "generators"} />
            </div>
          )}
          {visitedTools.has("converter") && (
            <div className={activeTool === "converter" ? "block h-full" : "hidden"}>
              <ConverterTool isVisible={activeTool === "converter"} activeTab={activeTool === "converter" ? activeTab : undefined} />
            </div>
          )}
          {visitedTools.has("others") && (
            <div className={activeTool === "others" ? "block h-full" : "hidden"}>
              <OthersTool activeTab={activeTool === "others" ? activeTab : undefined} isVisible={activeTool === "others"} />
            </div>
          )}
          {visitedTools.has("logManagement") && (
            <div className={activeTool === "logManagement" ? "block h-full" : "hidden"}>
              <LogManagementTool />
            </div>
          )}
          {visitedTools.has("settings") && (
            <div className={activeTool === "settings" ? "block h-full" : "hidden"}>
              <Settings />
            </div>
          )}
        </div>
      </Layout>
    </ThemeProvider>
  )
}

function HomeView({ onNavigate }: { onNavigate: (id: ToolId) => void }) {
  const { t } = useTranslation()

  const tools = [
    {
      id: "crypto",
      title: t("home.cards.crypto.title"),
      desc: t("home.cards.crypto.desc"),
      icon: <Lock className="w-6 h-6" />,
      gradient: "from-blue-500/20 to-indigo-500/20",
      iconColor: "text-blue-600 dark:text-blue-400"
    },
    {
      id: "classical",
      title: t("home.cards.classical.title"),
      desc: t("home.cards.classical.desc"),
      icon: <Shield className="w-6 h-6" />,
      gradient: "from-orange-500/20 to-red-500/20",
      iconColor: "text-orange-600 dark:text-orange-400"
    },
    {
      id: "generators",
      title: t("nav.generators"),
      desc: t("home.cards.qr.desc"),
      icon: <Wand2 className="w-6 h-6" />,
      gradient: "from-amber-500/20 to-yellow-500/20",
      iconColor: "text-amber-600 dark:text-amber-400"
    },
    {
      id: "encoder",
      title: t("home.cards.encoder.title"),
      desc: t("home.cards.encoder.desc"),
      icon: <Code2 className="w-6 h-6" />,
      gradient: "from-purple-500/20 to-pink-500/20",
      iconColor: "text-purple-600 dark:text-purple-400"
    },
    {
      id: "formatters",
      title: t("home.cards.formatters.title"),
      desc: t("home.cards.formatters.desc"),
      icon: <FileCode2 className="w-6 h-6" />,
      gradient: "from-emerald-500/20 to-teal-500/20",
      iconColor: "text-emerald-600 dark:text-emerald-400"
    },
    {
      id: "converter",
      title: t("nav.converter", "转换器"),
      desc: "JSON 与 XML 互转",
      icon: <ArrowRightLeft className="w-6 h-6" />,
      gradient: "from-cyan-500/20 to-blue-500/20",
      iconColor: "text-cyan-600 dark:text-cyan-400"
    },
  ]

  return (
    <div className="space-y-12 py-8 animate-in fade-in duration-500">
      <div className="space-y-3 max-w-2xl">
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70">
            {t("home.welcome")}
          </span>
        </h2>
        <p className="text-default-500 text-lg leading-relaxed">
          {t("home.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((item) => (
          <Card
            key={item.id}
            isPressable
            onPress={() => onNavigate(item.id as ToolId)}
            className="group border border-default-200/50 bg-background/60 backdrop-blur-sm hover:bg-default-100/50 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-primary/5"
            shadow="none"
          >
            <CardBody className="p-8 space-y-6">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
                <div className={item.iconColor}>
                  {item.icon}
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-lg tracking-tight group-hover:text-primary transition-colors">{item.title}</h3>
                <p className="text-default-500 text-sm leading-relaxed line-clamp-2">{item.desc}</p>
              </div>
              <div className="pt-2 flex items-center gap-2 text-primary font-medium opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                <span className="text-xs">Get started</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default App
