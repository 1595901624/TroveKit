import i18n from "i18next"
import { initReactI18next } from "react-i18next"

import en from "../locales/en.json"
import zh from "../locales/zh.json"
import zhTW from "../locales/zh-TW.json"
import zhHK from "../locales/zh-HK.json"

const resources = {
  en: {
    translation: en,
  },
  zh: {
    translation: zh,
  },
  "zh-TW": {
    translation: zhTW,
  },
  "zh-HK": {
    translation: zhHK,
  },
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en", // default language
    fallbackLng: "en",
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  })

export default i18n
