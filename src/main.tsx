import React from "react";
import ReactDOM from "react-dom/client";
import { HeroUIProvider } from "@heroui/react";
import App from "./App";
import "./styles/globals.css";
import "./lib/i18n";
import { LogProvider } from "./contexts/LogContext";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <HeroUIProvider>
      <LogProvider>
        <main className="text-foreground bg-background">
          <App />
        </main>
      </LogProvider>
    </HeroUIProvider>
  </React.StrictMode>,
);
