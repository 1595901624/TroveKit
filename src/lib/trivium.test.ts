import { describe, expect, it } from "vitest"

import { triviumKeystream, triviumKeystream_bigint, triviumXor } from "./trivium"

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

// Deterministic PRNG (xorshift32) so tests are stable.
function makePrng(seed: number) {
  let x = seed | 0
  return () => {
    x ^= x << 13
    x ^= x >>> 17
    x ^= x << 5
    // Convert to uint32
    return x >>> 0
  }
}

function randomBytes(prng: () => number, len: number): Uint8Array {
  const out = new Uint8Array(len)
  for (let i = 0; i < len; i++) out[i] = prng() & 0xff
  return out
}

describe("Trivium", () => {
  it("bit-array and BigInt implementations produce identical keystream", () => {
    const prng = makePrng(0x12345678)

    const lengths = [0, 1, 2, 3, 7, 8, 15, 32, 64, 128]

    for (let caseNo = 0; caseNo < 64; caseNo++) {
      // Use varying lengths to exercise internal normalization logic.
      const keyLen = prng() % 21 // 0..20
      const ivLen = prng() % 21
      const key = randomBytes(prng, keyLen)
      const iv = randomBytes(prng, ivLen)

      for (const n of lengths) {
        const a = triviumKeystream(key, iv, n)
        const b = triviumKeystream_bigint(key, iv, n)
        expect(bytesEqual(a, b)).toBe(true)
      }
    }
  })

  it("XOR is symmetric (decrypt(encrypt(m)) == m)", () => {
    const prng = makePrng(0x9e3779b9)

    for (let caseNo = 0; caseNo < 64; caseNo++) {
      const key = randomBytes(prng, 10)
      const iv = randomBytes(prng, 10)
      const msgLen = prng() % 512
      const msg = randomBytes(prng, msgLen)

      const ct = triviumXor(key, iv, msg)
      const pt = triviumXor(key, iv, ct)

      expect(bytesEqual(pt, msg)).toBe(true)
    }
  })

  it("keystream length is exact", () => {
    const key = new Uint8Array(10)
    const iv = new Uint8Array(10)

    expect(triviumKeystream(key, iv, 0)).toHaveLength(0)
    expect(triviumKeystream(key, iv, 1)).toHaveLength(1)
    expect(triviumKeystream(key, iv, 100)).toHaveLength(100)
  })

  it("rejects negative length", () => {
    const key = new Uint8Array(10)
    const iv = new Uint8Array(10)

    expect(() => triviumKeystream(key, iv, -1)).toThrow(/lengthBytes/i)
    expect(() => triviumKeystream_bigint(key, iv, -1)).toThrow(/lengthBytes/i)
  })
})
