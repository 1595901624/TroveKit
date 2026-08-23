import { Channel, invoke } from "@tauri-apps/api/core"

export interface FileProgress {
  processedBytes: number
  totalBytes: number
  percent: number
}

export interface FileOperationResult {
  outputPath: string
  processedBytes: number
}

export interface FileHashResult {
  algorithm: string
  digest: string
  processedBytes: number
}

export async function runFileCommand<T>(
  command: string,
  args: Record<string, unknown>,
  onProgress: (progress: FileProgress) => void,
) {
  const channel = new Channel<FileProgress>()
  channel.onmessage = onProgress
  return invoke<T>(command, { ...args, onProgress: channel })
}

export function fileNameFromPath(path: string) {
  return path.split(/[\\/]/).pop() || path
}

export function replaceFileName(path: string, fileName: string) {
  const separatorIndex = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"))
  return separatorIndex >= 0 ? `${path.slice(0, separatorIndex + 1)}${fileName}` : fileName
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}
