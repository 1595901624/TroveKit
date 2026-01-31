export type IpVersion = 4 | 6

export type Ipv4HostRule = "traditional" | "rfc3021"

export class SubnetError extends Error {
  code:
    | "invalid_input"
    | "invalid_cidr"
    | "invalid_prefix"
    | "invalid_ipv4"
    | "invalid_ipv6"
    | "invalid_netmask"

  constructor(code: SubnetError["code"], message?: string) {
    super(message || code)
    this.code = code
  }
}

export interface SubnetCalcOptions {
  ipv4HostRule?: Ipv4HostRule
}

export interface Ipv4SubnetResult {
  version: 4
  ip: string
  prefix: number
  networkAddress: string
  broadcastAddress: string
  firstHost: string | null
  lastHost: string | null
  subnetMask: string
  wildcardMask: string
  totalAddresses: string
  usableAddresses: string
  binary: {
    ip: string
    subnetMask: string
    networkAddress: string
    broadcastAddress: string
  }
}

export interface Ipv6SubnetResult {
  version: 6
  ip: string
  ipExpanded: string
  prefix: number
  networkAddressCompressed: string
  networkAddressExpanded: string
  lastAddressCompressed: string
  lastAddressExpanded: string
  networkPrefixCompressed: string
  networkPrefixExpanded: string
  totalAddresses: string
  usableAddresses: string
  binary: {
    ip: string
    networkAddress: string
    lastAddress: string
  }
}

export type SubnetResult = Ipv4SubnetResult | Ipv6SubnetResult

export type Ipv4AddressClass = "A" | "B" | "C" | "D" | "E"
export type Ipv4AddressType = "public" | "private" | "loopback" | "linkLocal" | "multicast" | "experimental" | "other"

export interface Ipv4AddressMeta {
  ipv4Class: Ipv4AddressClass
  addressType: Ipv4AddressType
  isPrivate: boolean
}

export function getIpv4AddressMeta(ip: string | number): Ipv4AddressMeta {
  const u32 = typeof ip === "number" ? (ip >>> 0) : parseIpv4ToU32(ip)
  const first = (u32 >>> 24) & 255

  const ipv4Class: Ipv4AddressClass =
    first >= 1 && first <= 126 ? "A" :
    first >= 128 && first <= 191 ? "B" :
    first >= 192 && first <= 223 ? "C" :
    first >= 224 && first <= 239 ? "D" :
    "E"

  // RFC1918 private ranges
  const isPrivate =
    (u32 & 0xff000000) === 0x0a000000 || // 10.0.0.0/8
    (u32 & 0xfff00000) === 0xac100000 || // 172.16.0.0/12
    (u32 & 0xffff0000) === 0xc0a80000 // 192.168.0.0/16

  const isLoopback = (u32 & 0xff000000) === 0x7f000000 // 127.0.0.0/8
  const isLinkLocal = (u32 & 0xffff0000) === 0xa9fe0000 // 169.254.0.0/16
  const isMulticast = first >= 224 && first <= 239
  const isExperimental = first >= 240 && first <= 255

  const addressType: Ipv4AddressType =
    isPrivate ? "private" :
    isLoopback ? "loopback" :
    isLinkLocal ? "linkLocal" :
    isMulticast ? "multicast" :
    isExperimental ? "experimental" :
    (first >= 1 && first <= 223) ? "public" :
    "other"

  return { ipv4Class, addressType, isPrivate }
}

export function ipv4PrefixToMaskString(prefix: number): string {
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) throw new SubnetError("invalid_prefix")
  return formatIpv4(prefixToIpv4Mask(prefix))
}

export function calcFromCidr(input: string, options: SubnetCalcOptions = {}): SubnetResult {
  const s = (input || "").trim()
  if (!s) throw new SubnetError("invalid_input")

  const idx = s.lastIndexOf("/")
  if (idx === -1) throw new SubnetError("invalid_cidr")

  const ipStrRaw = s.slice(0, idx).trim()
  const prefixStr = s.slice(idx + 1).trim()
  if (!ipStrRaw || !prefixStr) throw new SubnetError("invalid_cidr")

  const prefix = parsePrefix(prefixStr)

  const ipStr = stripBrackets(stripZoneId(ipStrRaw))
  if (looksLikeIpv6(ipStr)) {
    if (prefix < 0 || prefix > 128) throw new SubnetError("invalid_prefix")
    const ip = parseIpv6ToBigInt(ipStr)
    return calcIpv6Subnet(ip, prefix)
  }

  if (prefix < 0 || prefix > 32) throw new SubnetError("invalid_prefix")
  const ip = parseIpv4ToU32(ipStr)
  return calcIpv4Subnet(ip, prefix, options)
}

export function calcFromIpv4Netmask(ipStr: string, netmaskStr: string, options: SubnetCalcOptions = {}): Ipv4SubnetResult {
  const ip = parseIpv4ToU32((ipStr || "").trim())
  const mask = parseIpv4NetmaskToU32((netmaskStr || "").trim())
  const prefix = ipv4MaskToPrefix(mask)
  return calcIpv4Subnet(ip, prefix, options)
}

export function calcIpv4Subnet(ip: number, prefix: number, options: SubnetCalcOptions = {}): Ipv4SubnetResult {
  const hostRule: Ipv4HostRule = options.ipv4HostRule || "rfc3021"
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) throw new SubnetError("invalid_prefix")

  const mask = prefixToIpv4Mask(prefix)
  const network = (ip & mask) >>> 0
  const broadcast = (network | (~mask >>> 0)) >>> 0

  const total = 1n << BigInt(32 - prefix)
  let firstHost: number | null = null
  let lastHost: number | null = null
  let usable: bigint

  if (prefix === 32) {
    firstHost = ip >>> 0
    lastHost = ip >>> 0
    usable = 1n
  } else if (prefix === 31) {
    if (hostRule === "rfc3021") {
      firstHost = network
      lastHost = broadcast
      usable = 2n
    } else {
      firstHost = null
      lastHost = null
      usable = 0n
    }
  } else {
    firstHost = (network + 1) >>> 0
    lastHost = (broadcast - 1) >>> 0
    usable = total >= 2n ? total - 2n : 0n
  }

  const subnetMaskStr = formatIpv4(mask)
  const wildcard = (~mask >>> 0) >>> 0

  return {
    version: 4,
    ip: formatIpv4(ip),
    prefix,
    networkAddress: formatIpv4(network),
    broadcastAddress: formatIpv4(broadcast),
    firstHost: firstHost === null ? null : formatIpv4(firstHost),
    lastHost: lastHost === null ? null : formatIpv4(lastHost),
    subnetMask: subnetMaskStr,
    wildcardMask: formatIpv4(wildcard),
    totalAddresses: total.toString(),
    usableAddresses: usable.toString(),
    binary: {
      ip: formatBinary32(ip),
      subnetMask: formatBinary32(mask),
      networkAddress: formatBinary32(network),
      broadcastAddress: formatBinary32(broadcast)
    }
  }
}

export function calcIpv6Subnet(ip: bigint, prefix: number): Ipv6SubnetResult {
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 128) throw new SubnetError("invalid_prefix")

  const mask = prefixToIpv6Mask(prefix)
  const network = ip & mask
  const last = network | (ipv6Not(mask) & IPV6_MAX)
  const total = 1n << BigInt(128 - prefix)

  const ipHextets = bigIntToHextets(ip)
  const netHextets = bigIntToHextets(network)
  const lastHextets = bigIntToHextets(last)

  const ipCompressed = formatIpv6Compressed(ipHextets)
  const ipExpanded = formatIpv6Expanded(ipHextets)
  const netCompressed = formatIpv6Compressed(netHextets)
  const netExpanded = formatIpv6Expanded(netHextets)
  const lastCompressed = formatIpv6Compressed(lastHextets)
  const lastExpanded = formatIpv6Expanded(lastHextets)

  return {
    version: 6,
    ip: ipCompressed,
    ipExpanded,
    prefix,
    networkAddressCompressed: netCompressed,
    networkAddressExpanded: netExpanded,
    lastAddressCompressed: lastCompressed,
    lastAddressExpanded: lastExpanded,
    networkPrefixCompressed: `${netCompressed}/${prefix}`,
    networkPrefixExpanded: `${netExpanded}/${prefix}`,
    totalAddresses: total.toString(),
    usableAddresses: total.toString(),
    binary: {
      ip: formatBinary128(ipHextets),
      networkAddress: formatBinary128(netHextets),
      lastAddress: formatBinary128(lastHextets)
    }
  }
}

// ----------------------------
// Parsing + formatting helpers
// ----------------------------

function parsePrefix(s: string): number {
  if (!/^[0-9]+$/.test(s)) throw new SubnetError("invalid_prefix")
  const n = Number(s)
  if (!Number.isFinite(n) || !Number.isInteger(n)) throw new SubnetError("invalid_prefix")
  return n
}

function looksLikeIpv6(s: string): boolean {
  return s.includes(":")
}

function stripZoneId(s: string): string {
  const idx = s.indexOf("%")
  return idx === -1 ? s : s.slice(0, idx)
}

function stripBrackets(s: string): string {
  if (s.startsWith("[") && s.endsWith("]")) return s.slice(1, -1)
  return s
}

function parseIpv4ToU32(input: string): number {
  const s = (input || "").trim()
  const parts = s.split(".")
  if (parts.length !== 4) throw new SubnetError("invalid_ipv4")
  let out = 0
  for (const p of parts) {
    if (!/^[0-9]+$/.test(p)) throw new SubnetError("invalid_ipv4")
    const n = Number(p)
    if (!Number.isInteger(n) || n < 0 || n > 255) throw new SubnetError("invalid_ipv4")
    out = ((out << 8) | n) >>> 0
  }
  return out >>> 0
}

function formatIpv4(u32: number): string {
  const n = u32 >>> 0
  return `${(n >>> 24) & 255}.${(n >>> 16) & 255}.${(n >>> 8) & 255}.${n & 255}`
}

function prefixToIpv4Mask(prefix: number): number {
  if (prefix === 0) return 0
  // JS bitwise ops are 32-bit signed; keep via >>>0
  const mask = (0xffffffff << (32 - prefix)) >>> 0
  return mask >>> 0
}

function parseIpv4NetmaskToU32(input: string): number {
  const mask = parseIpv4ToU32(input)
  // Validate contiguity: inverse must be 0..0111..11
  const inv = (~mask) >>> 0
  // inv should be like (1<<k)-1
  if ((inv & (inv + 1)) !== 0) throw new SubnetError("invalid_netmask")
  return mask >>> 0
}

function ipv4MaskToPrefix(mask: number): number {
  const m = mask >>> 0
  if (m === 0) return 0
  // Count leading ones in m
  let prefix = 0
  for (let i = 31; i >= 0; i--) {
    if (((m >>> i) & 1) === 1) prefix++
    else break
  }
  // Ensure remaining bits are 0
  const expected = prefixToIpv4Mask(prefix)
  if ((expected >>> 0) !== m) throw new SubnetError("invalid_netmask")
  return prefix
}

function formatBinary32(u32: number): string {
  const n = u32 >>> 0
  const octets = [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]
  return octets.map((o) => o.toString(2).padStart(8, "0")).join(".")
}

const IPV6_MAX = (1n << 128n) - 1n

function ipv6Not(x: bigint): bigint {
  return (~x) & IPV6_MAX
}

function prefixToIpv6Mask(prefix: number): bigint {
  if (prefix === 0) return 0n
  const shift = 128n - BigInt(prefix)
  return (IPV6_MAX << shift) & IPV6_MAX
}

function parseIpv6ToBigInt(input: string): bigint {
  const hextets = parseIpv6ToHextets(input)
  let out = 0n
  for (const h of hextets) {
    out = (out << 16n) | BigInt(h)
  }
  return out
}

function parseIpv6ToHextets(input: string): number[] {
  let s = (input || "").trim().toLowerCase()
  if (!s) throw new SubnetError("invalid_ipv6")

  // Embedded IPv4 (e.g. ::ffff:192.168.0.1)
  let embeddedV4: number[] | null = null
  if (s.includes(".")) {
    const lastColon = s.lastIndexOf(":")
    if (lastColon === -1) throw new SubnetError("invalid_ipv6")
    const v4part = s.slice(lastColon + 1)
    const v4 = parseIpv4ToU32(v4part)
    embeddedV4 = [
      ((v4 >>> 16) & 0xffff) >>> 0,
      (v4 & 0xffff) >>> 0
    ]
    s = s.slice(0, lastColon) // drop v4 tail
    if (s.endsWith(":")) s = s.slice(0, -1)
  }

  const pieces = s.split("::")
  if (pieces.length > 2) throw new SubnetError("invalid_ipv6")

  const left = pieces[0] ? pieces[0].split(":").filter(Boolean) : []
  const right = pieces.length === 2 && pieces[1] ? pieces[1].split(":").filter(Boolean) : []

  const leftNums = left.map(parseHextet)
  const rightNums = right.map(parseHextet)
  const v4Nums = embeddedV4 || []

  const totalProvided = leftNums.length + rightNums.length + v4Nums.length
  if (totalProvided > 8) throw new SubnetError("invalid_ipv6")

  const zerosToInsert = pieces.length === 2 ? 8 - totalProvided : 0
  if (pieces.length === 1 && totalProvided !== 8) throw new SubnetError("invalid_ipv6")

  const out: number[] = []
  out.push(...leftNums)
  for (let i = 0; i < zerosToInsert; i++) out.push(0)
  out.push(...rightNums)
  out.push(...v4Nums)

  if (out.length !== 8) throw new SubnetError("invalid_ipv6")
  return out
}

function parseHextet(s: string): number {
  if (!s) throw new SubnetError("invalid_ipv6")
  if (!/^[0-9a-f]{1,4}$/.test(s)) throw new SubnetError("invalid_ipv6")
  const n = Number.parseInt(s, 16)
  if (!Number.isInteger(n) || n < 0 || n > 0xffff) throw new SubnetError("invalid_ipv6")
  return n
}

function bigIntToHextets(v: bigint): number[] {
  const out = new Array<number>(8)
  let x = v & IPV6_MAX
  for (let i = 7; i >= 0; i--) {
    out[i] = Number(x & 0xffffn)
    x >>= 16n
  }
  return out
}

export function formatIpv6Expanded(hextets: number[]): string {
  if (hextets.length !== 8) throw new SubnetError("invalid_ipv6")
  return hextets.map((h) => h.toString(16).padStart(4, "0")).join(":")
}

export function formatIpv6Compressed(hextets: number[]): string {
  if (hextets.length !== 8) throw new SubnetError("invalid_ipv6")

  // Special case: all zeros
  if (hextets.every((h) => h === 0)) return "::"

  // Find longest run of zeros (length>=2). If tie, choose first.
  let bestStart = -1
  let bestLen = 0
  let curStart = -1
  let curLen = 0
  for (let i = 0; i < 8; i++) {
    if (hextets[i] === 0) {
      if (curStart === -1) curStart = i
      curLen++
      if (curLen > bestLen) {
        bestLen = curLen
        bestStart = curStart
      }
    } else {
      curStart = -1
      curLen = 0
    }
  }
  if (bestLen < 2) {
    return hextets.map((h) => h.toString(16)).join(":")
  }

  const parts: string[] = []
  for (let i = 0; i < bestStart; i++) parts.push(hextets[i].toString(16))
  parts.push("")
  for (let i = bestStart + bestLen; i < 8; i++) parts.push(hextets[i].toString(16))

  let out = parts.join(":")
  // Normalize edge cases
  if (out.startsWith(":")) out = ":" + out
  if (out.endsWith(":")) out = out + ":"
  return out
}

function formatBinary128(hextets: number[]): string {
  if (hextets.length !== 8) throw new SubnetError("invalid_ipv6")
  return hextets.map((h) => h.toString(2).padStart(16, "0")).join(":")
}
