import { Card, CardBody, CardHeader, Button } from "@heroui/react"
import { LanguageSelector } from "../components/LanguageSelector"
import { useTranslation } from "react-i18next"
import { ThemeToggle } from "../components/ThemeToggle"
import { Github } from "lucide-react"
import { openUrl } from "@tauri-apps/plugin-opener"
import { useLog } from "../contexts/LogContext"
import { useEffect, useState } from "react"
import { getVersion } from "@tauri-apps/api/app"

export function Settings() {
  const { t } = useTranslation()
  const { addLog } = useLog()
  const [version, setVersion] = useState("v0.1.0")

  useEffect(() => {
    getVersion().then(setVersion).catch(() => setVersion("v0.1.0"))
  }, [])

  const handleGithubClick = async () => {
    try {
      await openUrl("https://github.com/1595901624/trovekit")
    } catch (error) {
      console.error("Failed to open URL:", error)
      addLog({
        method: "Open URL",
        input: "https://github.com/1595901624/trovekit",
        output: String(error)
      }, "error")
    }
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Card className="shadow-sm border border-default-200">
        <CardHeader className="flex flex-col items-start px-6 pt-6 pb-0">
          <h2 className="text-lg font-bold">{t("settings.appearance")}</h2>
          <p className="text-default-500 text-small mt-1">{t("settings.appearanceDesc")}</p>
        </CardHeader>
        <CardBody className="px-6 py-6 gap-6">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-medium font-medium">{t("settings.theme")}</span>
              <span className="text-tiny text-default-400">{t("settings.themeDesc")}</span>
            </div>
            <ThemeToggle />
          </div>
        </CardBody>
      </Card>

      <Card className="shadow-sm border border-default-200">
        <CardHeader className="flex flex-col items-start px-6 pt-6 pb-0">
          <h2 className="text-lg font-bold">{t("settings.language")}</h2>
          <p className="text-default-500 text-small mt-1">{t("settings.languageDesc")}</p>
        </CardHeader>
        <CardBody className="px-6 py-6">
          <LanguageSelector />
        </CardBody>
      </Card>

      <div className="text-center text-xs text-default-400 mt-8 flex items-center justify-center gap-2">
        <span>TroveKit v{version} © Cloris 2026</span>
        <Button
          isIconOnly
          size="sm"
          variant="light"
          className="min-w-0 w-6 h-6 text-default-400 hover:text-foreground"
          onPress={handleGithubClick}
          title="GitHub Repository"
        >
          <Github size={14} />
        </Button>
      </div>
    </div>
  )
}
