// Trivium stream cipher (80-bit key, 80-bit IV)
//
// Notes:
// - Bit numbering follows the common eSTREAM convention: key/iv bits are read LSb-first per byte.
// - Keystream bits are mapped to bytes LSb-first (bit 0 is the least significant bit of the first byte).
// - The cipher is symmetric: encryption/decryption are XOR with keystream.

const KEY_BYTES = 10
const IV_BYTES = 10

function normalizeToFixed(bytes: Uint8Array, targetLen: number): Uint8Array {
  if (bytes.length === targetLen) return bytes
  const out = new Uint8Array(targetLen)
  out.set(bytes.subarray(0, Math.min(bytes.length, targetLen)))
  return out
}

function getBitLSB(bytes: Uint8Array, bitIndex: number): 0 | 1 {
  const byteIndex = bitIndex >>> 3
  const bitOffset = bitIndex & 7
  if (byteIndex < 0 || byteIndex >= bytes.length) return 0
  return ((bytes[byteIndex] >>> bitOffset) & 1) as 0 | 1
}

function warmupCycles(): number {
  // Trivium warms up 4 * 288 = 1152 steps
  return 4 * 288
}

// -------------------------
// Reference implementation (bit arrays)
// -------------------------

type Bit = 0 | 1

function triviumInitBits(keyBytesRaw: Uint8Array, ivBytesRaw: Uint8Array) {
  const keyBytes = normalizeToFixed(keyBytesRaw, KEY_BYTES)
  const ivBytes = normalizeToFixed(ivBytesRaw, IV_BYTES)

  const s1 = new Uint8Array(93) as unknown as Bit[]
  const s2 = new Uint8Array(84) as unknown as Bit[]
  const s3 = new Uint8Array(111) as unknown as Bit[]

  // s1: 80-bit key then 13 zeros
  for (let i = 0; i < 80; i++) s1[i] = getBitLSB(keyBytes, i)
  for (let i = 80; i < 93; i++) s1[i] = 0

  // s2: 80-bit IV then 4 zeros
  for (let i = 0; i < 80; i++) s2[i] = getBitLSB(ivBytes, i)
  for (let i = 80; i < 84; i++) s2[i] = 0

  // s3: 108 zeros then 3 ones
  for (let i = 0; i < 108; i++) s3[i] = 0
  s3[108] = 1
  s3[109] = 1
  s3[110] = 1

  return { s1, s2, s3 }
}

function shiftIn(reg: Bit[], newBit: Bit) {
  for (let i = reg.length - 1; i >= 1; i--) reg[i] = reg[i - 1]
  reg[0] = newBit
}

function triviumStepBits(state: { s1: Bit[]; s2: Bit[]; s3: Bit[] }): Bit {
  const { s1, s2, s3 } = state

  const t1 = (s1[65] ^ s1[92]) as Bit
  const t2 = (s2[68] ^ s2[83]) as Bit
  const t3 = (s3[65] ^ s3[110]) as Bit
  const z = (t1 ^ t2 ^ t3) as Bit

  const t1n = (t1 ^ ((s1[90] & s1[91]) as Bit) ^ s2[77]) as Bit
  const t2n = (t2 ^ ((s2[81] & s2[82]) as Bit) ^ s3[86]) as Bit
  const t3n = (t3 ^ ((s3[108] & s3[109]) as Bit) ^ s1[68]) as Bit

  shiftIn(s1, t3n)
  shiftIn(s2, t1n)
  shiftIn(s3, t2n)

  return z
}

export function triviumKeystream(key: Uint8Array, iv: Uint8Array, lengthBytes: number): Uint8Array {
  if (lengthBytes < 0) throw new Error("lengthBytes must be >= 0")

  const state = triviumInitBits(key, iv)

  // Warmup
  for (let i = 0; i < warmupCycles(); i++) triviumStepBits(state)

  const out = new Uint8Array(lengthBytes)
  for (let i = 0; i < lengthBytes; i++) {
    let b = 0
    for (let j = 0; j < 8; j++) {
      const bit = triviumStepBits(state)
      b |= bit << j
    }
    out[i] = b
  }
  return out
}

export function triviumXor(key: Uint8Array, iv: Uint8Array, data: Uint8Array): Uint8Array {
  const ks = triviumKeystream(key, iv, data.length)
  const out = new Uint8Array(data.length)
  for (let i = 0; i < data.length; i++) out[i] = data[i] ^ ks[i]
  return out
}

// -------------------------
// Alternate implementation (BigInt registers)
// Used for tests to cross-check correctness.
// -------------------------

function maskBits(len: number): bigint {
  return (1n << BigInt(len)) - 1n
}

function bitOf(reg: bigint, idx: number): bigint {
  return (reg >> BigInt(idx)) & 1n
}

function triviumInitBigInt(keyBytesRaw: Uint8Array, ivBytesRaw: Uint8Array) {
  const keyBytes = normalizeToFixed(keyBytesRaw, KEY_BYTES)
  const ivBytes = normalizeToFixed(ivBytesRaw, IV_BYTES)

  let r1 = 0n
  let r2 = 0n
  let r3 = 0n

  // r1: key bits at positions 0..79
  for (let i = 0; i < 80; i++) {
    const b = BigInt(getBitLSB(keyBytes, i))
    r1 |= b << BigInt(i)
  }

  // r2: iv bits at positions 0..79
  for (let i = 0; i < 80; i++) {
    const b = BigInt(getBitLSB(ivBytes, i))
    r2 |= b << BigInt(i)
  }

  // r3: last three bits are 1
  r3 |= 1n << 108n
  r3 |= 1n << 109n
  r3 |= 1n << 110n

  return {
    r1,
    r2,
    r3,
    m1: maskBits(93),
    m2: maskBits(84),
    m3: maskBits(111)
  }
}

function triviumStepBigInt(state: {
  r1: bigint
  r2: bigint
  r3: bigint
  m1: bigint
  m2: bigint
  m3: bigint
}): 0 | 1 {
  const t1 = bitOf(state.r1, 65) ^ bitOf(state.r1, 92)
  const t2 = bitOf(state.r2, 68) ^ bitOf(state.r2, 83)
  const t3 = bitOf(state.r3, 65) ^ bitOf(state.r3, 110)
  const z = t1 ^ t2 ^ t3

  const t1n = t1 ^ (bitOf(state.r1, 90) & bitOf(state.r1, 91)) ^ bitOf(state.r2, 77)
  const t2n = t2 ^ (bitOf(state.r2, 81) & bitOf(state.r2, 82)) ^ bitOf(state.r3, 86)
  const t3n = t3 ^ (bitOf(state.r3, 108) & bitOf(state.r3, 109)) ^ bitOf(state.r1, 68)

  state.r1 = ((state.r1 << 1n) & state.m1) | t3n
  state.r2 = ((state.r2 << 1n) & state.m2) | t1n
  state.r3 = ((state.r3 << 1n) & state.m3) | t2n

  return Number(z) as 0 | 1
}

export function triviumKeystream_bigint(key: Uint8Array, iv: Uint8Array, lengthBytes: number): Uint8Array {
  if (lengthBytes < 0) throw new Error("lengthBytes must be >= 0")

  const state = triviumInitBigInt(key, iv)

  for (let i = 0; i < warmupCycles(); i++) triviumStepBigInt(state)

  const out = new Uint8Array(lengthBytes)
  for (let i = 0; i < lengthBytes; i++) {
    let b = 0
    for (let j = 0; j < 8; j++) {
      const bit = triviumStepBigInt(state)
      b |= bit << j
    }
    out[i] = b
  }

  return out
}
