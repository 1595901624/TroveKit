import { useState } from "react"
import { Tabs, Tab } from "@heroui/react"
import { useTranslation } from "react-i18next"
import { QrTool } from "./qr/QrTool"
import { UuidTab } from "./generator/UuidTab"

export function GeneratorTool() {
  const { t } = useTranslation()
  const [selectedKey, setSelectedKey] = useState<string>("uuid")

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-none">
        <Tabs
          aria-label={t("nav.generators")}
          color="primary"
          selectedKey={selectedKey}
          onSelectionChange={(key) => setSelectedKey(key as string)}
          classNames={{
            tabList: "text-sm",
            tab: "text-xs"
          }}
        >
          <Tab key="uuid" title={t("tools.generator.uuid")} />
          <Tab key="qr" title={t("nav.qr")} />
        </Tabs>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pt-4 pb-2">
        <div className={selectedKey === "uuid" ? "h-full" : "hidden h-full"}>
          <UuidTab />
        </div>
        <div className={selectedKey === "qr" ? "h-full" : "hidden h-full"}>
          <QrTool />
        </div>
      </div>
    </div>
  )
}
