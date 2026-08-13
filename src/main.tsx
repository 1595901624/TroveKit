import React from "react";
import ReactDOM from "react-dom/client";
import { BaseUIProvider, ToastProvider } from "./components/ui/base-ui";

import App from "./App";
import "./styles/globals.css";
import i18n from "./lib/i18n";
import { LogProvider } from "./contexts/LogContext";
import { FeaturePreferencesProvider } from "./contexts/FeaturePreferencesContext";
import { getStoredItem, setStoredItem } from "./lib/store";

// 在首次渲染前预加载左右面板状态，让首帧直接采用持久化布局，
// 避免默认布局切换到保存布局时误播放展开/收起动画。
await Promise.all([
  getStoredItem("sidebar-collapsed"),
  getStoredItem("sidebar-width"),
  getStoredItem("logPanelIsOpen"),
  getStoredItem("log-panel-width"),
]);

// 在首次渲染前初始化语言，避免先显示错误语言再切换的闪烁。
const storedLang = await getStoredItem("i18nextLng");
if (storedLang) {
  await i18n.changeLanguage(storedLang);
} else {
  const systemLang = navigator.language;
  let targetLang = "en";
  if (systemLang.startsWith("zh")) {
    const lower = systemLang.toLowerCase();
    if (lower.includes("tw") || lower.includes("hant")) {
      targetLang = "zh-TW";
    } else if (lower.includes("hk")) {
      targetLang = "zh-HK";
    } else {
      targetLang = "zh";
    }
  } else if (systemLang.startsWith("ja")) {
    targetLang = "ja";
  }
  await i18n.changeLanguage(targetLang);
  await setStoredItem("i18nextLng", targetLang);
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BaseUIProvider>
      <ToastProvider placement="bottom-right" />
      <LogProvider>
        <FeaturePreferencesProvider>
          <main className="text-foreground bg-background">
            <App />
          </main>
        </FeaturePreferencesProvider>
      </LogProvider>
    </BaseUIProvider>
  </React.StrictMode>,
);
