import { Card, CardBody, CardHeader, Button } from "@heroui/react"
import { LanguageSelector } from "../components/LanguageSelector"
import { useTranslation } from "react-i18next"
import { ThemeToggle } from "../components/ThemeToggle"
import { Github } from "lucide-react"
import { openUrl } from "@tauri-apps/plugin-opener"

export function Settings() {
  const { t } = useTranslation()

  const handleGithubClick = async () => {
    try {
      await openUrl("https://github.com/1595901624/trovekit")
    } catch (error) {
      console.error("Failed to open URL:", error)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Card className="shadow-sm border border-default-200">
        <CardHeader className="flex flex-col items-start px-6 pt-6 pb-0">
          <h2 className="text-xl font-bold">{t("settings.appearance")}</h2>
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
          <h2 className="text-xl font-bold">{t("settings.language")}</h2>
          <p className="text-default-500 text-small mt-1">{t("settings.languageDesc")}</p>
        </CardHeader>
        <CardBody className="px-6 py-6">
          <LanguageSelector />
        </CardBody>
      </Card>

      <div className="text-center text-xs text-default-400 mt-8 flex items-center justify-center gap-2">
        <span>TroveKit • © 2025 Cloris</span>
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
