/**
 * Allowlisted official Showdown replay URL validation (Phase 1 public only).
 * Reject password / private URL forms before any network I/O.
 */

export const OFFICIAL_REPLAY_HOST = "replay.pokemonshowdown.com"

export type ReplayUrlValidation =
  | {
      ok: true
      sourceId: string
      canonicalJsonUrl: string
      canonicalLogUrl: string
      canonicalPageUrl: string
    }
  | { ok: false; error: string; code: string }

/** Private password URLs end with …-<password>pw (documented PS convention). */
const PASSWORD_ID_RE = /-[0-9a-z]{8,}pw$/i

export function validateOfficialReplayUrl(raw: string): ReplayUrlValidation {
  const trimmed = raw.trim()
  if (!trimmed) {
    return { ok: false, error: "Replay URL is required", code: "URL_REQUIRED" }
  }

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return { ok: false, error: "Invalid URL", code: "URL_INVALID" }
  }

  if (url.protocol !== "https:") {
    return { ok: false, error: "Only https URLs are allowed", code: "URL_HTTPS_REQUIRED" }
  }

  if (url.hostname.toLowerCase() !== OFFICIAL_REPLAY_HOST) {
    return {
      ok: false,
      error: `Only ${OFFICIAL_REPLAY_HOST} is allowed for Phase 1`,
      code: "URL_HOST_DENIED",
    }
  }

  // Path: /{id} or /{id}.json or /{id}.log
  const path = url.pathname.replace(/\/+$/, "")
  const match = path.match(/^\/([A-Za-z0-9-]+)(?:\.(?:json|log|inputlog))?$/)
  if (!match) {
    return {
      ok: false,
      error: "URL path must be /{replay-id}[.json|.log]",
      code: "URL_PATH_DENIED",
    }
  }

  const sourceId = match[1]
  if (PASSWORD_ID_RE.test(sourceId)) {
    return {
      ok: false,
      error:
        "Password-protected / private replay IDs are not supported in Phase 1",
      code: "URL_PRIVATE_PASSWORD",
    }
  }

  if (url.username || url.password) {
    return {
      ok: false,
      error: "Credentials in URL are not allowed",
      code: "URL_USERINFO_DENIED",
    }
  }

  const base = `https://${OFFICIAL_REPLAY_HOST}/${sourceId}`
  return {
    ok: true,
    sourceId,
    canonicalJsonUrl: `${base}.json`,
    canonicalLogUrl: `${base}.log`,
    canonicalPageUrl: base,
  }
}
