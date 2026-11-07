/**
 * Allowlisted HTTPS fetch for official public replay JSON.
 * Validates every redirect hop; size/timeout limited.
 */

import { OFFICIAL_REPLAY_HOST, validateOfficialReplayUrl } from "./replay-url"

export const REPLAY_FETCH_TIMEOUT_MS = 8000
export const REPLAY_FETCH_MAX_BYTES = 2_500_000
export const REPLAY_FETCH_MAX_REDIRECTS = 2

export type ReplayJsonPayload = {
  id?: string
  format?: string
  players?: string[]
  log?: string
  inputlog?: string | null
  uploadtime?: number
  views?: number
  formatid?: string
  rating?: number | null
  private?: number | boolean | null
  password?: string | null
}

export type ReplayFetchResult =
  | {
      ok: true
      sourceId: string
      sourceUrl: string
      json: ReplayJsonPayload
      rawJsonText: string
      rawLog: string
    }
  | { ok: false; error: string; code: string; status?: number }

function isPublicVisibility(json: ReplayJsonPayload): {
  ok: boolean
  code?: string
  error?: string
} {
  // Do not infer public merely because the resource was fetchable.
  if (!("private" in json) || json.private === undefined || json.private === null) {
    return {
      ok: false,
      code: "VISIBILITY_UNKNOWN",
      error:
        "Replay JSON missing verified public visibility (private field). Rejecting.",
    }
  }
  if (json.private !== 0 && json.private !== false) {
    return {
      ok: false,
      code: "VISIBILITY_NOT_PUBLIC",
      error: `Replay is not public (private=${String(json.private)}). Phase 1 allows public only.`,
    }
  }
  if (json.password != null && String(json.password).length > 0) {
    return {
      ok: false,
      code: "VISIBILITY_PASSWORD",
      error: "Replay has a password field; Phase 1 allows public only.",
    }
  }
  return { ok: true }
}

async function fetchAllowlisted(
  url: string,
  redirectCount = 0,
): Promise<{ ok: true; text: string } | { ok: false; error: string; code: string; status?: number }> {
  if (redirectCount > REPLAY_FETCH_MAX_REDIRECTS) {
    return { ok: false, error: "Too many redirects", code: "FETCH_REDIRECT_LIMIT" }
  }

  const validated = validateOfficialReplayUrl(url)
  if (!validated.ok) {
    return { ok: false, error: validated.error, code: validated.code }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REPLAY_FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(validated.canonicalJsonUrl, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: { Accept: "application/json,text/plain,*/*" },
    })

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location")
      if (!loc) {
        return { ok: false, error: "Redirect without Location", code: "FETCH_REDIRECT_BAD", status: res.status }
      }
      const next = new URL(loc, validated.canonicalJsonUrl)
      if (next.hostname.toLowerCase() !== OFFICIAL_REPLAY_HOST || next.protocol !== "https:") {
        return { ok: false, error: "Redirect left allowlisted host", code: "FETCH_REDIRECT_DENIED" }
      }
      return fetchAllowlisted(next.toString(), redirectCount + 1)
    }

    if (!res.ok) {
      return {
        ok: false,
        error: `Upstream HTTP ${res.status}`,
        code: "FETCH_HTTP_ERROR",
        status: res.status,
      }
    }

    const buf = await res.arrayBuffer()
    if (buf.byteLength > REPLAY_FETCH_MAX_BYTES) {
      return { ok: false, error: "Response too large", code: "FETCH_TOO_LARGE" }
    }
    const text = new TextDecoder("utf-8").decode(buf)
    return { ok: true, text }
  } catch (e: unknown) {
    if (e instanceof Error && e.name === "AbortError") {
      return { ok: false, error: "Request timeout", code: "FETCH_TIMEOUT" }
    }
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Fetch failed",
      code: "FETCH_FAILED",
    }
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchOfficialPublicReplayJson(
  rawUrl: string,
): Promise<ReplayFetchResult> {
  const validated = validateOfficialReplayUrl(rawUrl)
  if (!validated.ok) {
    return { ok: false, error: validated.error, code: validated.code }
  }

  const fetched = await fetchAllowlisted(validated.canonicalJsonUrl)
  if (!fetched.ok) return fetched

  let json: ReplayJsonPayload
  try {
    json = JSON.parse(fetched.text) as ReplayJsonPayload
  } catch {
    return { ok: false, error: "Upstream body is not JSON", code: "FETCH_NOT_JSON" }
  }

  const vis = isPublicVisibility(json)
  if (!vis.ok) {
    return { ok: false, error: vis.error!, code: vis.code! }
  }

  const sourceId = (json.id || validated.sourceId).toString()
  if (sourceId !== validated.sourceId) {
    // Keep URL id authoritative for allowlist; mismatch is suspicious.
    return {
      ok: false,
      error: "Replay id mismatch between URL and JSON",
      code: "ID_MISMATCH",
    }
  }

  const rawLog = typeof json.log === "string" ? json.log : ""
  if (!rawLog.trim()) {
    return { ok: false, error: "Replay JSON missing log", code: "LOG_MISSING" }
  }

  return {
    ok: true,
    sourceId,
    sourceUrl: validated.canonicalPageUrl,
    json,
    rawJsonText: fetched.text,
    rawLog,
  }
}
