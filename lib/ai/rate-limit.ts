import { AI_CHAT_UNAVAILABLE_MESSAGE } from "@/lib/ai/league-chat-dock"
import { createServiceRoleClient } from "@/lib/supabase/service"

export type AiChatLimitScope = "hour" | "day" | "global"

export type AiChatConsumeResult =
  | { allowed: true }
  | { allowed: false; scope: AiChatLimitScope; retryAfter: number }

export type AiChatUsageStore = {
  consume(input: {
    userId: string
    now: Date
    limits: { hour: number; day: number; global: number }
  }): Promise<AiChatConsumeResult>
}

const GLOBAL_USER_ID = "00000000-0000-0000-0000-000000000000"
const HOUR_MS = 60 * 60 * 1000

type UsageRow = {
  userId: string
  bucket: "hour" | "day" | "global"
  windowStartMs: number
  count: number
}

function positiveInt(name: string, fallback: number): number {
  const raw = Number(process.env[name])
  if (!Number.isFinite(raw) || raw <= 0) return fallback
  return Math.floor(raw)
}

export function aiChatLimits(): { hour: number; day: number; global: number } {
  return {
    hour: positiveInt("AI_CHAT_LIMIT_PER_HOUR", 20),
    day: positiveInt("AI_CHAT_LIMIT_PER_DAY", 100),
    global: positiveInt("AI_CHAT_LIMIT_GLOBAL_PER_DAY", 300),
  }
}

export function aiChatRateLimitMessage(scope: AiChatLimitScope): string {
  switch (scope) {
    case "hour":
      return "You've reached the chat limit for this hour. Please wait and try again."
    case "day":
      return "You've reached today's chat limit. It resets at midnight Eastern Time."
    case "global":
      return "League chat has reached today's shared limit. Please try again tomorrow."
    default: {
      const neverScope: never = scope
      return neverScope
    }
  }
}

/** UTC instant of America/New_York midnight for the calendar day containing `now`. */
export function americaNewYorkDayStartUtc(now: Date): Date {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  })
  const parts = formatter.formatToParts(now)
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "0"
  const year = Number(read("year"))
  const month = Number(read("month"))
  const day = Number(read("day"))
  const hour = Number(read("hour")) === 24 ? 0 : Number(read("hour"))
  const asUtc = Date.UTC(year, month - 1, day, hour, Number(read("minute")), Number(read("second")))
  const offsetMs = asUtc - now.getTime()
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - offsetMs)
}

export function nextAmericaNewYorkMidnightUtc(now: Date): Date {
  const start = americaNewYorkDayStartUtc(now)
  return americaNewYorkDayStartUtc(new Date(start.getTime() + 26 * HOUR_MS))
}

function retryAfterSeconds(untilMs: number, nowMs: number): number {
  return Math.max(1, Math.ceil((untilMs - nowMs) / 1000))
}

export function createMemoryAiChatUsageStore(): AiChatUsageStore {
  const rows: UsageRow[] = []

  function sum(userId: string, bucket: UsageRow["bucket"], fromExclusiveMs: number, toMs: number): number {
    return rows
      .filter(
        (row) =>
          row.userId === userId &&
          row.bucket === bucket &&
          row.windowStartMs > fromExclusiveMs &&
          row.windowStartMs <= toMs,
      )
      .reduce((total, row) => total + row.count, 0)
  }

  function exact(userId: string, bucket: UsageRow["bucket"], windowStartMs: number): number {
    return rows.find((row) => row.userId === userId && row.bucket === bucket && row.windowStartMs === windowStartMs)?.count ?? 0
  }

  function bump(userId: string, bucket: UsageRow["bucket"], windowStartMs: number) {
    const row = rows.find((item) => item.userId === userId && item.bucket === bucket && item.windowStartMs === windowStartMs)
    if (row) {
      row.count += 1
      return
    }
    rows.push({ userId, bucket, windowStartMs, count: 1 })
  }

  return {
    async consume(input) {
      const nowMs = input.now.getTime()
      const minuteStart = Math.floor(nowMs / 60_000) * 60_000
      const dayStart = americaNewYorkDayStartUtc(input.now).getTime()
      const hourCount = sum(input.userId, "hour", nowMs - HOUR_MS, nowMs)
      if (hourCount >= input.limits.hour) {
        const oldest = rows
          .filter(
            (row) =>
              row.userId === input.userId &&
              row.bucket === "hour" &&
              row.windowStartMs > nowMs - HOUR_MS &&
              row.windowStartMs <= nowMs,
          )
          .reduce((min, row) => Math.min(min, row.windowStartMs), nowMs)
        return {
          allowed: false,
          scope: "hour",
          retryAfter: retryAfterSeconds(oldest + HOUR_MS, nowMs),
        }
      }

      const dayCount = exact(input.userId, "day", dayStart)
      if (dayCount >= input.limits.day) {
        return {
          allowed: false,
          scope: "day",
          retryAfter: retryAfterSeconds(nextAmericaNewYorkMidnightUtc(input.now).getTime(), nowMs),
        }
      }

      const globalCount = exact(GLOBAL_USER_ID, "global", dayStart)
      if (globalCount >= input.limits.global) {
        return {
          allowed: false,
          scope: "global",
          retryAfter: retryAfterSeconds(nextAmericaNewYorkMidnightUtc(input.now).getTime(), nowMs),
        }
      }

      bump(input.userId, "hour", minuteStart)
      bump(input.userId, "day", dayStart)
      bump(GLOBAL_USER_ID, "global", dayStart)
      return { allowed: true }
    },
  }
}

function parseConsumeResult(data: unknown): AiChatConsumeResult {
  if (!data || typeof data !== "object") throw new Error("ai_chat_usage_store_error")
  const row = data as { allowed?: unknown; scope?: unknown; retry_after?: unknown }
  if (row.allowed === true) return { allowed: true }
  if (row.scope === "hour" || row.scope === "day" || row.scope === "global") {
    const retryAfter = typeof row.retry_after === "number" && Number.isFinite(row.retry_after)
      ? Math.max(1, Math.ceil(row.retry_after))
      : 1
    return { allowed: false, scope: row.scope, retryAfter }
  }
  throw new Error("ai_chat_usage_store_error")
}

const supabaseUsageStore: AiChatUsageStore = {
  async consume(input) {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase.rpc("consume_ai_chat_quota", {
      p_user_id: input.userId,
      p_hour_limit: input.limits.hour,
      p_day_limit: input.limits.day,
      p_global_limit: input.limits.global,
      p_now: input.now.toISOString(),
    })
    if (error) throw new Error("ai_chat_usage_store_error")
    return parseConsumeResult(data)
  },
}

let usageStore: AiChatUsageStore = supabaseUsageStore

/** Tests inject a memory store. Production uses the Supabase RPC. */
export function setAiChatUsageStore(store: AiChatUsageStore | null): void {
  usageStore = store ?? supabaseUsageStore
}

export function rateLimitedResponse(scope: AiChatLimitScope, retryAfter: number): Response {
  return Response.json(
    {
      code: "rate_limited",
      scope,
      retryAfter,
      message: aiChatRateLimitMessage(scope),
    },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfter) },
    },
  )
}

export function chatUnavailableResponse(): Response {
  return Response.json(
    {
      error: "unavailable",
      code: "chat_unavailable",
      message: AI_CHAT_UNAVAILABLE_MESSAGE,
    },
    { status: 503 },
  )
}

/**
 * Count a request that already passed validation and is about to be sent.
 * Store failures fail closed.
 */
export async function enforceAiChatRateLimit(input: {
  userId: string
  mode: string
  now?: Date
}): Promise<Response | null> {
  const now = input.now ?? new Date()
  try {
    const result = await usageStore.consume({
      userId: input.userId,
      now,
      limits: aiChatLimits(),
    })
    if (result.allowed) return null
    console.info(JSON.stringify({
      event: "ai_chat_rate_limited",
      userId: input.userId,
      mode: input.mode,
      status: 429,
      scope: result.scope,
    }))
    return rateLimitedResponse(result.scope, result.retryAfter)
  } catch {
    console.error(JSON.stringify({
      event: "ai_chat_rate_limit_store_error",
      userId: input.userId,
      mode: input.mode,
      status: 503,
      code: "chat_unavailable",
    }))
    return chatUnavailableResponse()
  }
}
