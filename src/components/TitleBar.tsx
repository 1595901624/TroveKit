import { useEffect, useRef, useState } from "react"
import { getName, getVersion } from "@tauri-apps/api/app"
import { CheckMenuItem, Menu, MenuItem, Submenu } from "@tauri-apps/api/menu"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { openUrl } from "@tauri-apps/plugin-opener"
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Minus,
  PanelLeft,
  Search,
  Square,
  X,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { detectDesktopPlatform, detectHostPlatform, DesktopPlatform } from "../lib/platform"
import { CommandMenu } from "./CommandMenu"
import { ToolId } from "./Sidebar"
import { useTheme } from "./theme-provider"
import appIcon from "../../app-icon.svg"
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownSeparator,
  DropdownSubmenu,
  DropdownTrigger,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "./ui/base-ui"

interface TitleBarProps {
  onNavigate?: (toolId: ToolId, tabId?: string) => void
  onToggleSidebar: () => void
}

export default function TitleBar({ onNavigate, onToggleSidebar }: TitleBarProps) {
  const { t, i18n } = useTranslation()
  const { theme, setTheme } = useTheme()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isAboutOpen, setIsAboutOpen] = useState(false)
  const [activeTitleMenu, setActiveTitleMenu] = useState<TitleMenuKind | null>(null)
  const [aboutInfo, setAboutInfo] = useState({ name: "TroveKit", version: "1.0.0-1" })
  const [isMaximized, setIsMaximized] = useState(false)
  const lastEditableElement = useRef<HTMLElement | null>(null)
  const [platform] = useState<DesktopPlatform>(detectDesktopPlatform)
  const [hostPlatform] = useState<DesktopPlatform>(detectHostPlatform)
  const [appWindow] = useState(() =>
    typeof window !== "undefined" && "__TAURI_INTERNALS__" in window ? getCurrentWindow() : null,
  )

  useEffect(() => {
    const openSearch = () => setIsSearchOpen(true)
    const openSettings = () => onNavigate?.("settings")
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        openSearch()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("trovekit:open-search", openSearch)
    window.addEventListener("trovekit:open-settings", openSettings)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("trovekit:open-search", openSearch)
      window.removeEventListener("trovekit:open-settings", openSettings)
    }
  }, [onNavigate])

  useEffect(() => {
    if (!appWindow) return

    const updateMaximized = async () => setIsMaximized(await appWindow.isMaximized())
    void updateMaximized()
    const unlisten = appWindow.onResized(updateMaximized)
    return () => {
      void unlisten.then((stopListening) => stopListening())
    }
  }, [appWindow])

  useEffect(() => {
    if (!appWindow) return
    void Promise.all([getName(), getVersion()])
      .then(([name, version]) => setAboutInfo({ name, version }))
      .catch((error) => console.error("Failed to load application metadata", error))
  }, [appWindow])

  useEffect(() => {
    if (!appWindow || platform !== "macos") return

    let cancelled = false

    const installMacMenu = async () => {
      const { menu, helpMenu } = await createMacAppMenu(t, theme, setTheme)
      if (cancelled) {
        await menu.close()
        return
      }

      const previousMenu = await menu.setAsAppMenu()
      await helpMenu.setAsHelpMenuForNSApp()
      await previousMenu?.close()
    }

    void installMacMenu().catch((error) => console.error("Failed to install macOS application menu", error))
    return () => {
      cancelled = true
    }
  }, [appWindow, i18n.language, platform, setTheme, t, theme])

  const toggleMaximize = async () => {
    if (!appWindow) return
    await appWindow.toggleMaximize()
    setIsMaximized(await appWindow.isMaximized())
  }

  const rememberEditableElement = () => {
    lastEditableElement.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
  }

  const runEditCommand = (command: string) => {
    lastEditableElement.current?.focus()
    document.execCommand(command)
  }

  return (
    <>
      <CommandMenu
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={(toolId, tabId) => onNavigate?.(toolId, tabId)}
      />
      <AboutDialog
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
        appName={aboutInfo.name}
        version={aboutInfo.version}
        t={t}
      />

      {platform === "macos" ? (
        // The native overlay titlebar supplies the traffic lights. This small
        // overlay keeps the sidebar toggle available without adding a title row.
        <div data-tauri-drag-region className="absolute left-0 top-0 z-50 flex h-10 w-[124px] select-none items-center pl-[76px] text-[#5f5f5f] dark:text-default-400">
          {hostPlatform !== "macos" && (
            <MacPreviewWindowControls
              onClose={() => appWindow?.close()}
              onMinimize={() => appWindow?.minimize()}
              onMaximize={toggleMaximize}
            />
          )}
          <TitleButton label={t("common.sidebar", "侧栏")} onClick={onToggleSidebar}>
            <PanelLeft className="h-[15px] w-[15px]" />
          </TitleButton>
        </div>
      ) : (
        <div data-tauri-drag-region className="flex h-[var(--titlebar-height)] shrink-0 select-none items-center bg-chrome text-[#5f5f5f] dark:text-default-400">
          <div className="flex h-full items-center gap-0.5 px-2">
            <TitleButton label={t("common.sidebar", "侧栏")} onClick={onToggleSidebar}>
              <PanelLeft className="h-[17px] w-[17px]" />
            </TitleButton>
          </div>

          <div className="flex h-full items-center gap-0.5 text-[13px]" data-tauri-drag-region>
            <DesktopTitleMenu menuKey="file" label={t("menu.file", "文件")} activeMenu={activeTitleMenu} onActiveMenuChange={setActiveTitleMenu} onPointerDown={rememberEditableElement}>
              {desktopMenuItem("settings", t("settings.title", "设置"), undefined, () => onNavigate?.("settings"))}
              <DropdownSeparator />
              {desktopMenuItem("quit", t("menu.quit", { app: aboutInfo.name, defaultValue: "退出 {{app}}" }), "Ctrl+Q", () => void appWindow?.close())}
            </DesktopTitleMenu>
            <DesktopTitleMenu menuKey="edit" label={t("menu.edit", "编辑")} activeMenu={activeTitleMenu} onActiveMenuChange={setActiveTitleMenu} onPointerDown={rememberEditableElement}>
              {desktopMenuItem("undo", t("menu.undo", "撤销"), "Ctrl+Z", () => runEditCommand("undo"))}
              {desktopMenuItem("redo", t("menu.redo", "重做"), "Ctrl+Y", () => runEditCommand("redo"))}
              <DropdownSeparator />
              {desktopMenuItem("cut", t("menu.cut", "剪切"), "Ctrl+X", () => runEditCommand("cut"))}
              {desktopMenuItem("copy", t("menu.copy", "复制"), "Ctrl+C", () => runEditCommand("copy"))}
              {desktopMenuItem("paste", t("menu.paste", "粘贴"), "Ctrl+V", () => runEditCommand("paste"))}
              {desktopMenuItem("select-all", t("menu.selectAll", "全选"), "Ctrl+A", () => runEditCommand("selectAll"))}
            </DesktopTitleMenu>
            <DesktopTitleMenu menuKey="view" label={t("menu.view", "视图")} activeMenu={activeTitleMenu} onActiveMenuChange={setActiveTitleMenu} onPointerDown={rememberEditableElement}>
              {desktopMenuItem("search", t("menu.search", "搜索工具…"), "Ctrl+K", () => setIsSearchOpen(true))}
              <DropdownSeparator />
              {desktopMenuItem("fullscreen", t("menu.fullscreen", "切换全屏"), undefined, () => void toggleMaximize())}
              <DropdownSubmenu
                key="theme"
                label={t("settings.theme", "主题")}
                className="min-h-7 rounded-md px-2.5 py-1 text-foreground data-[highlighted]:bg-default-100"
                endContent={<ChevronRight className="h-3.5 w-3.5 text-default-400" />}
                menuClassName="min-w-[150px] rounded-xl border-black/[0.08] bg-background p-1.5 text-[13px] shadow-[0_12px_32px_rgba(0,0,0,0.22),0_2px_8px_rgba(0,0,0,0.12)] dark:border-white/[0.1]"
              >
                {themeMenuItem("theme-light", t("settings.light", "浅色"), theme === "light", () => setTheme("light"))}
                {themeMenuItem("theme-dark", t("settings.dark", "深色"), theme === "dark", () => setTheme("dark"))}
                {themeMenuItem("theme-system", t("settings.system", "跟随系统"), theme === "system", () => setTheme("system"))}
              </DropdownSubmenu>
            </DesktopTitleMenu>
            <DesktopTitleMenu menuKey="help" label={t("menu.help", "帮助")} activeMenu={activeTitleMenu} onActiveMenuChange={setActiveTitleMenu} onPointerDown={rememberEditableElement}>
              {desktopMenuItem("source-code", t("menu.sourceCode", "源代码"), undefined, () => void openUrl("https://github.com/1595901624/trovekit"))}
              <DropdownSeparator />
              {desktopMenuItem("about", t("menu.aboutApp", { app: aboutInfo.name, defaultValue: "关于 {{app}}" }), undefined, () => setIsAboutOpen(true))}
            </DesktopTitleMenu>
          </div>

          <div className="flex-1" data-tauri-drag-region />

          <Button
            variant="light"
            className="mr-2 flex h-7 items-center gap-2 rounded-xl border border-black/[0.06] bg-white/70 px-3 text-[11px] text-[#666] shadow-sm hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-default-400"
            onPress={() => setIsSearchOpen(true)}
          >
            <Search className="h-3.5 w-3.5" />
            <span>{t("common.search", "搜索")}</span>
            <span className="rounded border border-black/10 px-1 font-mono text-[9px] dark:border-white/10">Ctrl K</span>
            <ChevronDown className="h-3 w-3" />
          </Button>

          <div className={platform === "linux" ? "flex h-full items-center gap-1 pr-2" : "flex h-full items-stretch"}>
            <WindowButton platform={platform} label={t("window.minimize", "最小化")} onClick={() => appWindow?.minimize()}><Minus className="h-4 w-4" /></WindowButton>
            <WindowButton platform={platform} label={t("window.maximize", "最大化")} onClick={toggleMaximize}>{isMaximized ? <Copy className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}</WindowButton>
            <WindowButton platform={platform} label={t("window.close", "关闭")} danger onClick={() => appWindow?.close()}><X className="h-4 w-4" /></WindowButton>
          </div>
        </div>
      )}
    </>
  )
}

type Translator = ReturnType<typeof useTranslation>["t"]
type TitleMenuKind = "file" | "edit" | "view" | "help"

async function getAboutMetadata(t: Translator) {
  const [name, version] = await Promise.all([getName(), getVersion()])
  return {
    name,
    version,
    authors: ["cloris"],
    comments: t("menu.aboutComments", "A practical desktop toolbox for developers."),
    copyright: `Copyright © ${new Date().getFullYear()} TroveKit`,
  }
}

type AppTheme = "light" | "dark" | "system"

async function createMacAppMenu(t: Translator, theme: AppTheme, setTheme: (theme: AppTheme) => void) {
  const about = await getAboutMetadata(t)
  const appMenu = await Submenu.new({
    text: about.name,
    items: [
      {
        item: { About: about },
        text: t("menu.aboutApp", { app: about.name, defaultValue: "About {{app}}" }),
      },
      { item: "Separator" },
      { item: "Hide", text: t("menu.hideApp", { app: about.name, defaultValue: "Hide {{app}}" }) },
      { item: "HideOthers", text: t("menu.hideOthers", "Hide Others") },
      { item: "ShowAll", text: t("menu.showAll", "Show All") },
      { item: "Separator" },
      { item: "Quit", text: t("menu.quit", { app: about.name, defaultValue: "Quit {{app}}" }) },
    ],
  })

  const editMenu = await Submenu.new({
    text: t("menu.edit", "Edit"),
    items: [
      { item: "Undo", text: t("menu.undo", "Undo") },
      { item: "Redo", text: t("menu.redo", "Redo") },
      { item: "Separator" },
      { item: "Cut", text: t("menu.cut", "Cut") },
      { item: "Copy", text: t("menu.copy", "Copy") },
      { item: "Paste", text: t("menu.paste", "Paste") },
      { item: "SelectAll", text: t("menu.selectAll", "Select All") },
    ],
  })
  const fileMenu = await Submenu.new({
    text: t("menu.file", "File"),
    items: [{
      id: "settings",
      text: t("settings.title", "Settings"),
      action: () => window.dispatchEvent(new Event("trovekit:open-settings")),
    }],
  })
  const searchItem = await MenuItem.new({
    id: "search",
    text: t("menu.search", "Search Tools…"),
    accelerator: "CmdOrCtrl+K",
    action: () => window.dispatchEvent(new Event("trovekit:open-search")),
  })
  const fullscreenItem = await MenuItem.new({
    id: "toggle-maximize",
    text: t("menu.fullscreen", "Toggle Full Screen"),
    action: () => void getCurrentWindow().toggleMaximize(),
  })
  const themeItems = await Promise.all(([
    ["light", t("settings.light", "Light")],
    ["dark", t("settings.dark", "Dark")],
    ["system", t("settings.system", "System")],
  ] as const).map(([value, text]) => CheckMenuItem.new({
    id: `theme-${value}`,
    text,
    checked: theme === value,
    action: () => setTheme(value),
  })))
  const themeMenu = await Submenu.new({
    text: t("settings.theme", "Theme"),
    items: themeItems,
  })
  const viewMenu = await Submenu.new({
    text: t("menu.view", "View"),
    items: [searchItem, { item: "Separator" }, fullscreenItem, themeMenu],
  })
  const helpMenu = await Submenu.new({
    text: t("menu.help", "Help"),
    items: [
      {
        id: "source-code",
        text: t("menu.sourceCode", "Source Code"),
        action: () => void openUrl("https://github.com/1595901624/trovekit"),
      },
    ],
  })
  const menu = await Menu.new({ items: [appMenu, fileMenu, editMenu, viewMenu, helpMenu] })
  return { menu, helpMenu }
}

function DesktopTitleMenu({
  menuKey,
  label,
  children,
  activeMenu,
  onActiveMenuChange,
  onPointerDown,
}: {
  menuKey: TitleMenuKind
  label: string
  children: React.ReactNode
  activeMenu: TitleMenuKind | null
  onActiveMenuChange: (menu: TitleMenuKind | null) => void
  onPointerDown?: () => void
}) {
  return (
    <Dropdown
      modal={false}
      isOpen={activeMenu === menuKey}
      onOpenChange={(open: boolean) => onActiveMenuChange(open ? menuKey : null)}
    >
      <DropdownTrigger>
        <Button
          variant="light"
          aria-label={label}
          onPointerDown={onPointerDown}
          onPointerEnter={() => {
            if (activeMenu && activeMenu !== menuKey) onActiveMenuChange(menuKey)
          }}
          className="h-auto min-w-0 rounded-md px-3 py-1.5 text-[13px] hover:bg-black/[0.055] data-[popup-open]:bg-black/[0.07] dark:hover:bg-white/[0.07] dark:data-[popup-open]:bg-white/[0.09]"
        >
          {label}
        </Button>
      </DropdownTrigger>
      <DropdownMenu className="min-w-[220px] rounded-xl border-black/[0.08] bg-background p-1.5 text-[13px] shadow-[0_12px_32px_rgba(0,0,0,0.22),0_2px_8px_rgba(0,0,0,0.12)] dark:border-white/[0.1]">
        {children}
      </DropdownMenu>
    </Dropdown>
  )
}

function desktopMenuItem(itemKey: string, label: string, shortcut: string | undefined, onPress: () => void) {
  return (
    <DropdownItem
      key={itemKey}
      onPress={onPress}
      className="min-h-7 rounded-md px-2.5 py-1 text-foreground data-[highlighted]:bg-default-100"
      endContent={shortcut ? <span className="ml-7 text-[11px] text-default-400">{shortcut}</span> : null}
    >
      {label}
    </DropdownItem>
  )
}

function themeMenuItem(itemKey: string, label: string, selected: boolean, onPress: () => void) {
  return (
    <DropdownItem
      key={itemKey}
      onPress={onPress}
      className="min-h-7 rounded-md px-2.5 py-1 text-foreground data-[highlighted]:bg-default-100"
      endContent={selected ? <Check className="ml-5 h-3.5 w-3.5 text-primary" /> : <span className="ml-5 h-3.5 w-3.5" />}
    >
      {label}
    </DropdownItem>
  )
}

function AboutDialog({ isOpen, onClose, appName, version, t }: { isOpen: boolean; onClose: () => void; appName: string; version: string; t: Translator }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent className="max-w-[420px] rounded-2xl">
        <ModalHeader className="sr-only">{t("menu.aboutApp", { app: appName, defaultValue: "关于 {{app}}" })}</ModalHeader>
        <ModalBody className="flex flex-col items-center px-8 pb-5 pt-8 text-center">
          <img src={appIcon} alt="" className="mb-4 h-20 w-20 rounded-[20px] shadow-md" />
          <h2 className="text-xl font-semibold text-foreground">{appName}</h2>
          <p className="mt-1 text-sm text-default-500">{t("menu.version", "版本")} {version}</p>
          <p className="mt-4 max-w-xs text-sm leading-6 text-default-500">{t("menu.aboutComments", "为开发者打造的实用桌面工具箱。")}</p>
          <p className="mt-3 text-xs text-default-400">cloris</p>
        </ModalBody>
        <ModalFooter className="justify-center pb-6">
          <Button color="primary" className="min-w-24" onPress={onClose}>{t("common.close", "关闭")}</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

function TitleButton({ children, label, onClick, disabled }: { children: React.ReactNode; label: string; onClick?: () => void; disabled?: boolean }) {
  return <Button isIconOnly size="sm" variant="light" title={label} aria-label={label} isDisabled={disabled} onPress={onClick} className="w-9 min-w-9 rounded-md hover:bg-black/[0.055] disabled:opacity-35 dark:hover:bg-white/[0.07]">{children}</Button>
}

function WindowButton({ children, label, onClick, danger, platform }: { children: React.ReactNode; label: string; onClick: () => void; danger?: boolean; platform: Exclude<DesktopPlatform, "macos"> }) {
  const shape = platform === "linux" ? "h-8 w-8 min-w-8 rounded-lg" : "h-full w-11 min-w-11 rounded-none"
  return <Button isIconOnly variant="light" title={label} aria-label={label} onPress={onClick} className={`${shape} ${danger ? "hover:bg-red-500 hover:text-white" : "hover:bg-black/[0.055] dark:hover:bg-white/[0.07]"}`}>{children}</Button>
}

function MacPreviewWindowControls({ onClose, onMinimize, onMaximize }: { onClose: () => void; onMinimize: () => void; onMaximize: () => void }) {
  return (
    <div className="group absolute left-[14px] top-[14px] flex items-center gap-2">
      <MacPreviewButton label="Close" color="bg-[#ff5f57] border-[#e0443e]" onClick={onClose} glyph="×" />
      <MacPreviewButton label="Minimize" color="bg-[#febc2e] border-[#dea123]" onClick={onMinimize} glyph="−" />
      <MacPreviewButton label="Maximize" color="bg-[#28c840] border-[#1aab29]" onClick={onMaximize} glyph="+" />
    </div>
  )
}

function MacPreviewButton({ label, color, glyph, onClick }: { label: string; color: string; glyph: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} title={`${label} (preview)`} onClick={onClick} className={`flex h-3 w-3 items-center justify-center rounded-full border ${color} text-[9px] font-bold leading-none text-black/55 active:brightness-90`}>
      <span className="opacity-0 transition-opacity group-hover:opacity-100">{glyph}</span>
    </button>
  )
}
