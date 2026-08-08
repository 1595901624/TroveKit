import { describe, expect, it } from "vitest"
import { collectionElements, collectionValue, SelectItem } from "./base-ui"

describe("Base UI collection compatibility", () => {
  it("preserves HeroUI item keys without React's .$ prefix", () => {
    const children = [
      <SelectItem key="en">English</SelectItem>,
      <SelectItem key="zh-TW">繁體中文</SelectItem>,
      <SelectItem key="a:b">Colon key</SelectItem>,
    ]

    expect(collectionElements(children).map(collectionValue)).toEqual(["en", "zh-TW", "a:b"])
  })

  it("prefers an explicit value over the React key", () => {
    const [item] = collectionElements(<SelectItem key="display-key" value="runtime-value">Item</SelectItem>)
    expect(collectionValue(item)).toBe("runtime-value")
  })
})
