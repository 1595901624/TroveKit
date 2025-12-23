import React from "react";
import ReactDOM from "react-dom/client";
import { HeroUIProvider } from "@heroui/react";
import App from "./App";
import "./styles/globals.css";
import "./lib/i18n";
import { LogProvider } from "./contexts/LogContext";
import { ToastProvider } from "./contexts/ToastContext";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <HeroUIProvider>
      <ToastProvider>
        <LogProvider>
          <main className="text-foreground bg-background">
            <App />
          </main>
        </LogProvider>
      </ToastProvider>
    </HeroUIProvider>
  </React.StrictMode>,
);
