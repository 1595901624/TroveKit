import { useTranslation } from "react-i18next"
import { RegexTool } from "./regex/RegexTool"
import { useFeaturePreferences } from "../contexts/FeaturePreferencesContext"

/**
 * 其他工具组件的属性接口
 */
interface OthersToolProps {
  /** 当前激活的标签页 ID */
  activeTab?: string
  /** 组件是否可见 */
  isVisible?: boolean
}

/**
 * 其他工具组件
 * 用于展示和管理各类辅助工具（如正则表达式工具等）
 * 支持标签页切换和功能偏好设置
 */
export function OthersTool({ activeTab }: OthersToolProps) {
  const { t } = useTranslation()
  const { getPreference } = useFeaturePreferences()

  // 定义所有可用的标签页配置
  const tabs = [
    { id: "regex", title: t("nav.regex"), component: <RegexTool />, featureId: "others-regex" },
  ]

  // 根据用户偏好设置过滤出可见的标签页
  const visibleTabs = tabs.filter(tab => getPreference(tab.featureId).visible)

  // 如果没有可见的标签页，显示提示信息
  if (visibleTabs.length === 0) {
    return <div className="flex items-center justify-center h-full text-default-500">{t("common.noFeatures")}</div>
  }

  // 只挂载当前选中的 Tab 内容，避免正则等重型工具在后台继续持有编辑器状态。
  const activeTabConfig = visibleTabs.find(tab => tab.id === activeTab) ?? visibleTabs[0]

  return (
    <div className="h-full min-h-0 overflow-y-auto pb-2">
        <div className="h-full">
          {activeTabConfig.component}
        </div>
    </div>
  )
}

