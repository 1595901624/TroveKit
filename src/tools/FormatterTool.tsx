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
  const { getPreference } = useFeaturePreferences()

  const tabs = [
    { id: "json", title: t("tools.formatter.json"), component: <JsonTab />, featureId: "fmt-json" },
    { id: "xml", title: t("tools.formatter.xml"), component: <XmlTab />, featureId: "fmt-xml" },
    { id: "css", title: t("tools.formatter.css"), component: <CssTab />, featureId: "fmt-css" },
    { id: "sql", title: t("tools.formatter.sql"), component: <SqlTab />, featureId: "fmt-sql" },
  ]

  const visibleTabs = tabs.filter(tab => getPreference(tab.featureId).visible)

  if (visibleTabs.length === 0) {
    return <div className="flex items-center justify-center h-full text-default-500">{t("common.noFeatures")}</div>
  }

  // 只挂载当前选中的 Tab 内容，尤其避免多个 Monaco 编辑器同时常驻。
  const activeTabConfig = visibleTabs.find(tab => tab.id === activeTab) ?? visibleTabs[0]

  return (
    <div className="h-full min-h-0 overflow-y-auto pb-2">
        <div className="h-full">
          {activeTabConfig.component}
        </div>
    </div>
  )
}
