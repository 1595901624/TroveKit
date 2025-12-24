import { useState } from "react"
import { Tabs, Tab } from "@heroui/react"
import { useTranslation } from "react-i18next"
import { UrlTab } from "./encoder/UrlTab"
import { Base64Tab } from "./encoder/Base64Tab"
import { Base32Tab } from "./encoder/Base32Tab"
import { BaseXTab } from "./encoder/BaseXTab"

export function EncoderTool() {
  const { t } = useTranslation()
  const [selectedKey, setSelectedKey] = useState<string>("url")

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-none">
        <Tabs
          aria-label={t("tools.encoder.encoderOptions")}
          color="primary"
          variant="underlined"
          selectedKey={selectedKey}
          onSelectionChange={(key) => setSelectedKey(key as string)}
        >
          <Tab key="url" title={t("tools.encoder.url")} />
          <Tab key="base64" title={t("tools.encoder.base64")} />
          <Tab key="base32" title={t("tools.encoder.base32")} />
          <Tab key="basex" title={t("tools.encoder.baseX")} />
        </Tabs>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pt-4 pb-2">
        <div className={selectedKey === "url" ? "" : "hidden"}>
          <UrlTab />
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
      </div>
    </div>
  )
}
