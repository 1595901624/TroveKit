import { useState, useEffect } from "react"
import { Tabs, Tab } from "@heroui/react"
import { useTranslation } from "react-i18next"
import { Md2Tab } from "./hash/Md2Tab"
import { Md4Tab } from "./hash/Md4Tab"
import { Md5Tab } from "./hash/Md5Tab"
import { ShaTab } from "./hash/ShaTab"
import { AesTab2 } from "./hash/AesTab2"
import { RsaTab } from "./hash/RsaTab"
import { Sm2Tab } from "./hash/Sm2Tab"
import { Sm3Tab } from "./hash/Sm3Tab"
import { Sm4Tab } from "./hash/Sm4Tab"
import { DesTab } from "./hash/DesTab"
import { TripleDesTab } from "./hash/TripleDesTab"
import { Rc4Tab } from "./hash/Rc4Tab"
import { ChaCha20Tab } from "./hash/ChaCha20Tab"
import { HmacMd5Tab } from "./hash/HmacMd5Tab"
import { BlakeTab } from "./hash/BlakeTab"
import { TriviumTab } from "./hash/TriviumTab"
import { useFeaturePreferences } from "../contexts/FeaturePreferencesContext"

interface HashToolProps {
  activeTab?: string
  isVisible?: boolean
}

export function HashTool({ activeTab }: HashToolProps) {
  const { t } = useTranslation()
  const [selectedKey, setSelectedKey] = useState<string>("md2")
  const { getPreference } = useFeaturePreferences()

  const tabs = [
    { id: "md2", title: t("tools.hash.md2"), component: <Md2Tab />, featureId: "crypto-md2" },
    { id: "md4", title: t("tools.hash.md4"), component: <Md4Tab />, featureId: "crypto-md4" },
    { id: "md5", title: t("tools.hash.md5"), component: <Md5Tab />, featureId: "crypto-md5" },
    { id: "hmacMd5", title: t("tools.hash.hmacMd5"), component: <HmacMd5Tab />, featureId: "crypto-hmac" },
    { id: "sha", title: t("tools.hash.sha"), component: <ShaTab />, featureId: "crypto-sha" },
    { id: "aes", title: t("tools.hash.aes"), component: <AesTab2 />, featureId: "crypto-aes" },
    { id: "des", title: t("tools.hash.des"), component: <DesTab />, featureId: "crypto-des" },
    { id: "tripleDes", title: t("tools.hash.tripleDes"), component: <TripleDesTab />, featureId: "crypto-triple-des" },
    { id: "rsa", title: t("tools.hash.rsa"), component: <RsaTab />, featureId: "crypto-rsa" },
    { id: "rc4", title: t("tools.hash.rc4"), component: <Rc4Tab />, featureId: "crypto-rc4" },
    { id: "sm2", title: t("tools.hash.sm2"), component: <Sm2Tab />, featureId: "crypto-sm2" },
    { id: "sm3", title: t("tools.hash.sm3"), component: <Sm3Tab />, featureId: "crypto-sm3" },
    { id: "sm4", title: t("tools.hash.sm4"), component: <Sm4Tab />, featureId: "crypto-sm4" },
    { id: "chacha20", title: t("tools.hash.chacha20"), component: <ChaCha20Tab />, featureId: "crypto-chacha20" },
    { id: "trivium", title: t("tools.hash.trivium"), component: <TriviumTab />, featureId: "crypto-trivium" },
    { id: "blake", title: t("tools.hash.blake"), component: <BlakeTab />, featureId: "crypto-blake" },
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
          aria-label={t("tools.hash.hashOptions")}
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
          <div key={tab.id} className={selectedKey === tab.id ? "" : "hidden"}>
            {tab.component}
          </div>
        ))}
      </div>
    </div>
  )
}