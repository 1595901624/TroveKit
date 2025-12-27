import { useState } from "react"
import { Tabs, Tab } from "@heroui/react"
import { useTranslation } from "react-i18next"
import { CaesarTab } from "./classical/CaesarTab"

export function ClassicalTool() {
  const { t } = useTranslation()
  const [selectedKey, setSelectedKey] = useState<string>("caesar")

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-none">
        <Tabs
          aria-label={t("tools.classical.title")}
          color="primary"
          variant="underlined"
          selectedKey={selectedKey}
          onSelectionChange={(key) => setSelectedKey(key as string)}
        >
          <Tab key="caesar" title={t("tools.classical.caesar")} />
          {/* Future classical ciphers can be added here */}
        </Tabs>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pt-4 pb-2">
        <div className={selectedKey === "caesar" ? "" : "hidden"}>
          <CaesarTab />
        </div>
      </div>
    </div>
  )
}
