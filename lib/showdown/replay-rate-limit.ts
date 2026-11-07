/**
 * Simple in-process rate limit for privileged replay fetch/write routes.
 * Not distributed — enough to bound abuse on a single Node instance.
 */

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

export const REPLAY_RATE_LIMIT_WINDOW_MS = 60_000
export const REPLAY_RATE_LIMIT_MAX = 20

export function checkReplayRateLimit(
  key: string,
  now = Date.now(),
  max = REPLAY_RATE_LIMIT_MAX,
  windowMs = REPLAY_RATE_LIMIT_WINDOW_MS,
): { ok: true } | { ok: false; retryAfterSec: number } {
  const existing = buckets.get(key)
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true }
  }
  if (existing.count >= max) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    }
  }
  existing.count += 1
  return { ok: true }
}

/** Test helper */
export function resetReplayRateLimitForTests() {
  buckets.clear()
}
