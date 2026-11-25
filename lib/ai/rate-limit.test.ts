import { afterEach, describe, expect, it } from "vitest"
import {
  americaNewYorkDayStartUtc,
  createMemoryAiChatUsageStore,
  enforceAiChatRateLimit,
  setAiChatUsageStore,
} from "./rate-limit"

const LIMIT_KEYS = ["AI_CHAT_LIMIT_PER_HOUR", "AI_CHAT_LIMIT_PER_DAY", "AI_CHAT_LIMIT_GLOBAL_PER_DAY"] as const

describe("ai chat rate limit", () => {
  const previous = new Map<string, string | undefined>()

  afterEach(() => {
    setAiChatUsageStore(null)
    for (const key of LIMIT_KEYS) {
      const value = previous.get(key)
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
    previous.clear()
  })

  function setLimits(hour: string, day: string, global: string) {
    const next = {
      AI_CHAT_LIMIT_PER_HOUR: hour,
      AI_CHAT_LIMIT_PER_DAY: day,
      AI_CHAT_LIMIT_GLOBAL_PER_DAY: global,
    }
    for (const key of LIMIT_KEYS) {
      if (!previous.has(key)) previous.set(key, process.env[key])
      process.env[key] = next[key]
    }
  }

  it("uses America/New_York midnights in winter and summer", () => {
    expect(americaNewYorkDayStartUtc(new Date("2026-11-25T15:00:00Z")).toISOString()).toBe(
      "2026-11-25T05:00:00.000Z",
    )
    expect(americaNewYorkDayStartUtc(new Date("2026-07-15T16:00:00Z")).toISOString()).toBe(
      "2026-07-15T04:00:00.000Z",
    )
  })

  it("returns 429 hour on the 21st request in a rolling hour", async () => {
    setLimits("20", "100", "300")
    setAiChatUsageStore(createMemoryAiChatUsageStore())
    const now = new Date("2026-11-25T18:00:00Z")
    for (let attempt = 0; attempt < 20; attempt += 1) {
      expect(await enforceAiChatRateLimit({ userId: "coach-1", mode: "general", now })).toBeNull()
    }
    const blocked = await enforceAiChatRateLimit({ userId: "coach-1", mode: "general", now })
    expect(blocked?.status).toBe(429)
    await expect(blocked?.json()).resolves.toMatchObject({ code: "rate_limited", scope: "hour" })

    const later = new Date(now.getTime() + 61 * 60 * 1000)
    expect(await enforceAiChatRateLimit({ userId: "coach-1", mode: "general", now: later })).toBeNull()
  })

  it("returns 429 day on the 101st request in a New York day", async () => {
    setLimits("1000", "100", "1000")
    setAiChatUsageStore(createMemoryAiChatUsageStore())
    const now = new Date("2026-11-25T18:00:00Z")
    for (let attempt = 0; attempt < 100; attempt += 1) {
      expect(await enforceAiChatRateLimit({ userId: "coach-1", mode: "draft", now })).toBeNull()
    }
    const blocked = await enforceAiChatRateLimit({ userId: "coach-1", mode: "draft", now })
    expect(blocked?.status).toBe(429)
    await expect(blocked?.json()).resolves.toMatchObject({ code: "rate_limited", scope: "day" })

    const nextDay = new Date("2026-11-26T05:30:00Z")
    expect(await enforceAiChatRateLimit({ userId: "coach-1", mode: "draft", now: nextDay })).toBeNull()
  })

  it("returns 429 global on the 301st app-wide request", async () => {
    setLimits("1000", "1000", "300")
    setAiChatUsageStore(createMemoryAiChatUsageStore())
    const now = new Date("2026-11-25T18:00:00Z")
    for (let attempt = 0; attempt < 300; attempt += 1) {
      expect(await enforceAiChatRateLimit({ userId: "coach-a", mode: "general", now })).toBeNull()
    }
    const blocked = await enforceAiChatRateLimit({ userId: "coach-b", mode: "general", now })
    expect(blocked?.status).toBe(429)
    await expect(blocked?.json()).resolves.toMatchObject({ code: "rate_limited", scope: "global" })
  })

  it("fails closed with 503 when the limiter store errors", async () => {
    setAiChatUsageStore({
      async consume() {
        throw new Error("postgres://secret-host/db")
      },
    })
    const response = await enforceAiChatRateLimit({ userId: "coach-1", mode: "general" })
    expect(response?.status).toBe(503)
    const body = await response?.json()
    expect(body).toMatchObject({ code: "chat_unavailable", error: "unavailable" })
    expect(JSON.stringify(body)).not.toContain("secret-host")
  })
})
