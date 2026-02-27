import React from "react";
import ReactDOM from "react-dom/client";
import { HeroUIProvider, ToastProvider } from "@heroui/react";
import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

import App from "./App";
import "./styles/globals.css";
import i18n from "./lib/i18n";
import { LogProvider } from "./contexts/LogContext";
import { FeaturePreferencesProvider } from "./contexts/FeaturePreferencesContext";
import { getStoredItem, setStoredItem } from "./lib/store";

self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'json') {
      return new jsonWorker();
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return new cssWorker();
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return new htmlWorker();
    }
    if (label === 'typescript' || label === 'javascript') {
      return new tsWorker();
    }
    return new editorWorker();
  },
};

loader.config({ monaco });

// Initialize language before first render to avoid flash of wrong language
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
    <HeroUIProvider>
      <ToastProvider placement="bottom-right" />
      <LogProvider>
        <FeaturePreferencesProvider>
          <main className="text-foreground bg-background">
            <App />
          </main>
        </FeaturePreferencesProvider>
      </LogProvider>
    </HeroUIProvider>
  </React.StrictMode>,
);
