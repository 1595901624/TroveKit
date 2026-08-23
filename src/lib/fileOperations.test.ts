import { describe, expect, it } from "vitest"
import { fileNameFromPath, formatFileSize, replaceFileName } from "./fileOperations"

describe("file operation path helpers", () => {
  it("handles Windows and Unix paths", () => {
    expect(fileNameFromPath("C:\\data\\archive.bin")).toBe("archive.bin")
    expect(fileNameFromPath("/tmp/archive.bin")).toBe("archive.bin")
    expect(replaceFileName("C:\\data\\archive.bin", "archive.bin.base64")).toBe("C:\\data\\archive.bin.base64")
    expect(replaceFileName("/tmp/archive.bin", "archive.decoded")).toBe("/tmp/archive.decoded")
  })

  it("formats file sizes at binary unit boundaries", () => {
    expect(formatFileSize(512)).toBe("512 B")
    expect(formatFileSize(1536)).toBe("1.5 KB")
    expect(formatFileSize(2 * 1024 * 1024)).toBe("2.00 MB")
  })
})
