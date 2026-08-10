import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "./theme-provider"
import { Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "../components/ui/base-ui"
import { useTranslation } from "react-i18next"

interface ThemeToggleProps {
  className?: string
  variant?: string
}

export function ThemeToggle({ className, variant = "light" }: ThemeToggleProps = {}) {
  const { setTheme, theme } = useTheme()
  const { t } = useTranslation()

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button isIconOnly variant={variant} radius="full" className={className} aria-label="Toggle theme">
          <Sun className="h-4 w-4 rotate-0 scale-100 text-default-500 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 text-default-500 transition-all dark:rotate-0 dark:scale-100" />
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
