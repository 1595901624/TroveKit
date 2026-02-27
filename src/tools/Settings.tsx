import { Button, Card, CardBody, CardHeader, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, useDisclosure } from "@heroui/react"
import { getVersion } from "@tauri-apps/api/app"
import { openUrl } from "@tauri-apps/plugin-opener"
import { Store } from "@tauri-apps/plugin-store"
import { Github, RefreshCw, Settings2 } from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { LanguageSelector } from "../components/LanguageSelector"
import { ThemeToggle } from "../components/ThemeToggle"
import { useLog } from "../contexts/LogContext"
import { FeatureManagement } from "./settings/FeatureManagement"

export function Settings() {
  const { t } = useTranslation()
  const { addLog } = useLog()
  const [version, setVersion] = useState("v0.1.0")
  
  const cacheModal = useDisclosure()
  const featureModal = useDisclosure()
  // const logsModal = useDisclosure()

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
    <div className="max-w-5xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
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
        </div>

        <div className="space-y-6">
          <Card className="shadow-sm border border-default-200">
            <CardHeader className="flex flex-col items-start px-6 pt-6 pb-0">
              <h2 className="text-lg font-bold">{t("settings.features", "功能设置")}</h2>
              <p className="text-default-500 text-small mt-1">{t("settings.featuresDesc", "管理工具的显示与隐藏")}</p>
            </CardHeader>
            <CardBody className="px-6 py-6 gap-6">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-medium font-medium">{t("settings.featureManagement", "功能管理")}</span>
                  <span className="text-tiny text-default-400">{t("settings.featureManagementDesc", "管理算法的显示/隐藏及常用状态")}</span>
                </div>
                <Button
                  color="primary"
                  variant="flat"
                  startContent={<Settings2 size={18} />}
                  onPress={featureModal.onOpen}
                >
                  {t("settings.manage", "管理")}
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card className="shadow-sm border border-default-200">
            <CardHeader className="flex flex-col items-start px-6 pt-6 pb-0">
              <h2 className="text-lg font-bold">{t("settings.dataManagement")}</h2>
              <p className="text-default-500 text-small mt-1">{t("settings.dataManagementDesc")}</p>
            </CardHeader>
            <CardBody className="px-6 py-6 gap-6">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-medium font-medium">{t("settings.clearCache")}</span>
                  <span className="text-tiny text-default-400">{t("settings.clearCacheDesc")}</span>
                </div>
                <Button
                  color="warning"
                  variant="flat"
                  startContent={<RefreshCw size={18} />}
                  onPress={cacheModal.onOpen}
                >
                  {t("settings.clearCache")}
                </Button>
              </div>
              
              {/* <div className="flex items-center justify-between border-t border-default-100 pt-6">
                <div className="flex flex-col">
                  <span className="text-medium font-medium">{t("settings.clearLogs")}</span>
                  <span className="text-tiny text-default-400">{t("settings.clearLogsDesc")}</span>
                </div>
                <Button
                  color="danger"
                  variant="flat"
                  startContent={<Trash2 size={18} />}
                  onPress={logsModal.onOpen}
                >
                  {t("settings.clearLogs")}
                </Button>
              </div> */}
            </CardBody>
          </Card>
        </div>
      </div>

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
                {t("settings.featureManagement", "功能管理")}
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
