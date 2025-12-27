import { Input, Select, SelectItem, Checkbox } from "@heroui/react"
import { useTranslation } from "react-i18next"
import { Eye, EyeOff } from "lucide-react"
import { useState } from "react"

export interface WifiState {
  ssid: string
  password?: string
  encryption: "WPA" | "WEP" | "nopass"
  hidden: boolean
}

interface WifiTabProps {
  value: WifiState
  onChange: (value: WifiState) => void
}

export function WifiTab({ value, onChange }: WifiTabProps) {
  const { t } = useTranslation()
  const [isVisible, setIsVisible] = useState(false)

  const update = (key: keyof WifiState, val: any) => {
    onChange({ ...value, [key]: val })
  }

  return (
    <div className="space-y-4">
      <Input
        label={t("tools.qr.ssid")}
        variant="bordered"
        value={value.ssid}
        onValueChange={(v) => update("ssid", v)}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label={t("tools.qr.password")}
            variant="bordered"
            value={value.password || ""}
            onValueChange={(v) => update("password", v)}
            type={isVisible ? "text" : "password"}
            endContent={
              <button className="focus:outline-none" type="button" onClick={() => setIsVisible(!isVisible)}>
                {isVisible ? (
                  <EyeOff className="text-2xl text-default-400 pointer-events-none" />
                ) : (
                  <Eye className="text-2xl text-default-400 pointer-events-none" />
                )}
              </button>
            }
          />

          <Select 
            label={t("tools.qr.encryption")} 
            variant="bordered"
            selectedKeys={[value.encryption]}
            onChange={(e) => update("encryption", e.target.value)}
          >
            <SelectItem key="WPA">{t("tools.qr.wpa")}</SelectItem>
            <SelectItem key="WEP">{t("tools.qr.wep")}</SelectItem>
            <SelectItem key="nopass">{t("tools.qr.none")}</SelectItem>
          </Select>
      </div>

      <Checkbox 
        isSelected={value.hidden} 
        onValueChange={(v) => update("hidden", v)}
      >
        {t("tools.qr.hidden")}
      </Checkbox>
    </div>
  )
}
