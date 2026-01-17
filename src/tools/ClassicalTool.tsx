import { useState, useEffect } from "react"
import { Tabs, Tab } from "@heroui/react"
import { useTranslation } from "react-i18next"
import { CaesarTab } from "./classical/CaesarTab"
import { MorseTab } from "./classical/MorseTab"
import { BaconTab } from "./classical/BaconTab"

interface ClassicalToolProps {
  activeTab?: string
  isVisible?: boolean
}

export function ClassicalTool({ activeTab }: ClassicalToolProps) {
  const { t } = useTranslation()
  const [selectedKey, setSelectedKey] = useState<string>("caesar")

  useEffect(() => {
    if (activeTab) {
      setSelectedKey(activeTab)
    }
  }, [activeTab])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-none">
        <Tabs
          aria-label={t("tools.classical.title")}
          color="primary"
          selectedKey={selectedKey}
          onSelectionChange={(key) => setSelectedKey(key as string)}
          classNames={{
            tabList: "text-sm",
            tab: "text-xs"
          }}
        >
          <Tab key="caesar" title={t("tools.classical.caesar")} />
          <Tab key="morse" title={t("tools.classical.morse.title")} />
          <Tab key="bacon" title={t("tools.classical.bacon.title")} />
        </Tabs>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pt-4 pb-2">
        <div className={selectedKey === "caesar" ? "" : "hidden"}><CaesarTab /></div>
        <div className={selectedKey === "morse" ? "" : "hidden"}><MorseTab /></div>
        <div className={selectedKey === "bacon" ? "" : "hidden"}><BaconTab /></div>
      </div>
    </div>
  )
}