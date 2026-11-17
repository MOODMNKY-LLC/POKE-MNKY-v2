import { describe, expect, it } from "vitest"
import { getRequestIp } from "./request-ip"

const h = (init: Record<string, string>) => new Headers(init)

describe("getRequestIp", () => {
  it("uses the first x-forwarded-for hop", () => {
    expect(getRequestIp(h({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7")
  })

  it("falls back to x-real-ip", () => {
    expect(getRequestIp(h({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4")
  })

  it("supports IPv6", () => {
    expect(getRequestIp(h({ "x-forwarded-for": "2001:db8::1" }))).toBe("2001:db8::1")
  })

  it("returns null when absent or not a valid IP (column is inet)", () => {
    expect(getRequestIp(h({}))).toBeNull()
    expect(getRequestIp(h({ "x-forwarded-for": "not-an-ip" }))).toBeNull()
    expect(getRequestIp(h({ "x-forwarded-for": "unknown", "x-real-ip": "198.51.100.4" }))).toBeNull()
  })
})
