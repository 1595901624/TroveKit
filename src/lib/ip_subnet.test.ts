import { describe, it, expect } from "vitest"
import { SubnetError, calcFromCidr, calcFromIpv4Netmask } from "./ip_subnet"

describe("ip_subnet", () => {
  it("calculates IPv4 /24 correctly", () => {
    const r = calcFromCidr("192.168.1.10/24")
    expect(r.version).toBe(4)
    if (r.version !== 4) return

    expect(r.networkAddress).toBe("192.168.1.0")
    expect(r.broadcastAddress).toBe("192.168.1.255")
    expect(r.subnetMask).toBe("255.255.255.0")
    expect(r.wildcardMask).toBe("0.0.0.255")
    expect(r.firstHost).toBe("192.168.1.1")
    expect(r.lastHost).toBe("192.168.1.254")
    expect(r.totalAddresses).toBe("256")
    expect(r.usableAddresses).toBe("254")
  })

  it("supports IPv4 + netmask input", () => {
    const r = calcFromIpv4Netmask("10.0.0.1", "255.255.255.0")
    expect(r.version).toBe(4)
    expect(r.prefix).toBe(24)
    expect(r.networkAddress).toBe("10.0.0.0")
  })

  it("handles /31 RFC3021 vs traditional", () => {
    const rRfc = calcFromCidr("10.0.0.0/31", { ipv4HostRule: "rfc3021" })
    expect(rRfc.version).toBe(4)
    if (rRfc.version === 4) {
      expect(rRfc.usableAddresses).toBe("2")
      expect(rRfc.firstHost).toBe("10.0.0.0")
      expect(rRfc.lastHost).toBe("10.0.0.1")
    }

    const rTrad = calcFromCidr("10.0.0.0/31", { ipv4HostRule: "traditional" })
    expect(rTrad.version).toBe(4)
    if (rTrad.version === 4) {
      expect(rTrad.usableAddresses).toBe("0")
      expect(rTrad.firstHost).toBeNull()
      expect(rTrad.lastHost).toBeNull()
    }
  })

  it("calculates IPv6 /64 correctly (BigInt counts)", () => {
    const r = calcFromCidr("2001:db8::1/64")
    expect(r.version).toBe(6)
    if (r.version !== 6) return

    expect(r.networkPrefixCompressed).toBe("2001:db8::/64")
    expect(r.networkAddressCompressed).toBe("2001:db8::")
    expect(r.lastAddressCompressed).toBe("2001:db8::ffff:ffff:ffff:ffff")
    expect(r.totalAddresses).toBe("18446744073709551616")
    expect(r.usableAddresses).toBe("18446744073709551616")
  })

  it("throws SubnetError for invalid netmask", () => {
    expect(() => calcFromIpv4Netmask("1.2.3.4", "255.0.255.0")).toThrow(SubnetError)
  })

  it("throws SubnetError for missing prefix", () => {
    expect(() => calcFromCidr("192.168.1.1")).toThrow(SubnetError)
  })
})
