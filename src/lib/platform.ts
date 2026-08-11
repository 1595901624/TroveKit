export type DesktopPlatform = "macos" | "linux" | "windows"

export function detectHostPlatform(): DesktopPlatform {
  if (typeof navigator === "undefined") return "windows"

  const platform = `${navigator.platform} ${navigator.userAgent}`.toLowerCase()
  if (platform.includes("mac")) return "macos"
  if (platform.includes("linux") || platform.includes("x11")) return "linux"
  return "windows"
}

export function detectDesktopPlatform(): DesktopPlatform {
  if (import.meta.env.DEV && typeof window !== "undefined") {
    const preview = import.meta.env.VITE_PLATFORM
      ?? new URLSearchParams(window.location.search).get("platform")
    if (preview === "macos" || preview === "linux" || preview === "windows") return preview
  }

  return detectHostPlatform()
}
