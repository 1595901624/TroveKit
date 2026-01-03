import { useState } from "react"
import { Tabs, Tab } from "@heroui/react"
import { useTranslation } from "react-i18next"
import { JsonXmlTab } from "./converter/JsonXmlTab"

export function ConverterTool() {
  const { t } = useTranslation()
  const [selectedKey, setSelectedKey] = useState<string>("jsonXml")

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
          <Tab key="jsonXml" title={t("tools.converter.jsonXml")} />
        </Tabs>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pt-4 pb-2">
        <div className={selectedKey === "jsonXml" ? "h-full" : "hidden h-full"}>
          <JsonXmlTab />
        </div>
      </div>
    </div>
  )
}
