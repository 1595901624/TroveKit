import { describe, it, expect } from "vitest"
import {
  collectMatches,
  formatMatchesAsCsv,
  normalizeFlags,
  parseRegexLiteral,
  replaceAll,
  replaceOnce,
} from "./regex"

describe("regex helpers", () => {
  it("normalizes flags order and deduplicates", () => {
    expect(normalizeFlags("migggsu")).toBe("gimsu")
    expect(normalizeFlags("yig")).toBe("giy")
    expect(normalizeFlags("")).toBe("")
  })

  it("parses /pattern/flags literal", () => {
    expect(parseRegexLiteral("/foo/gi")).toEqual({ pattern: "foo", flags: "gi" })
    expect(parseRegexLiteral(" /foo/gi ")).toEqual({ pattern: "foo", flags: "gi" })
    expect(parseRegexLiteral("foo")).toBeNull()
  })

  it("collects global matches and avoids infinite loops on empty matches", () => {
    const matches = collectMatches("a", /(?:)/g)
    expect(matches.length).toBe(2)
    expect(matches[0]).toMatchObject({ start: 0, end: 0, text: "" })
    expect(matches[1]).toMatchObject({ start: 1, end: 1, text: "" })
  })

  it("collects group captures", () => {
    const matches = collectMatches("abc123", /([a-z]+)(\d+)/g)
    expect(matches.length).toBe(1)
    expect(matches[0].text).toBe("abc123")
    expect(matches[0].groups).toEqual(["abc", "123"])
  })

  it("replaceOnce returns count 1 when there is a match", () => {
    const r = replaceOnce("a a a", "a", "g", "b")
    if ("error" in r) throw new Error(r.error)
    expect(r.count).toBe(1)
    expect(r.output).toBe("b a a")
  })

  it("replaceAll returns correct count", () => {
    const r = replaceAll("a a a", "a", "", "b")
    if ("error" in r) throw new Error(r.error)
    expect(r.count).toBe(3)
    expect(r.output).toBe("b b b")
  })

  it("formats csv", () => {
    const matches = collectMatches("a,b", /,/g)
    const csv = formatMatchesAsCsv(matches)
    expect(csv.split("\n")[0]).toBe("matchIndex,start,end,text,groups,namedGroups")
    expect(csv).toContain('","')
  })
})
