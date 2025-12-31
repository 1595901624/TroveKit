import { useState } from "react"
import { Tabs, Tab } from "@heroui/react"
import { useTranslation } from "react-i18next"
import { QrTool } from "./qr/QrTool"

export function GeneratorTool() {
  const { t } = useTranslation()
  const [selectedKey, setSelectedKey] = useState<string>("qr")

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-none">
        <Tabs
          aria-label={t("nav.generators")}
          color="primary"
          selectedKey={selectedKey}
          onSelectionChange={(key) => setSelectedKey(key as string)}
        >
          <Tab key="qr" title={t("nav.qr")} />
          {/* Future generators can be added here */}
        </Tabs>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pt-4 pb-2">
        <div className={selectedKey === "qr" ? "h-full" : "hidden"}>
          <QrTool />
        </div>
      </div>
    </div>
  )
}
