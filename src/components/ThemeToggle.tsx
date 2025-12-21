import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "./theme-provider"
import { Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/react"
import { useTranslation } from "react-i18next"

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()
  const { t } = useTranslation()

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button isIconOnly variant="light" radius="full" aria-label="Toggle theme">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-default-500" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-default-500" />
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
