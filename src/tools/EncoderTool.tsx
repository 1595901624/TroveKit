import { useTranslation } from "react-i18next"
import { UrlTab } from "./encoder/UrlTab"
import { Base64Tab } from "./encoder/Base64Tab"
import { Base32Tab } from "./encoder/Base32Tab"
import { BaseXTab } from "./encoder/BaseXTab"
import { HexTab } from "./encoder/HexTab"
import { BrainfuckTab } from "./encoder/BrainfuckTab"
import { JwtTab } from "./encoder/JwtTab"
import { useFeaturePreferences } from "../contexts/FeaturePreferencesContext"

interface EncoderToolProps {
  activeTab?: string
  isVisible?: boolean
}

export function EncoderTool({ activeTab }: EncoderToolProps) {
  const { t } = useTranslation()
  const { getPreference } = useFeaturePreferences()

  const tabs = [
    { id: "url", title: t("tools.encoder.url"), component: <UrlTab />, featureId: "encoder-url" },
    { id: "hex", title: t("tools.encoder.hex"), component: <HexTab />, featureId: "encoder-hex" },
    { id: "base64", title: t("tools.encoder.base64"), component: <Base64Tab />, featureId: "encoder-base64" },
    { id: "base32", title: t("tools.encoder.base32"), component: <Base32Tab />, featureId: "encoder-base32" },
    { id: "basex", title: t("tools.encoder.baseX"), component: <BaseXTab />, featureId: "encoder-basex" },
    { id: "brainfuck", title: t("tools.encoder.brainfuck"), component: <BrainfuckTab />, featureId: "encoder-brainfuck" }, // Wait, brainfuck is not in useFeatures? Let me check.
    { id: "jwt", title: t("tools.encoder.jwtToken"), component: <JwtTab />, featureId: "encoder-jwt", className: "h-full" },
  ]

  const visibleTabs = tabs.filter(tab => getPreference(tab.featureId).visible)

  if (visibleTabs.length === 0) {
    return <div className="flex items-center justify-center h-full text-default-500">{t("common.noFeatures")}</div>
  }

  // 只挂载当前选中的 Tab 内容，切换回来时由各 Tab 自身从持久化存储恢复输入输出。
  const activeTabConfig = visibleTabs.find(tab => tab.id === activeTab) ?? visibleTabs[0]

  return (
    <div className="h-full min-h-0 overflow-y-auto pb-2">
        <div className={activeTabConfig.className || ""}>
          {activeTabConfig.component}
        </div>
    </div>
  )
}
