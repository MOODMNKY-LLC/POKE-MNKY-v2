const MAX_DETAIL_LENGTH = 120

export function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  })
}

export function errorResponse(status: number, message: string): Response {
  return json(status, { status: "error", error: message })
}

export function parsePositiveInt(raw: string | undefined, fallback: number, min = 1, max = Number.MAX_SAFE_INTEGER): number {
  const value = Number.parseInt(raw ?? "", 10)
  if (!Number.isFinite(value) || value <= 0) return fallback
  return Math.min(Math.max(value, min), max)
}

/**
 * Makes text from an upstream error safe to return to the app: removes links, email addresses, anything that looks like
 * a token, and any configured secret values, then shortens it.
 */
export function redact(text: string, secrets: Array<string | undefined> = []): string {
  let out = text
  for (const secret of secrets) {
    if (secret && secret.length >= 6) out = out.split(secret).join("[redacted]")
  }
  out = out
    .replace(/https?:\/\/\S+/gi, "[link]")
    .replace(/[^\s@]+@[^\s@]+/g, "[email]")
    .replace(/[A-Za-z0-9_-]{24,}/g, "[redacted]")
    .replace(/\s+/g, " ")
    .trim()
  return out.length > MAX_DETAIL_LENGTH ? `${out.slice(0, MAX_DETAIL_LENGTH - 1)}…` : out
}

/** Logs only non-sensitive fields: route, request id and outcome. Never pass emails, tokens or invite links. */
export function logOutcome(route: string, requestId: string | null, outcome: string): void {
  console.log(JSON.stringify({ route, request_id: requestId, outcome }))
}

export function utcDay(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10)
}
