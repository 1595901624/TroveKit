import { useState, useEffect } from "react"
import { Tabs, Tab } from "@heroui/react"
import { useTranslation } from "react-i18next"
import { JsonTab } from "./formatter/JsonTab"
import { XmlTab } from "./formatter/XmlTab"
import { CssTab } from "./formatter/CssTab"
import { SqlTab } from "./formatter/SqlTab"
import { useFeaturePreferences } from "../contexts/FeaturePreferencesContext"

interface FormatterToolProps {
  activeTab?: string
  isVisible?: boolean
}

export function FormatterTool({ activeTab }: FormatterToolProps) {
  const { t } = useTranslation()
  const [selectedKey, setSelectedKey] = useState<string>("json")
  const { getPreference } = useFeaturePreferences()

  const tabs = [
    { id: "json", title: t("tools.formatter.json"), component: <JsonTab />, featureId: "fmt-json" },
    { id: "xml", title: t("tools.formatter.xml"), component: <XmlTab />, featureId: "fmt-xml" },
    { id: "css", title: t("tools.formatter.css"), component: <CssTab />, featureId: "fmt-css" },
    { id: "sql", title: t("tools.formatter.sql"), component: <SqlTab />, featureId: "fmt-sql" },
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
          aria-label={t("tools.formatter.formatterOptions")}
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
