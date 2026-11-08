import { describe, expect, it } from "vitest"
import {
  checkReplayRateLimit,
  resetReplayRateLimitForTests,
} from "./replay-rate-limit"

describe("checkReplayRateLimit", () => {
  it("allows under max then blocks", () => {
    resetReplayRateLimitForTests()
    const key = "u-test"
    for (let i = 0; i < 20; i++) {
      expect(checkReplayRateLimit(key, 1_000).ok).toBe(true)
    }
    const blocked = checkReplayRateLimit(key, 1_000)
    expect(blocked.ok).toBe(false)
  })
})
