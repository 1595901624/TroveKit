import { ChevronDown, Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "./theme-provider"
import { Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "../components/ui/base-ui"
import { useTranslation } from "react-i18next"

interface ThemeToggleProps {
  className?: string
  variant?: string
  showLabel?: boolean
  compact?: boolean
}

export function ThemeToggle({ className, variant = "light", showLabel = false, compact = false }: ThemeToggleProps = {}) {
  const { setTheme, theme } = useTheme()
  const { t } = useTranslation()

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button
          isIconOnly={!showLabel}
          variant={variant}
          radius={showLabel ? "md" : "full"}
          className={className}
          aria-label={t("settings.theme")}
          startContent={showLabel ? (theme === "light" ? <Sun className="h-4 w-4" /> : theme === "dark" ? <Moon className="h-4 w-4" /> : <Monitor className="h-4 w-4" />) : undefined}
          endContent={showLabel ? <ChevronDown className="h-3.5 w-3.5 text-default-400" /> : undefined}
        >
          {showLabel ? t(`settings.${theme}`) : (
            <>
              <Sun className={`${compact ? "h-3 w-3" : "h-3.5 w-3.5"} rotate-0 scale-100 text-default-500 transition-all dark:-rotate-90 dark:scale-0`} />
              <Moon className={`absolute ${compact ? "h-3 w-3" : "h-3.5 w-3.5"} rotate-90 scale-0 text-default-500 transition-all dark:rotate-0 dark:scale-100`} />
            </>
          )}
        </Button>
      </DropdownTrigger>
      <DropdownMenu aria-label="Theme selection" selectionMode="single" selectedKeys={new Set([theme])}>
        <DropdownItem key="light" startContent={<Sun className="w-4 h-4" />} onClick={() => setTheme("light")}>
          {t("settings.light")}
        </DropdownItem>
        <DropdownItem key="dark" startContent={<Moon className="w-4 h-4" />} onClick={() => setTheme("dark")}>
          {t("settings.dark")}
        </DropdownItem>
        <DropdownItem key="system" startContent={<Monitor className="w-4 h-4" />} onClick={() => setTheme("system")}>
          {t("settings.system")}
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  )
}
