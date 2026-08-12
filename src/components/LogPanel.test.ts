import { describe, expect, it } from "vitest"
import { resolveLogPanelResize } from "./LogPanel"

describe("resolveLogPanelResize", () => {
  it("re-bases at the maximum so reverse dragging reacts immediately", () => {
    const atMaximum = resolveLogPanelResize({ pointerX: 0, width: 320 }, -500)
    expect(atMaximum.width).toBe(640)
    expect(atMaximum.origin).toEqual({ pointerX: -500, width: 640 })

    const reversed = resolveLogPanelResize(atMaximum.origin, -490)
    expect(reversed.width).toBe(630)
  })

  it("re-bases at the minimum so reverse dragging reacts immediately", () => {
    const atMinimum = resolveLogPanelResize({ pointerX: 0, width: 320 }, 200)
    expect(atMinimum.width).toBe(280)
    expect(atMinimum.origin).toEqual({ pointerX: 200, width: 280 })

    const reversed = resolveLogPanelResize(atMinimum.origin, 190)
    expect(reversed.width).toBe(290)
  })
})
