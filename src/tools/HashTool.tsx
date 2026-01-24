import { useState, useEffect } from "react"
import { Tabs, Tab } from "@heroui/react"
import { useTranslation } from "react-i18next"
import { Md2Tab } from "./hash/Md2Tab"
import { Md4Tab } from "./hash/Md4Tab"
import { Md5Tab } from "./hash/Md5Tab"
import { ShaTab } from "./hash/ShaTab"
import { AesTab } from "./hash/AesTab"
import { DesTab } from "./hash/DesTab"
import { Rc4Tab } from "./hash/Rc4Tab"
import { ChaCha20Tab } from "./hash/ChaCha20Tab"
import { HmacMd5Tab } from "./hash/HmacMd5Tab"
import { TriviumTab } from "./hash/TriviumTab"

interface HashToolProps {
  activeTab?: string
  isVisible?: boolean
}

export function HashTool({ activeTab }: HashToolProps) {
  const { t } = useTranslation()
  const [selectedKey, setSelectedKey] = useState<string>("md2")

  useEffect(() => {
    if (activeTab) {
      setSelectedKey(activeTab)
    }
  }, [activeTab])

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
          <Tab key="md2" title={t("tools.hash.md2")} />
          <Tab key="md4" title={t("tools.hash.md4")} />
          <Tab key="md5" title={t("tools.hash.md5")} />
          <Tab key="hmacMd5" title={t("tools.hash.hmacMd5", "HMAC-MD5")} />
          <Tab key="sha" title={t("tools.hash.sha")} />
          <Tab key="aes" title={t("tools.hash.aes")} />
          <Tab key="des" title={t("tools.hash.des", "DES")} />
          <Tab key="rc4" title={t("tools.hash.rc4", "RC4")} />
          <Tab key="chacha20" title={t("tools.hash.chacha20", "ChaCha20")} />
          <Tab key="trivium" title={t("tools.hash.trivium", "Trivium")} />
        </Tabs>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pt-4 pb-2">
        <div className={selectedKey === "md2" ? "" : "hidden"}>
          <Md2Tab />
        </div>
        <div className={selectedKey === "md4" ? "" : "hidden"}>
          <Md4Tab />
        </div>
        <div className={selectedKey === "md5" ? "" : "hidden"}>
          <Md5Tab />
        </div>
        <div className={selectedKey === "hmacMd5" ? "" : "hidden"}>
          <HmacMd5Tab />
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
        <div className={selectedKey === "rc4" ? "" : "hidden"}>
          <Rc4Tab />
        </div>
        <div className={selectedKey === "chacha20" ? "" : "hidden"}>
          <ChaCha20Tab />
        </div>
        <div className={selectedKey === "trivium" ? "" : "hidden"}>
          <TriviumTab />
        </div>
      </div>
    </div>
  )
}