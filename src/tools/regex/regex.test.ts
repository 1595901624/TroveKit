import { describe, it, expect } from "vitest"
import {
  collectMatches,
  formatMatchesAsCsv,
  normalizeFlags,
  parseRegexLiteral,
  replaceAll,
  replaceOnce,
} from "./regex"

/**
 * 正则表达式工具函数测试套件
 * 测试 regex.ts 中的核心辅助函数
 */
describe("regex helpers", () => {
  /**
   * 测试：标准化正则表达式标志
   * 验证 flags 字符串的字母排序和去重功能
   */
  it("normalizes flags order and deduplicates", () => {
    // 测试标志重排序：migggsu -> gimsu（排序并去重）
    expect(normalizeFlags("migggsu")).toBe("gimsu")
    // 测试标志重排序：yig -> giy
    expect(normalizeFlags("yig")).toBe("giy")
    // 测试空字符串情况
    expect(normalizeFlags("")).toBe("")
  })

  /**
   * 测试：解析正则字面量
   * 验证从 /pattern/flags 格式中提取模式和标志
   */
  it("parses /pattern/flags literal", () => {
    // 标准格式解析
    expect(parseRegexLiteral("/foo/gi")).toEqual({ pattern: "foo", flags: "gi" })
    // 带前后空格的格式
    expect(parseRegexLiteral(" /foo/gi ")).toEqual({ pattern: "foo", flags: "gi" })
    // 无效格式（缺少斜杠分隔符）应返回 null
    expect(parseRegexLiteral("foo")).toBeNull()
  })

  /**
   * 测试：收集全局匹配结果
   * 验证空匹配时避免无限循环的逻辑
   */
  it("collects global matches and avoids infinite loops on empty matches", () => {
    // 使用空匹配模式 (?:) 测试防无限循环机制
    const matches = collectMatches("a", /(?:)/g)
    // 字符串 "a" 长度为 1，空匹配应在位置 0 和 1 各出现一次
    expect(matches.length).toBe(2)
    expect(matches[0]).toMatchObject({ start: 0, end: 0, text: "" })
    expect(matches[1]).toMatchObject({ start: 1, end: 1, text: "" })
  })

  /**
   * 测试：收集带捕获组的匹配结果
   * 验证命名捕获组和普通捕获组的提取
   */
  it("collects group captures", () => {
    // 模式包含两个捕获组：([a-z]+) 和 (\d+)
    const matches = collectMatches("abc123", /([a-z]+)(\d+)/g)
    expect(matches.length).toBe(1)
    // 完整匹配文本
    expect(matches[0].text).toBe("abc123")
    // 捕获组数组：第一个组匹配 "abc"，第二个组匹配 "123"
    expect(matches[0].groups).toEqual(["abc", "123"])
  })

  /**
   * 测试：单次替换功能
   * 验证只替换第一个匹配项并返回正确计数
   */
  it("replaceOnce returns count 1 when there is a match", () => {
    // 将第一个 "a" 替换为 "b"
    const r = replaceOnce("a a a", "a", "g", "b")
    // 如果返回错误则抛出异常
    if ("error" in r) throw new Error(r.error)
    // 验证只替换了 1 个
    expect(r.count).toBe(1)
    // 验证输出：只有第一个 "a" 被替换
    expect(r.output).toBe("b a a")
  })

  /**
   * 测试：全局替换功能
   * 验证替换所有匹配项并返回正确计数
   */
  it("replaceAll returns correct count", () => {
    // 将所有 "a" 替换为 "b"
    const r = replaceAll("a a a", "a", "", "b")
    if ("error" in r) throw new Error(r.error)
    // 验证替换了 3 个
    expect(r.count).toBe(3)
    // 验证所有 "a" 都被替换
    expect(r.output).toBe("b b b")
  })

  /**
   * 测试：CSV 格式输出
   * 验证匹配结果转换为 CSV 格式的表头和内容
   */
  it("formats csv", () => {
    // 收集逗号字符的匹配结果
    const matches = collectMatches("a,b", /,/g)
    // 转换为 CSV 格式
    const csv = formatMatchesAsCsv(matches)
    // 验证 CSV 表头包含所有必需字段
    expect(csv.split("\n")[0]).toBe("matchIndex,start,end,text,groups,namedGroups")
    // 验证 CSV 内容正确转义了逗号字符
    expect(csv).toContain('","')
  })
})
