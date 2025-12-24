import { useState } from "react"
import { Layout } from "./components/Layout"
import { ThemeProvider } from "./components/theme-provider"
import { HashTool } from "./tools/HashTool"
import { EncoderTool } from "./tools/EncoderTool"
import { Settings } from "./tools/Settings"
import { FormatterTool } from "./tools/FormatterTool"
import { ToolId } from "./components/Sidebar"
import { Card, CardBody, Button } from "@heroui/react"
import { ArrowRight, Sparkles, Lock, Code2, FileCode2 } from "lucide-react"
import { useTranslation } from "react-i18next"

function App() {
  const [activeTool, setActiveTool] = useState<ToolId>("home")
  const { t } = useTranslation()

  const getTitle = () => {
    switch (activeTool) {
      case "home": return t("home.title")
      case "crypto": return t("nav.crypto")
      case "encoder": return t("nav.encoder")
      case "formatters": return t("nav.formatters")
      case "generators": return t("nav.generators")
      case "settings": return t("settings.title")
      default: return "TroveKit"
    }
  }

  return (
    <ThemeProvider storageKey="trovekit-theme">
      <Layout 
        activeTool={activeTool} 
        onToolChange={setActiveTool}
        title={getTitle()}
      >
        <div className="max-w-7xl mx-auto h-full">
          <div className={activeTool === "home" ? "block h-full" : "hidden"}>
            <HomeView onNavigate={setActiveTool} />
          </div>
          <div className={activeTool === "crypto" ? "block h-full" : "hidden"}>
            <HashTool />
          </div>
          <div className={activeTool === "encoder" ? "block h-full" : "hidden"}>
            <EncoderTool />
          </div>
          <div className={activeTool === "formatters" ? "block h-full" : "hidden"}>
            <FormatterTool />
          </div>
          <div className={activeTool === "settings" ? "block h-full" : "hidden"}>
            <Settings />
          </div>
          
          {["generators"].includes(activeTool) && (
            <ComingSoon activeTool={activeTool} onNavigate={setActiveTool} />
          )}
        </div>
      </Layout>
    </ThemeProvider>
  )
}

function ComingSoon({ activeTool, onNavigate }: { activeTool: ToolId, onNavigate: (id: ToolId) => void }) {
  const { t } = useTranslation()
  
  return (
    <div className="flex flex-col items-center justify-center h-[70vh] text-center px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
       <div className="relative mb-8">
          <div className="absolute inset-0 blur-3xl bg-primary/20 rounded-full animate-pulse" />
          <div className="relative w-20 h-20 rounded-3xl bg-default-100/50 backdrop-blur-xl border border-default-200 flex items-center justify-center shadow-2xl">
             <Sparkles className="w-10 h-10 text-primary" />
          </div>
       </div>
       <div className="space-y-3">
         <h2 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70">
           {t("common.comingSoon")}
         </h2>
         <p className="text-default-500 max-w-sm mx-auto text-lg leading-relaxed">
           {t("common.comingSoonDesc", { tool: t(`nav.${activeTool}` as any) })}
         </p>
         <div className="pt-4">
           <Button variant="flat" color="primary" radius="full" onPress={() => onNavigate("home")}>
             {t("nav.home")}
           </Button>
         </div>
       </div>
    </div>
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
  ]

  return (
    <div className="space-y-12 py-8 animate-in fade-in duration-500">
      <div className="space-y-3 max-w-2xl">
        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70">
            {t("home.welcome")}
          </span>
        </h2>
        <p className="text-default-500 text-xl leading-relaxed">
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
                <h3 className="font-bold text-xl tracking-tight group-hover:text-primary transition-colors">{item.title}</h3>
                <p className="text-default-500 text-base leading-relaxed line-clamp-2">{item.desc}</p>
              </div>
              <div className="pt-2 flex items-center gap-2 text-primary font-medium opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                <span className="text-sm">Get started</span>
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
