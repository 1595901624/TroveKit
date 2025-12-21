import { useState } from "react"
import { Layout } from "./components/Layout"
import { ThemeProvider } from "./components/theme-provider"
import { HashTool } from "./tools/HashTool"
import { ToolId } from "./components/Sidebar"
import { Card, CardBody } from "@heroui/react"
import { ArrowRight, Sparkles } from "lucide-react"

function App() {
  const [activeTool, setActiveTool] = useState<ToolId>("home")

  const renderContent = () => {
    switch (activeTool) {
      case "crypto":
        return <HashTool />
      case "home":
        return <HomeView onNavigate={setActiveTool} />
      default:
        return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
             <div className="w-16 h-16 rounded-2xl bg-default-100 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-default-400" />
             </div>
             <div>
               <h2 className="text-xl font-semibold">Coming Soon</h2>
               <p className="text-default-500 max-w-xs mx-auto mt-2">
                 The {activeTool} tool is currently under development. Stay tuned for updates!
               </p>
             </div>
          </div>
        )
    }
  }

  const getTitle = () => {
    switch (activeTool) {
      case "home": return "Dashboard"
      case "crypto": return "Hash & Cryptography"
      case "encoder": return "Encoders & Decoders"
      case "formatters": return "Formatters"
      case "generators": return "Generators"
      case "settings": return "Settings"
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
        {renderContent()}
      </Layout>
    </ThemeProvider>
  )
}

function HomeView({ onNavigate }: { onNavigate: (id: ToolId) => void }) {
  return (
    <div className="space-y-8 py-4">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Welcome to TroveKit</h2>
        <p className="text-default-500 text-lg">
          Your all-in-one developer utility belt. Secure, offline, and beautiful.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { id: "crypto", title: "Hash & Crypto", desc: "Generate MD5, SHA hashes and more.", icon: "🔒" },
          { id: "encoder", title: "Encoders", desc: "Base64, URL, HTML encoding tools.", icon: "🔤" },
          { id: "formatters", title: "Formatters", desc: "Prettify JSON, XML, and SQL.", icon: "📄" },
        ].map((item) => (
          <Card 
            key={item.id} 
            isPressable 
            onPress={() => onNavigate(item.id as ToolId)}
            className="border border-default-200 shadow-sm hover:border-primary/50 transition-colors"
          >
            <CardBody className="p-6 space-y-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-xl">
                {item.icon}
              </div>
              <div>
                <h3 className="font-semibold text-lg">{item.title}</h3>
                <p className="text-default-500 text-sm mt-1">{item.desc}</p>
              </div>
              <div className="pt-2 flex justify-end">
                <ArrowRight className="w-5 h-5 text-default-300 group-hover:text-primary transition-colors" />
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default App