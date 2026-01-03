import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

// SVG 图标
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
      // 实际的缩放图标通常是两个三角形或加号，但全屏图标通常是两个箭头。
      // 简化为加号用于“缩放”行为或类似。
      // 让我们使用标准的“加号”用于缩放，或箭头用于全屏。
      // 现代Mac使用箭头用于全屏。
    ),
    MaximizeArrows: () => (
      <svg width="6" height="6" viewBox="0 0 6 6" className="opacity-0 group-hover:opacity-100 transition-opacity">
        <path d="M1.5,4.5 L0,6 L6,6 L6,0 L4.5,1.5 L1.5,4.5" fill="#006500" />
        {/* 粗略的箭头近似 */}
        <path d="M1,5 L5,1" stroke="#004d00" strokeWidth="1" strokeLinecap="round" />
      </svg>
    )
  }
};

// 检测操作系统
const getOS = () => {
  const userAgent = window.navigator.userAgent.toLowerCase();
  if (userAgent.includes("mac")) return "macos";
  if (userAgent.includes("linux")) return "linux";
  return "windows";
};

export default function TitleBar() {
  const [appWindow, setAppWindow] = useState<any>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [os, setOs] = useState("windows");
  // 如果需要，强制OS用于调试，否则坚持自动
  // const os = "linux"; 

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

  const minimize = () => appWindow?.minimize();
  const toggleMaximize = async () => {
    if (!appWindow) return;
    const max = await appWindow.isMaximized();
    // if (max) {
    //   await appWindow.unmaximize();
    // } else {
    await appWindow.toggleMaximize();
    // }
    setIsMaximized(!max);
  };
  const close = () => appWindow?.close();

  if (os === "macos") {
    return (
      // <div data-tauri-drag-region className="h-[28px] bg-gray-200 dark:bg-[#282828] flex items-center px-3 select-none justify-between border-b border-gray-300 dark:border-black/50">
      <div data-tauri-drag-region className="h-[28px] flex items-center px-3 select-none justify-between">
        <div className="flex gap-2 items-center group">
          {/* 关闭 */}
          <div onClick={close} className="w-[12px] h-[12px] rounded-full bg-[#FF5F56] border border-[#E0443E] flex items-center justify-center cursor-default active:brightness-90">
            <Icons.Mac.Close />
          </div>
          {/* 最小化 */}
          <div onClick={minimize} className="w-[12px] h-[12px] rounded-full bg-[#FFBD2E] border border-[#DEA123] flex items-center justify-center cursor-default active:brightness-90">
            <Icons.Mac.Minimize />
          </div>
          {/* 最大化 */}
          <div onClick={toggleMaximize} className="w-[12px] h-[12px] rounded-full bg-[#27C93F] border border-[#1AAB29] flex items-center justify-center cursor-default active:brightness-90">
            {/* 简单的加号或箭头 */}
            <svg width="6" height="6" viewBox="0 0 6 6" className="opacity-0 group-hover:opacity-100 transition-opacity">
              <path d="M1,3 L5,3 M3,1 L3,5" stroke="#004d00" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>
        <div className="flex-1 flex justify-center text-[10px] font-semibold text-gray-600 dark:text-gray-400 pointer-events-none">
          TroveKit
        </div>
        <div className="w-[60px]" />
      </div>
    );
  }

  if (os === "linux") {
    // Adwaita 风格 (GNOME)
    return (
      // <div data-tauri-drag-region className="h-[36px] bg-[#f6f5f4] dark:bg-[#242424] flex items-center justify-between select-none px-2 border-b border-gray-300 dark:border-[#1e1e1e]">
      <div data-tauri-drag-region className="h-[36px] flex items-center justify-between select-none px-2">
        <div className="flex-1 flex items-center text-xs font-bold text-[#2e3436] dark:text-[#d3d7cf] px-2 pointer-events-none">
          TroveKit
        </div>
        <div className="flex items-center gap-1">
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
    );
  }

  // 默认 Windows
  return (
    <div data-tauri-drag-region className="h-[32px] bg-background flex items-stretch justify-between select-none text-sm z-50 border-b border-divider">
      <div className="flex items-center px-3 pointer-events-none gap-2">
        {/* Optional: Add app icon here if needed */}
        <span className="text-[10px] text-default-500 font-medium">TroveKit</span>
      </div>
      <div className="flex items-stretch">
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
  );
}
