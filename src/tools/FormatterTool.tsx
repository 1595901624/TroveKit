import { useState, useEffect } from "react"
import { Tabs, Tab } from "@heroui/react"
import { useTranslation } from "react-i18next"
import { JsonTab } from "./formatter/JsonTab"
import { XmlTab } from "./formatter/XmlTab"
import { CssTab } from "./formatter/CssTab"
import { SqlTab } from "./formatter/SqlTab"

interface FormatterToolProps {
  activeTab?: string
}

export function FormatterTool({ activeTab }: FormatterToolProps) {
  const { t } = useTranslation()
  const [selectedKey, setSelectedKey] = useState<string>("json")

  useEffect(() => {
    if (activeTab) {
      setSelectedKey(activeTab)
    }
  }, [activeTab])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-none">
        <Tabs
          aria-label={t("tools.formatter.formatterOptions")}
          color="primary"
          selectedKey={selectedKey}
          onSelectionChange={(key) => setSelectedKey(key as string)}
          classNames={{
            tabList: "text-sm",
            tab: "text-xs"
          }}
        >
          <Tab key="json" title={t("tools.formatter.json")} />
          <Tab key="xml" title={t("tools.formatter.xml")} />
          <Tab key="css" title={t("tools.formatter.css")} />
          <Tab key="sql" title={t("tools.formatter.sql")} />
        </Tabs>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pt-4 pb-2">
        <div className={selectedKey === "json" ? "h-full" : "hidden h-full"}>
          <JsonTab />
        </div>
        <div className={selectedKey === "xml" ? "h-full" : "hidden h-full"}>
          <XmlTab />
        </div>
        <div className={selectedKey === "css" ? "h-full" : "hidden h-full"}>
          <CssTab />
        </div>
        <div className={selectedKey === "sql" ? "h-full" : "hidden h-full"}>
          <SqlTab />
        </div>
      </div>
    </div>
  )
}
