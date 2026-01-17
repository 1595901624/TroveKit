import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CommandMenu } from "./CommandMenu";
import { ToolId } from "./Sidebar";

// SVG Icons
const Icons = {
  Windows: {
    Minimize: () => (
      <svg width="10" height="1" viewBox="0 0 10 1" className="fill-current">
        <rect width="10" height="1" />
      </svg>
    ),
    Maximize: () => (
      <svg width="10" height="10" viewBox="0 0 10 10" className="stroke-current fill-none" strokeWidth="1">
        <rect x="0.5" y="0.5" width="9" height="9" />
      </svg>
    ),
    Restore: () => (
      <svg width="10" height="10" viewBox="0 0 10 10" className="stroke-current fill-none" strokeWidth="1">
        <path d="M2.5,2.5 L2.5,0.5 L9.5,0.5 L9.5,7.5 L7.5,7.5" />
        <rect x="0.5" y="2.5" width="7" height="7" />
      </svg>
    ),
    Close: () => (
      <svg width="10" height="10" viewBox="0 0 10 10" className="fill-current">
        <path d="M0.5,0.5 L9.5,9.5 M9.5,0.5 L0.5,9.5" stroke="currentColor" strokeWidth="1" />
      </svg>
    ),
  },
  Linux: {
    Minimize: () => (
      <svg width="16" height="16" viewBox="0 0 16 16" className="fill-current">
        <rect x="2" y="7" width="12" height="2" />
      </svg>
    ),
    Maximize: () => (
      <svg width="16" height="16" viewBox="0 0 16 16" className="fill-none stroke-current" strokeWidth="1.5">
        <rect x="2.75" y="2.75" width="10.5" height="10.5" rx="1.5" />
      </svg>
    ),
    Restore: () => (
      <svg width="16" height="16" viewBox="0 0 16 16" className="fill-none stroke-current" strokeWidth="1.5">
        <rect x="4.75" y="4.75" width="8.5" height="8.5" rx="1.5" />
        <path d="M6.5,4.75 L6.5,3.25 C6.5,2.42 7.17,1.75 8,1.75 L12.75,1.75 C13.58,1.75 14.25,2.42 14.25,3.25 L14.25,8 C14.25,8.83 13.58,9.5 12.75,9.5 L11.25,9.5" />
      </svg>
    ),
    Close: () => (
      <svg width="16" height="16" viewBox="0 0 16 16" className="fill-current">
        <path d="M4,4 L12,12 M12,4 L4,12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  Mac: {
    Close: () => (
      <svg width="6" height="6" viewBox="0 0 6 6" className="fill-current opacity-0 group-hover:opacity-100 transition-opacity">
        <path d="M0.5,0.5 L5.5,5.5 M5.5,0.5 L0.5,5.5" stroke="#4c0000" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
    Minimize: () => (
      <svg width="6" height="2" viewBox="0 0 6 2" className="fill-current opacity-0 group-hover:opacity-100 transition-opacity">
        <rect width="6" height="2" fill="#995700" rx="1" />
      </svg>
    ),
    Maximize: () => (
      <svg width="6" height="6" viewBox="0 0 6 6" className="fill-current opacity-0 group-hover:opacity-100 transition-opacity">
        <path d="M0,3 L3,0 L6,3 L3,6 Z" fill="#006500" />
      </svg>
    ),
  }
};

const getOS = () => {
  const userAgent = window.navigator.userAgent.toLowerCase();
  if (userAgent.includes("mac")) return "macos";
  if (userAgent.includes("linux")) return "linux";
  return "windows";
};

interface TitleBarProps {
  onNavigate?: (toolId: ToolId, tabId?: string) => void;
}

function SearchTrigger({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex justify-center items-center h-full pointer-events-none"> 
        <button 
            onClick={onClick}
            className="flex items-center gap-2 px-3 py-0.5 text-xs text-default-400 bg-default-100/50 hover:bg-default-200/50 rounded-md border border-transparent hover:border-default-200 transition-all w-48 sm:w-64 justify-between group h-[22px] pointer-events-auto"
        >
            <div className="flex items-center gap-2">
                <Search className="w-3 h-3" />
                <span>{t('common.search', 'Search')}</span>
            </div>
            <div className="flex items-center gap-1">
               <span className="hidden sm:inline-flex h-3.5 items-center justify-center rounded bg-default-200/50 px-1 font-mono text-[9px] font-medium text-default-500 group-hover:bg-default-200 transition-colors">
                  Ctrl K
               </span>
            </div>
        </button>
    </div>
  )
}

export default function TitleBar({ onNavigate }: TitleBarProps) {
  const [appWindow, setAppWindow] = useState<any>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [os, setOs] = useState("windows");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const _window = getCurrentWindow();
    setAppWindow(_window);
    setOs(getOS());

    const updateMaximized = async () => {
      setIsMaximized(await _window.isMaximized());
    }
    updateMaximized();

    const unlisten = _window.onResized(updateMaximized);
    return () => {
      unlisten.then(f => f());
    }
  }, []);

  // Global keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const minimize = () => appWindow?.minimize();
  const toggleMaximize = async () => {
    if (!appWindow) return;
    const max = await appWindow.isMaximized();
    await appWindow.toggleMaximize();
    setIsMaximized(!max);
  };
  const close = () => appWindow?.close();

  const handleNavigate = (toolId: ToolId, tabId?: string) => {
    if (onNavigate) {
      onNavigate(toolId, tabId);
    }
  };

  return (
    <>
      <CommandMenu 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
        onNavigate={handleNavigate}
      />

      {os === "macos" && (
        <div data-tauri-drag-region className="h-[32px] flex items-center px-3 select-none justify-between bg-transparent">
          <div className="flex gap-2 items-center group w-[70px]">
            {/* Window Controls */}
            <div onClick={close} className="w-[12px] h-[12px] rounded-full bg-[#FF5F56] border border-[#E0443E] flex items-center justify-center cursor-default active:brightness-90">
              <Icons.Mac.Close />
            </div>
            <div onClick={minimize} className="w-[12px] h-[12px] rounded-full bg-[#FFBD2E] border border-[#DEA123] flex items-center justify-center cursor-default active:brightness-90">
              <Icons.Mac.Minimize />
            </div>
            <div onClick={toggleMaximize} className="w-[12px] h-[12px] rounded-full bg-[#27C93F] border border-[#1AAB29] flex items-center justify-center cursor-default active:brightness-90">
              <svg width="6" height="6" viewBox="0 0 6 6" className="opacity-0 group-hover:opacity-100 transition-opacity">
                <path d="M1,3 L5,3 M3,1 L3,5" stroke="#004d00" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>
          <div className="flex-1 px-4 flex justify-center pointer-events-none">
             <SearchTrigger onClick={() => setIsSearchOpen(true)} />
          </div>
          <div className="w-[70px]" />
        </div>
      )}

      {os === "linux" && (
        <div data-tauri-drag-region className="h-[36px] flex items-center justify-between select-none px-2">
          <div className="flex-1 flex items-center px-2 pointer-events-none w-[100px]">
            <span className="text-xs font-bold text-[#2e3436] dark:text-[#d3d7cf]">TroveKit</span>
          </div>
           <div className="flex-1 px-4 flex justify-center pointer-events-none">
             <SearchTrigger onClick={() => setIsSearchOpen(true)} />
          </div>
          <div className="flex items-center gap-1 w-[100px] justify-end">
            <button onClick={minimize} className="w-[28px] h-[28px] rounded-full hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center text-gray-600 dark:text-gray-300 transition-colors">
              <Icons.Linux.Minimize />
            </button>
            <button onClick={toggleMaximize} className="w-[28px] h-[28px] rounded-full hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center text-gray-600 dark:text-gray-300 transition-colors">
              {isMaximized ? <Icons.Linux.Restore /> : <Icons.Linux.Maximize />}
            </button>
            <button onClick={close} className="w-[28px] h-[28px] rounded-full hover:bg-[#e01b24] hover:text-white flex items-center justify-center text-gray-600 dark:text-gray-300 transition-colors">
              <Icons.Linux.Close />
            </button>
          </div>
        </div>
      )}

      {os === "windows" && (
        <div data-tauri-drag-region className="h-[32px] bg-background flex items-stretch justify-between select-none text-sm z-50 border-b border-divider">
          <div className="flex items-center px-3 pointer-events-none gap-2 w-[140px]">
            <span className="text-[10px] text-default-500 font-medium">TroveKit</span>
          </div>
          
          <div className="flex-1 px-4 flex items-center justify-center pointer-events-none">
             <SearchTrigger onClick={() => setIsSearchOpen(true)} />
          </div>

          <div className="flex items-stretch w-[140px] justify-end">
            <div onClick={minimize} className="w-[46px] flex items-center justify-center hover:bg-default-100 transition-colors cursor-default text-foreground">
              <Icons.Windows.Minimize />
            </div>
            <div onClick={toggleMaximize} className="w-[46px] flex items-center justify-center hover:bg-default-100 transition-colors cursor-default text-foreground">
              {isMaximized ? <Icons.Windows.Restore /> : <Icons.Windows.Maximize />}
            </div>
            <div onClick={close} className="w-[46px] flex items-center justify-center hover:bg-danger hover:text-danger-foreground transition-colors cursor-default text-foreground">
              <Icons.Windows.Close />
            </div>
          </div>
        </div>
      )}
    </>
  );
}