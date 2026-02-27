import { useState, useEffect } from "react"
import { Tabs, Tab } from "@heroui/react"
import { useTranslation } from "react-i18next"
import { JsonXmlTab } from "./converter/JsonXmlTab"
import { JsonYamlTab } from "./converter/JsonYamlTab"
import { SubnetTab } from "./converter/SubnetTab"
import { TimestampTab } from "./converter/TimestampTab"
import { useFeaturePreferences } from "../contexts/FeaturePreferencesContext"

export function ConverterTool({ isVisible = true, activeTab }: { isVisible?: boolean; activeTab?: string }) {
  const { t } = useTranslation()
  const [selectedKey, setSelectedKey] = useState<string>("timestamp")
  const { getPreference } = useFeaturePreferences()

  const tabs = [
    { id: "timestamp", title: t("tools.converter.timestamp"), component: <TimestampTab isVisible={isVisible && selectedKey === "timestamp"} />, featureId: "conv-timestamp" },
    { id: "subnet", title: t("tools.converter.subnet"), component: <SubnetTab />, featureId: "conv-subnet" },
    { id: "jsonXml", title: t("tools.converter.jsonXml"), component: <JsonXmlTab />, featureId: "conv-jsonxml" },
    { id: "jsonYaml", title: t("tools.converter.jsonYaml"), component: <JsonYamlTab />, featureId: "conv-jsonyaml" },
  ]

  const visibleTabs = tabs.filter(tab => getPreference(tab.featureId).visible)

  useEffect(() => {
    if (activeTab && visibleTabs.some(t => t.id === activeTab)) {
      setSelectedKey(activeTab)
    } else if (visibleTabs.length > 0 && !visibleTabs.some(t => t.id === selectedKey)) {
      setSelectedKey(visibleTabs[0].id)
    }
  }, [activeTab, visibleTabs, selectedKey])

  if (visibleTabs.length === 0) {
    return <div className="flex items-center justify-center h-full text-default-500">{t("common.noFeatures")}</div>
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-none w-full overflow-x-auto [&::-webkit-scrollbar]:hidden">
        <Tabs
          aria-label={t("tools.converter.converterOptions")}
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
        {visibleTabs.map(tab => (
          <div key={tab.id} className={selectedKey === tab.id ? "h-full" : "hidden h-full"}>
            {tab.component}
          </div>
        ))}
      </div>
    </div>
  )
}
