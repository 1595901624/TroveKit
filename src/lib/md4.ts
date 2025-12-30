export default function md4(message: string): string {
  const rotl = (x: number, n: number) => (x << n) | (x >>> (32 - n))
  const toBytes = (msg: string) => new TextEncoder().encode(msg)
  const bytes = toBytes(message)
  const bitLen = bytes.length * 8
  const bitLenLow = bitLen % 0x100000000
  const bitLenHigh = Math.floor(bitLen / 0x100000000)
  const withPadding = new Uint8Array(((bytes.length + 8) >> 6 << 6) + 64)
  withPadding.set(bytes)
  withPadding[bytes.length] = 0x80
  for (let i = 0; i < 4; i++) {
    withPadding[withPadding.length - 8 + i] = (bitLenLow >>> (8 * i)) & 0xff
    withPadding[withPadding.length - 4 + i] = (bitLenHigh >>> (8 * i)) & 0xff
  }
  const le32 = (arr: Uint8Array, off: number) => arr[off] | (arr[off + 1] << 8) | (arr[off + 2] << 16) | (arr[off + 3] << 24)
  let a = 0x67452301
  let b = 0xefcdab89
  let c = 0x98badcfe
  let d = 0x10325476
  for (let i = 0; i < withPadding.length; i += 64) {
    const X: number[] = new Array(16)
    for (let j = 0; j < 16; j++) X[j] = le32(withPadding, i + j * 4) >>> 0
    let AA = a
    let BB = b
    let CC = c
    let DD = d
    for (let j = 0; j < 16; j++) {
      const k = j
      const F = (b & c) | (~b & d)
      const tmp = (a + F + X[k]) >>> 0
      a = rotl(tmp, [3, 7, 11, 19][j % 4]) >>> 0
      const t = a; a = d; d = c; c = b; b = t
    }
    for (let j = 0; j < 16; j++) {
      const k = (j % 4) * 4 + Math.floor(j / 4)
      const G = (b & c) | (b & d) | (c & d)
      const tmp = (a + G + X[k] + 0x5a827999) >>> 0
      a = rotl(tmp, [3, 5, 9, 13][j % 4]) >>> 0
      const t = a; a = d; d = c; c = b; b = t
    }
    const order = [0, 8, 4, 12, 2, 10, 6, 14, 1, 9, 5, 13, 3, 11, 7, 15]
    for (let j = 0; j < 16; j++) {
      const k = order[j]
      const H = b ^ c ^ d
      const tmp = (a + H + X[k] + 0x6ed9eba1) >>> 0
      a = rotl(tmp, [3, 9, 11, 15][j % 4]) >>> 0
      const t = a; a = d; d = c; c = b; b = t
    }
    a = (a + AA) >>> 0
    b = (b + BB) >>> 0
    c = (c + CC) >>> 0
    d = (d + DD) >>> 0
  }
  const toHexLE = (v: number) => {
    let s = ""
    for (let i = 0; i < 4; i++) {
      s += ("0" + ((v >>> (i * 8)) & 0xff).toString(16)).slice(-2)
    }
    return s
  }
  return toHexLE(a) + toHexLE(b) + toHexLE(c) + toHexLE(d)
}