import { useTranslation } from "react-i18next"
import { JsonXmlTab } from "./converter/JsonXmlTab"
import { JsonYamlTab } from "./converter/JsonYamlTab"
import { SubnetTab } from "./converter/SubnetTab"
import { TimestampTab } from "./converter/TimestampTab"
import { useFeaturePreferences } from "../contexts/FeaturePreferencesContext"

export function ConverterTool({ isVisible = true, activeTab }: { isVisible?: boolean; activeTab?: string }) {
  const { t } = useTranslation()
  const { getPreference } = useFeaturePreferences()

  const tabs = [
    { id: "timestamp", title: t("tools.converter.timestamp"), component: <TimestampTab isVisible={isVisible && activeTab === "timestamp"} />, featureId: "conv-timestamp" },
    { id: "subnet", title: t("tools.converter.subnet"), component: <SubnetTab />, featureId: "conv-subnet" },
    { id: "jsonXml", title: t("tools.converter.jsonXml"), component: <JsonXmlTab />, featureId: "conv-jsonxml" },
    { id: "jsonYaml", title: t("tools.converter.jsonYaml"), component: <JsonYamlTab />, featureId: "conv-jsonyaml" },
  ]

  const visibleTabs = tabs.filter(tab => getPreference(tab.featureId).visible)

  if (visibleTabs.length === 0) {
    return <div className="flex items-center justify-center h-full text-default-500">{t("common.noFeatures")}</div>
  }

  // 只挂载当前选中的 Tab 内容，编辑内容由具体转换器 Tab 的持久化逻辑保存。
  const activeTabConfig = visibleTabs.find(tab => tab.id === activeTab) ?? visibleTabs[0]

  return (
    <div className="h-full min-h-0 overflow-hidden">
      <div className="h-full min-h-0">
        {activeTabConfig.component}
      </div>
    </div>
  )
}
