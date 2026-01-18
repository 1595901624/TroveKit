import React, { createContext, useContext, useEffect } from "react"
import { usePersistentState } from "../hooks/usePersistentState"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
}: ThemeProviderProps) {
  // Use persistent state hook. Note that it is async, so theme might update after mount.
  const [theme, setTheme] = usePersistentState<Theme>(storageKey, defaultTheme)

  useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove("light", "dark")

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
      
      const applySystemTheme = () => {
        const systemTheme = mediaQuery.matches ? "dark" : "light"
        root.classList.remove("light", "dark")
        root.classList.add(systemTheme)
      }

      applySystemTheme()
      mediaQuery.addEventListener("change", applySystemTheme)

      return () => {
        mediaQuery.removeEventListener("change", applySystemTheme)
      }
    }

    root.classList.add(theme)
  }, [theme])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      setTheme(theme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...{ value }}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}
