import { useState } from "react"
import { Tabs, Tab } from "@heroui/react"
import { useTranslation } from "react-i18next"
import { JsonTab } from "./formatter/JsonTab"
import { XmlTab } from "./formatter/XmlTab"

export function FormatterTool() {
  const { t } = useTranslation()
  const [selectedKey, setSelectedKey] = useState<string>("json")

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-none">
        <Tabs
          aria-label={t("tools.formatter.formatterOptions")}
          color="primary"
          selectedKey={selectedKey}
          onSelectionChange={(key) => setSelectedKey(key as string)}
        >
          <Tab key="json" title={t("tools.formatter.json")} />
          <Tab key="xml" title={t("tools.formatter.xml")} />
        </Tabs>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pt-4 pb-2">
        <div className={selectedKey === "json" ? "h-full" : "hidden h-full"}>
          <JsonTab />
        </div>
        <div className={selectedKey === "xml" ? "h-full" : "hidden h-full"}>
          <XmlTab />
        </div>
      </div>
    </div>
  )
}
