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
  const { getPreference } = useFeaturePreferences()

  const tabs = [
    { id: "caesar", title: t("tools.classical.caesar"), component: <CaesarTab />, featureId: "classical-caesar" },
    { id: "morse", title: t("tools.classical.morse.title"), component: <MorseTab />, featureId: "classical-morse" },
    { id: "bacon", title: t("tools.classical.bacon.title"), component: <BaconTab />, featureId: "classical-bacon" },
  ]

  const visibleTabs = tabs.filter(tab => getPreference(tab.featureId).visible)

  if (visibleTabs.length === 0) {
    return <div className="flex items-center justify-center h-full text-default-500">{t("common.noFeatures")}</div>
  }

  // 只挂载当前选中的 Tab 内容，避免隐藏 Tab 的输入框和状态继续占用内存。
  const activeTabConfig = visibleTabs.find(tab => tab.id === activeTab) ?? visibleTabs[0]

  return (
    <div className="h-full min-h-0 overflow-y-auto pb-2">
        {activeTabConfig.component}
    </div>
  )
}
