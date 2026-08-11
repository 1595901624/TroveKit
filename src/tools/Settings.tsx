import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, useDisclosure } from "../components/ui/base-ui"
import { getVersion } from "@tauri-apps/api/app"
import { openUrl } from "@tauri-apps/plugin-opener"
import { Store } from "@tauri-apps/plugin-store"
import { Database, ExternalLink, Github, Languages, Palette, RefreshCw, Settings2, SlidersHorizontal } from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { LanguageSelector } from "../components/LanguageSelector"
import { ThemeToggle } from "../components/ThemeToggle"
import { useLog } from "../contexts/LogContext"
import { FeatureManagement } from "./settings/FeatureManagement"

export function Settings() {
  const { t } = useTranslation()
  const { addLog } = useLog()
  const [version, setVersion] = useState("0.1.0")
  
  const cacheModal = useDisclosure()
  const featureModal = useDisclosure()
  // const logsModal = useDisclosure()

  useEffect(() => {
    getVersion().then((value) => setVersion(value.replace(/^v/i, ""))).catch(() => setVersion("0.1.0"))
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

  const handleClearCache = async () => {
    try {
      localStorage.clear()
      const store = await Store.load("store.bin")
      await store.clear()
      await store.save()
      window.location.reload()
    } catch (error) {
      console.error("Failed to clear cache:", error)
      addLog({
        method: "Clear Cache",
        input: "N/A",
        output: String(error)
      }, "error")
    }
  }

  // const handleClearLogs = () => {
  //   try {
  //     clearLogs()
  //     logsModal.onClose()
  //   } catch (error) {
  //     console.error("Failed to clear logs:", error)
  //   }
  // }

  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 pb-3">
        <section className="overflow-hidden rounded-xl border border-default-200 bg-background" aria-labelledby="appearance-settings-heading">
          <div className="flex items-start gap-3 border-b border-default-200 bg-default-50/55 px-4 py-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary"><Palette className="h-4 w-4" /></div>
            <div>
              <h2 id="appearance-settings-heading" className="text-sm font-semibold text-foreground">{t("settings.appearance")}</h2>
              <p className="mt-0.5 text-xs text-default-400">{t("settings.appearanceDesc")}</p>
            </div>
          </div>
          <div className="divide-y divide-default-200">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
              <div className="flex min-w-0 items-start gap-3">
                <Palette className="mt-0.5 h-4 w-4 shrink-0 text-default-400" />
                <div>
                  <div className="text-sm font-medium text-foreground">{t("settings.theme")}</div>
                  <div className="mt-0.5 text-xs text-default-400">{t("settings.themeDesc")}</div>
                </div>
              </div>
              <ThemeToggle showLabel variant="bordered" className="h-8 min-w-28 justify-start" />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
              <div className="flex min-w-0 items-start gap-3">
                <Languages className="mt-0.5 h-4 w-4 shrink-0 text-default-400" />
                <div>
                  <div className="text-sm font-medium text-foreground">{t("settings.language")}</div>
                  <div className="mt-0.5 text-xs text-default-400">{t("settings.languageDesc")}</div>
                </div>
              </div>
              <div className="w-full sm:w-64"><LanguageSelector /></div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="overflow-hidden rounded-xl border border-default-200 bg-background" aria-labelledby="feature-settings-heading">
            <div className="flex h-full flex-col">
              <div className="flex items-start gap-3 border-b border-default-200 bg-default-50/55 px-4 py-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary"><SlidersHorizontal className="h-4 w-4" /></div>
                <div>
                  <h2 id="feature-settings-heading" className="text-sm font-semibold text-foreground">{t("settings.features")}</h2>
                  <p className="mt-0.5 text-xs text-default-400">{t("settings.featuresDesc")}</p>
                </div>
              </div>
              <div className="flex flex-1 items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground">{t("settings.featureManagement")}</div>
                  <p className="mt-1 text-xs leading-5 text-default-400">{t("settings.featureManagementDesc")}</p>
                </div>
                <Button size="sm" color="primary" className="shrink-0" startContent={<Settings2 className="h-4 w-4" />} onPress={featureModal.onOpen}>
                  {t("settings.manage")}
                </Button>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-warning/35 bg-background" aria-labelledby="data-settings-heading">
            <div className="flex items-start gap-3 border-b border-warning/25 bg-warning/5 px-4 py-3">
              <div className="rounded-lg bg-warning/10 p-2 text-warning"><Database className="h-4 w-4" /></div>
              <div>
                <h2 id="data-settings-heading" className="text-sm font-semibold text-foreground">{t("settings.dataManagement")}</h2>
                <p className="mt-0.5 text-xs text-default-400">{t("settings.dataManagementDesc")}</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">{t("settings.clearCache")}</div>
                <p className="mt-1 text-xs leading-5 text-default-400">{t("settings.clearCacheDesc")}</p>
              </div>
              <Button size="sm" color="warning" variant="flat" className="shrink-0" startContent={<RefreshCw className="h-4 w-4" />} onPress={cacheModal.onOpen}>
                {t("settings.clearCache")}
              </Button>
            </div>
          </section>
        </div>

        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-default-200 bg-default-50/40 px-4 py-3" aria-label={t("settings.about")}>
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-default-200 bg-background p-2 text-default-500"><Github className="h-4 w-4" /></div>
            <div>
              <div className="text-sm font-medium text-foreground">TroveKit v{version}</div>
              <div className="text-xs text-default-400">© Cloris 2026</div>
            </div>
          </div>
          <Button size="sm" variant="bordered" onPress={handleGithubClick} startContent={<Github className="h-4 w-4" />} endContent={<ExternalLink className="h-3.5 w-3.5 text-default-400" />}>
            GitHub
          </Button>
        </section>
      </div>

      {/* Feature Management Modal */}
      <Modal 
        isOpen={featureModal.isOpen} 
        onClose={featureModal.onClose}
        size="3xl"
        scrollBehavior="inside"
        classNames={{
          base: "h-[80vh]",
          body: "p-0"
        }}
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                {t("settings.featureManagement")}
              </ModalHeader>
              <ModalBody>
                <FeatureManagement />
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Clear Cache Modal */}
      <Modal isOpen={cacheModal.isOpen} onClose={cacheModal.onClose}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>{t("settings.clearCache")}</ModalHeader>
              <ModalBody>
                <p>{t("settings.confirmClearCache")}</p>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  {t("common.cancel")}
                </Button>
                <Button color="warning" onPress={handleClearCache}>
                  {t("settings.confirm")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Clear Logs Modal */}
      {/* <Modal isOpen={logsModal.isOpen} onClose={logsModal.onClose}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>{t("settings.clearLogs")}</ModalHeader>
              <ModalBody>
                <p>{t("settings.confirmClearLogs")}</p>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  {t("common.cancel")}
                </Button>
                <Button color="danger" onPress={handleClearLogs}>
                  {t("common.delete")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal> */}
    </div>
  )
}
