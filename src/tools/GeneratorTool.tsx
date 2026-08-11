import { useTranslation } from "react-i18next"
import { QrTool } from "./qr/QrTool"
import { UuidTab } from "./generator/UuidTab"
import { useFeaturePreferences } from "../contexts/FeaturePreferencesContext"

interface GeneratorToolProps {
  activeTab?: string
  isVisible?: boolean
}

export function GeneratorTool({ activeTab }: GeneratorToolProps) {
  const { t } = useTranslation()
  const { getPreference } = useFeaturePreferences()

  const tabs = [
    { id: "uuid", title: t("tools.generator.uuid"), component: <UuidTab />, featureId: "gen-uuid" },
    { id: "qr", title: t("nav.qr"), component: <QrTool />, featureId: "gen-qr" },
  ]

  const visibleTabs = tabs.filter(tab => getPreference(tab.featureId).visible)

  if (visibleTabs.length === 0) {
    return <div className="flex items-center justify-center h-full text-default-500">{t("common.noFeatures")}</div>
  }

  // 只挂载当前选中的 Tab 内容，释放未使用生成器的预览对象和输出状态。
  const activeTabConfig = visibleTabs.find(tab => tab.id === activeTab) ?? visibleTabs[0]

  return (
    <div className="h-full min-h-0 overflow-hidden">
      <div className="h-full min-h-0">
        {activeTabConfig.component}
      </div>
    </div>
  )
}
