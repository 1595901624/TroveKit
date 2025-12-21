import { Select, SelectItem } from "@heroui/react"
import { useTranslation } from "react-i18next"

export function LanguageSelector() {
  const { i18n, t } = useTranslation()

  const handleSelectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(e.target.value)
  }

  const languages = [
    { key: "en", label: "English", flag: "🇺🇸" },
    { key: "zh", label: "中文", flag: "🇨🇳" },
    { key: "zh-TW", label: "繁體中文 (台灣)", flag: "🇹🇼" },
    { key: "zh-HK", label: "繁體中文 (香港)", flag: "🇭🇰" },
  ]

  return (
    <Select
      label={t("settings.selectLanguage")}
      className="max-w-xs"
      selectedKeys={[i18n.language]}
      onChange={handleSelectionChange}
      startContent={<span className="text-xl">{languages.find(l => l.key === i18n.language)?.flag}</span>}
    >
      {languages.map((lang) => (
        <SelectItem key={lang.key} startContent={<span className="text-xl">{lang.flag}</span>}>
          {lang.label}
        </SelectItem>
      ))}
    </Select>
  )
}
