import { Select, SelectItem } from "@heroui/react"
import { useTranslation } from "react-i18next"
import US from 'country-flag-icons/react/3x2/US'
import CN from 'country-flag-icons/react/3x2/CN'
import TW from 'country-flag-icons/react/3x2/TW'
import HK from 'country-flag-icons/react/3x2/HK'
import JP from 'country-flag-icons/react/3x2/JP'

export function LanguageSelector() {
  const { i18n, t } = useTranslation()

  const handleSelectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value
    if (newLang) {
      i18n.changeLanguage(newLang)
      localStorage.setItem("i18nextLng", newLang)
    }
  }

  const languages = [
    { key: "en", label: "English", Flag: US },
    { key: "zh", label: "简体中文", Flag: CN },
    { key: "zh-HK", label: "繁體中文 (香港)", Flag: HK },
    { key: "zh-TW", label: "繁體中文 (台灣)", Flag: TW },
    { key: "ja", label: "日本語", Flag: JP },
  ]

  // Find the active flag component
  const ActiveFlag = languages.find(l => l.key === i18n.language)?.Flag

  return (
    <Select
      label={t("settings.selectLanguage")}
      className="max-w-xs"
      selectedKeys={[i18n.language]}
      onChange={handleSelectionChange}
      startContent={ActiveFlag ? <div className="w-6 h-4 flex items-center"><ActiveFlag /></div> : null}
    >
      {languages.map((lang) => (
        <SelectItem
          key={lang.key}
          startContent={<div className="w-6 h-4 flex items-center"><lang.Flag /></div>}
        >
          {lang.label}
        </SelectItem>
      ))}
    </Select>
  )
}
