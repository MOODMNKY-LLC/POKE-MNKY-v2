import { describe, expect, it } from "vitest"
import { timingSafeEqualString } from "@/lib/security/timing-safe-equal"

describe("timingSafeEqualString", () => {
  it("matches equal secrets and rejects mismatches/empty", () => {
    expect(timingSafeEqualString("abc", "abc")).toBe(true)
    expect(timingSafeEqualString("abc", "abd")).toBe(false)
    expect(timingSafeEqualString("abc", "ab")).toBe(false)
    expect(timingSafeEqualString("", "abc")).toBe(false)
    expect(timingSafeEqualString("abc", "")).toBe(false)
  })
})
