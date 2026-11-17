import { describe, expect, it } from "vitest"
import { getRequestIp } from "./request-ip"

const h = (init: Record<string, string>) => new Headers(init)

describe("getRequestIp", () => {
  it("prefers x-vercel-forwarded-for (first hop) over everything else", () => {
    expect(
      getRequestIp(
        h({
          "x-vercel-forwarded-for": "192.0.2.9, 10.0.0.2",
          "x-real-ip": "198.51.100.4",
          "x-forwarded-for": "203.0.113.7, 10.0.0.1",
        }),
      ),
    ).toBe("192.0.2.9")
  })

  it("prefers x-real-ip over x-forwarded-for", () => {
    expect(getRequestIp(h({ "x-real-ip": "198.51.100.4", "x-forwarded-for": "203.0.113.7" }))).toBe("198.51.100.4")
  })

  it("uses the first x-forwarded-for hop as the last fallback", () => {
    expect(getRequestIp(h({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7")
  })

  it("supports IPv6", () => {
    expect(getRequestIp(h({ "x-forwarded-for": "2001:db8::1" }))).toBe("2001:db8::1")
    expect(getRequestIp(h({ "x-vercel-forwarded-for": "2001:db8::2" }))).toBe("2001:db8::2")
  })

  it("returns null when absent or not a valid IP (column is inet)", () => {
    expect(getRequestIp(h({}))).toBeNull()
    expect(getRequestIp(h({ "x-forwarded-for": "not-an-ip" }))).toBeNull()
    expect(getRequestIp(h({ "x-vercel-forwarded-for": "unknown", "x-real-ip": "198.51.100.4" }))).toBeNull()
  })
})
