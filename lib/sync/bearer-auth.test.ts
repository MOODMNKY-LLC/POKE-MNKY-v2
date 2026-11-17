import { describe, expect, it } from "vitest"
import { parseBearerToken, timingSafeSecretEqual, verifyBearerSecret } from "./bearer-auth"

describe("parseBearerToken", () => {
  it("parses a strict Bearer header", () => {
    expect(parseBearerToken("Bearer abc.def-123")).toBe("abc.def-123")
  })

  it.each([
    null,
    undefined,
    "",
    "Bearer",
    "Bearer ",
    "bearer abc",
    "Bearer  abc",
    "Bearer abc def",
    " Bearer abc",
    "Bearer abc ",
    "Basic abc",
    "abc",
  ])("returns null for %j", (header) => {
    expect(parseBearerToken(header as string | null | undefined)).toBeNull()
  })

  it("does not treat an embedded 'Bearer ' as a prefix to strip", () => {
    expect(parseBearerToken("xBearer abc")).toBeNull()
    expect(parseBearerToken("Bearer Bearer abc")).toBeNull()
  })
})

describe("timingSafeSecretEqual", () => {
  it("compares equal and unequal values, including different lengths, without throwing", () => {
    expect(timingSafeSecretEqual("secret", "secret")).toBe(true)
    expect(timingSafeSecretEqual("secret", "secreT")).toBe(false)
    expect(timingSafeSecretEqual("a", "a-much-longer-value")).toBe(false)
    expect(timingSafeSecretEqual("", "x")).toBe(false)
  })
})

describe("verifyBearerSecret", () => {
  it("accepts the matching secret", () => {
    expect(verifyBearerSecret("Bearer s3cret", "s3cret")).toBe(true)
  })

  it("rejects wrong, missing and malformed tokens", () => {
    expect(verifyBearerSecret("Bearer wrong", "s3cret")).toBe(false)
    expect(verifyBearerSecret(null, "s3cret")).toBe(false)
    expect(verifyBearerSecret("s3cret", "s3cret")).toBe(false)
    expect(verifyBearerSecret("Bearer s3cret extra", "s3cret")).toBe(false)
  })

  it("rejects when the configured secret is unset, empty or blank (even for an empty token)", () => {
    expect(verifyBearerSecret("Bearer anything", undefined)).toBe(false)
    expect(verifyBearerSecret("Bearer anything", null)).toBe(false)
    expect(verifyBearerSecret("Bearer anything", "")).toBe(false)
    expect(verifyBearerSecret("Bearer anything", "   ")).toBe(false)
    expect(verifyBearerSecret("Bearer ", "")).toBe(false)
  })
})
