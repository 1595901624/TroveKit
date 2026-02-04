import { useEffect, useState } from "react"
import { Tabs, Tab } from "@heroui/react"
import { useTranslation } from "react-i18next"
import { RegexTool } from "./regex/RegexTool"

interface OthersToolProps {
  activeTab?: string
  isVisible?: boolean
}

export function OthersTool({ activeTab }: OthersToolProps) {
  const { t } = useTranslation()
  const [selectedKey, setSelectedKey] = useState<string>("regex")

  useEffect(() => {
    if (activeTab) {
      setSelectedKey(activeTab)
    }
  }, [activeTab])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-none w-full overflow-x-auto [&::-webkit-scrollbar]:hidden">
        <Tabs
          aria-label={t("nav.others")}
          color="primary"
          selectedKey={selectedKey}
          onSelectionChange={(key) => setSelectedKey(key as string)}
          classNames={{
            tabList: "text-sm w-full",
            tab: "text-xs",
          }}
        >
          <Tab key="regex" title={t("nav.regex")} />
        </Tabs>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pt-4 pb-2">
        <div className={selectedKey === "regex" ? "h-full" : "hidden h-full"}>
          <RegexTool />
        </div>
      </div>
    </div>
  )
}

