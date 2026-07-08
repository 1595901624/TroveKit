import { useState, useEffect, useRef } from "react"
import { Tabs, Tab } from "@heroui/react"
import { useTranslation } from "react-i18next"
import { CaesarTab } from "./classical/CaesarTab"
import { MorseTab } from "./classical/MorseTab"
import { BaconTab } from "./classical/BaconTab"
import { useFeaturePreferences } from "../contexts/FeaturePreferencesContext"

interface ClassicalToolProps {
  activeTab?: string
  isVisible?: boolean
}

export function ClassicalTool({ activeTab }: ClassicalToolProps) {
  const { t } = useTranslation()
  const [selectedKey, setSelectedKey] = useState<string>("caesar")
  const appliedActiveTabRef = useRef<string | undefined>(undefined)
  const { getPreference } = useFeaturePreferences()

  const tabs = [
    { id: "caesar", title: t("tools.classical.caesar"), component: <CaesarTab />, featureId: "classical-caesar" },
    { id: "morse", title: t("tools.classical.morse.title"), component: <MorseTab />, featureId: "classical-morse" },
    { id: "bacon", title: t("tools.classical.bacon.title"), component: <BaconTab />, featureId: "classical-bacon" },
  ]

  const visibleTabs = tabs.filter(tab => getPreference(tab.featureId).visible)

  useEffect(() => {
    // 搜索入口传入的 activeTab 只应用一次，避免用户点击同级 Tab 后又被拉回搜索目标。
    if (activeTab && activeTab !== appliedActiveTabRef.current && visibleTabs.some(t => t.id === activeTab)) {
      appliedActiveTabRef.current = activeTab
      setSelectedKey(activeTab)
    } else if (visibleTabs.length > 0 && !visibleTabs.some(t => t.id === selectedKey)) {
      setSelectedKey(visibleTabs[0].id)
    }
  }, [activeTab, visibleTabs, selectedKey])

  if (visibleTabs.length === 0) {
    return <div className="flex items-center justify-center h-full text-default-500">{t("common.noFeatures")}</div>
  }

  // 只挂载当前选中的 Tab 内容，避免隐藏 Tab 的输入框和状态继续占用内存。
  const activeTabConfig = visibleTabs.find(tab => tab.id === selectedKey) ?? visibleTabs[0]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-none w-full overflow-x-auto [&::-webkit-scrollbar]:hidden">
        <Tabs
          aria-label={t("tools.classical.title")}
          color="primary"
          selectedKey={selectedKey}
          onSelectionChange={(key) => setSelectedKey(key as string)}
          classNames={{
            tabList: "text-sm w-full",
            tab: "text-xs"
          }}
        >
          {visibleTabs.map(tab => (
            <Tab key={tab.id} title={tab.title} />
          ))}
        </Tabs>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pt-4 pb-2">
        {activeTabConfig.component}
      </div>
    </div>
  )
}
