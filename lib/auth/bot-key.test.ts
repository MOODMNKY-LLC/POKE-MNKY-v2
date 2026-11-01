import { describe, expect, it } from "vitest"
import { evaluateBotKey } from "./bot-key"

describe("evaluateBotKey", () => {
  it("rejects every caller when the server key is unset", () => {
    expect(evaluateBotKey("any-non-empty-key", undefined).valid).toBe(false)
    expect(evaluateBotKey("any-non-empty-key", "   ").valid).toBe(false)
    expect(evaluateBotKey(null, undefined).error).toBe("Bot API key is not configured")
  })

  it("accepts only an exact match when the server key is set", () => {
    expect(evaluateBotKey("secret", "secret")).toEqual({ valid: true, botKey: "secret" })
    expect(evaluateBotKey(" secret ", "secret").valid).toBe(true)
    expect(evaluateBotKey("wrong", "secret").error).toBe("Invalid bot key")
    expect(evaluateBotKey(null, "secret").error).toMatch(/Missing bot key/)
  })
})
