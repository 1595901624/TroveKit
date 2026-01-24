import { useState, useEffect } from "react"
import { Tabs, Tab } from "@heroui/react"
import { useTranslation } from "react-i18next"
import { UrlTab } from "./encoder/UrlTab"
import { Base64Tab } from "./encoder/Base64Tab"
import { Base32Tab } from "./encoder/Base32Tab"
import { BaseXTab } from "./encoder/BaseXTab"
import { HexTab } from "./encoder/HexTab"
import { JwtTab } from "./encoder/JwtTab"

interface EncoderToolProps {
  activeTab?: string
  isVisible?: boolean
}

export function EncoderTool({ activeTab }: EncoderToolProps) {
  const { t } = useTranslation()
  const [selectedKey, setSelectedKey] = useState<string>("url")

  useEffect(() => {
    if (activeTab) {
      setSelectedKey(activeTab)
    }
  }, [activeTab])

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
          <Tab key="url" title={t("tools.encoder.url")} />
          <Tab key="hex" title={t("tools.encoder.hex")} />
          <Tab key="base64" title={t("tools.encoder.base64")} />
          <Tab key="base32" title={t("tools.encoder.base32")} />
          <Tab key="basex" title={t("tools.encoder.baseX")} />
          <Tab key="jwt" title={t("tools.encoder.jwtToken")} />
        </Tabs>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pt-4 pb-2">
        <div className={selectedKey === "url" ? "" : "hidden"}>
          <UrlTab />
        </div>
        <div className={selectedKey === "hex" ? "" : "hidden"}>
          <HexTab />
        </div>
        <div className={selectedKey === "base64" ? "" : "hidden"}>
          <Base64Tab />
        </div>
        <div className={selectedKey === "base32" ? "" : "hidden"}>
          <Base32Tab />
        </div>
        <div className={selectedKey === "basex" ? "" : "hidden"}>
          <BaseXTab />
        </div>
        <div className={selectedKey === "jwt" ? "h-full" : "hidden"}>
          <JwtTab />
        </div>
      </div>
    </div>
  )
}
