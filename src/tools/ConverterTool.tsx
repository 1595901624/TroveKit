import { useState, useEffect } from "react"
import { Tabs, Tab } from "@heroui/react"
import { useTranslation } from "react-i18next"
import { JsonXmlTab } from "./converter/JsonXmlTab"
import { JsonYamlTab } from "./converter/JsonYamlTab"
import { TimestampTab } from "./converter/TimestampTab"

export function ConverterTool({ isVisible = true, activeTab }: { isVisible?: boolean; activeTab?: string }) {
  const { t } = useTranslation()
  const [selectedKey, setSelectedKey] = useState<string>("timestamp")

  useEffect(() => {
    if (activeTab) {
      setSelectedKey(activeTab)
    }
  }, [activeTab])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-none">
        <Tabs
          aria-label={t("tools.converter.converterOptions")}
          color="primary"
          selectedKey={selectedKey}
          onSelectionChange={(key) => setSelectedKey(key as string)}
          classNames={{
            tabList: "text-sm",
            tab: "text-xs"
          }}
        >
          <Tab key="timestamp" title={t("tools.converter.timestamp")} />
          <Tab key="jsonXml" title={t("tools.converter.jsonXml")} />
          <Tab key="jsonYaml" title={t("tools.converter.jsonYaml")} />
        </Tabs>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pt-4 pb-2">
        <div className={selectedKey === "timestamp" ? "h-full" : "hidden h-full"}>
          <TimestampTab isVisible={isVisible && selectedKey === "timestamp"} />
        </div>
        <div className={selectedKey === "jsonXml" ? "h-full" : "hidden h-full"}>
          <JsonXmlTab />
        </div>
        <div className={selectedKey === "jsonYaml" ? "h-full" : "hidden h-full"}>
          <JsonYamlTab />
        </div>
      </div>
    </div>
  )
}
