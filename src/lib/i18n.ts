import i18n from "i18next"
import { initReactI18next } from "react-i18next"

import en from "../locales/en.json"
import zh from "../locales/zh.json"
import zhTW from "../locales/zh-TW.json"
import zhHK from "../locales/zh-HK.json"
import ja from "../locales/ja.json"

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
  ja: {
    translation: ja,
  },
}

const savedLanguage = localStorage.getItem("i18nextLng") || "en"

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  })

export default i18n
