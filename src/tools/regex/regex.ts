export interface RegexMatch {
  matchIndex: number
  start: number
  end: number
  text: string
  groups: Array<string | null>
  namedGroups?: Record<string, string>
}

const FLAG_ORDER = ["g", "i", "m", "s", "u", "y"] as const

export function normalizeFlags(flags: string): string {
  const set = new Set<string>()
  for (const ch of flags) {
    if (FLAG_ORDER.includes(ch as any)) set.add(ch)
  }
  return FLAG_ORDER.filter((f) => set.has(f)).join("")
}

export function parseRegexLiteral(input: string): { pattern: string; flags: string } | null {
  const trimmed = input.trim()
  if (!trimmed.startsWith("/") || trimmed.length < 2) return null

  for (let i = trimmed.length - 1; i >= 1; i--) {
    if (trimmed[i] !== "/") continue

    let backslashCount = 0
    for (let j = i - 1; j >= 0 && trimmed[j] === "\\"; j--) backslashCount++
    if (backslashCount % 2 === 1) continue

    const pattern = trimmed.slice(1, i)
    const flags = trimmed.slice(i + 1)
    if (!/^[a-z]*$/i.test(flags)) return null
    return { pattern, flags: normalizeFlags(flags) }
  }

  return null
}

export function buildRegExp(pattern: string, flags: string): { regex: RegExp } | { error: string } {
  try {
    return { regex: new RegExp(pattern, normalizeFlags(flags)) }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export function collectMatches(input: string, regex: RegExp): RegexMatch[] {
  const r = new RegExp(regex.source, regex.flags)
  r.lastIndex = 0

  const matches: RegexMatch[] = []
  let m: RegExpExecArray | null
  const isGlobal = r.global

  if (!isGlobal) {
    m = r.exec(input)
    if (!m || m.index === undefined) return matches
    matches.push(toRegexMatch(m, 0))
    return matches
  }

  let matchIndex = 0
  while ((m = r.exec(input)) !== null) {
    if (m.index === undefined) break
    matches.push(toRegexMatch(m, matchIndex++))
    if (m[0] === "") r.lastIndex++
    if (r.lastIndex > input.length) break
  }

  return matches
}

function toRegexMatch(m: RegExpExecArray, matchIndex: number): RegexMatch {
  const text = m[0] ?? ""
  const start = m.index ?? 0
  const end = start + text.length
  const groups = m.length > 1 ? Array.from(m).slice(1) : []
  const namedGroups = m.groups ? (m.groups as Record<string, string>) : undefined

  return { matchIndex, start, end, text, groups, namedGroups }
}

export function ensureGlobal(flags: string): string {
  const f = normalizeFlags(flags)
  return f.includes("g") ? f : normalizeFlags(`g${f}`)
}

export function disableGlobal(flags: string): string {
  return normalizeFlags(normalizeFlags(flags).replaceAll("g", ""))
}

export function replaceOnce(input: string, pattern: string, flags: string, replacement: string): { output: string; count: number } | { error: string } {
  const built = buildRegExp(pattern, disableGlobal(flags))
  if ("error" in built) return built
  const matches = collectMatches(input, built.regex)
  if (matches.length === 0) return { output: input, count: 0 }
  return { output: input.replace(built.regex, replacement), count: 1 }
}

export function replaceAll(input: string, pattern: string, flags: string, replacement: string): { output: string; count: number } | { error: string } {
  const built = buildRegExp(pattern, ensureGlobal(flags))
  if ("error" in built) return built
  const matches = collectMatches(input, built.regex)
  if (matches.length === 0) return { output: input, count: 0 }
  return { output: input.replace(built.regex, replacement), count: matches.length }
}

export function formatMatchesAsCsv(matches: RegexMatch[]): string {
  const lines: string[] = []
  lines.push(["matchIndex", "start", "end", "text", "groups", "namedGroups"].map(csvEscape).join(","))

  for (const m of matches) {
    const row = [
      String(m.matchIndex),
      String(m.start),
      String(m.end),
      m.text,
      JSON.stringify(m.groups),
      m.namedGroups ? JSON.stringify(m.namedGroups) : "",
    ]
    lines.push(row.map(csvEscape).join(","))
  }

  return lines.join("\n")
}

function csvEscape(value: string): string {
  const needsQuotes = /[",\n\r]/.test(value)
  const escaped = value.replace(/"/g, "\"\"")
  return needsQuotes ? `"${escaped}"` : escaped
}
