import { useState } from "react"
import { Tabs, Tab } from "@heroui/react"
import { useTranslation } from "react-i18next"
import { Md2Tab } from "./hash/Md2Tab"
import { Md5Tab } from "./hash/Md5Tab"
import { ShaTab } from "./hash/ShaTab"
import { AesTab } from "./hash/AesTab"
import { DesTab } from "./hash/DesTab"

export function HashTool() {
  const { t } = useTranslation()
  const [selectedKey, setSelectedKey] = useState<string>("md2")

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-none">
        <Tabs
          aria-label={t("tools.hash.hashOptions")}
          color="primary"
          variant="underlined"
          selectedKey={selectedKey}
          onSelectionChange={(key) => setSelectedKey(key as string)}
        >
          <Tab key="md2" title={t("tools.hash.md2")} />
          <Tab key="md5" title={t("tools.hash.md5")} />
          <Tab key="sha" title={t("tools.hash.sha")} />
          <Tab key="aes" title={t("tools.hash.aes")} />
          <Tab key="des" title={t("tools.hash.des", "DES")} />
        </Tabs>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pt-4 pb-2">
        <div className={selectedKey === "md2" ? "" : "hidden"}>
          <Md2Tab />
        </div>
        <div className={selectedKey === "md5" ? "" : "hidden"}>
          <Md5Tab />
        </div>
        <div className={selectedKey === "sha" ? "" : "hidden"}>
          <ShaTab />
        </div>
        <div className={selectedKey === "aes" ? "" : "hidden"}>
          <AesTab />
        </div>
        <div className={selectedKey === "des" ? "" : "hidden"}>
          <DesTab />
        </div>
      </div>
    </div>
  )
}