import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { Button, ButtonGroup, collectionElements, collectionValue, SelectItem } from "./base-ui"

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

describe("Base UI button compatibility", () => {
  it("keeps flat semantic colors visible after Tailwind class merging", () => {
    const markup = renderToStaticMarkup(<Button color="primary" variant="flat">Encode</Button>)

    expect(markup).toContain("bg-primary/15")
    expect(markup).toContain("text-primary")
    expect(markup).not.toContain("bg-opacity-15")
  })

  it("passes shared ButtonGroup styling to child buttons", () => {
    const markup = renderToStaticMarkup(
      <ButtonGroup variant="flat" color="secondary">
        <Button>One</Button>
        <Button color="danger">Two</Button>
      </ButtonGroup>,
    )

    expect(markup).toContain("bg-secondary/15")
    expect(markup).toContain("bg-danger/15")
  })
})
