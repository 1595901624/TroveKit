import { useState, useEffect } from "react"
import { Tabs, Tab } from "@heroui/react"
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
  const [selectedKey, setSelectedKey] = useState<string>("url")
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
          aria-label={t("tools.encoder.encoderOptions")}
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
          <div key={tab.id} className={selectedKey === tab.id ? (tab.className || "") : "hidden"}>
            {tab.component}
          </div>
        ))}
      </div>
    </div>
  )
}
