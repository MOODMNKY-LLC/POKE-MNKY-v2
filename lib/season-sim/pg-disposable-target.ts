/**
 * Fail-closed target resolution for season-sim Postgres integration harnesses.
 *
 * NEVER falls back to POSTGRES_URL / DATABASE_URL / SUPABASE_DB_URL — those are
 * commonly pointed at shared/prod. Harnesses must set SEASON_SIM_PG_URL explicitly
 * to a loopback disposable database whose name includes a disposable marker.
 *
 * URL validation is pure (no network). Call assertDisposableSeasonSimPgUrl before
 * any Client.connect / write.
 */

export class DisposablePgTargetError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = "DisposablePgTargetError"
    this.code = code
  }
}

/** Explicit env only — no generic production connection-string fallbacks. */
export const SEASON_SIM_PG_URL_ENV = "SEASON_SIM_PG_URL" as const

/** Database name must include one of these markers (case-insensitive). */
export const DISPOSABLE_DB_NAME_MARKERS = [
  "season_sim",
  "season-sim",
  "disposable",
  "_test",
  "test_",
] as const

const BLOCKED_ENV_FALLBACKS = [
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "DATABASE_URL",
  "SUPABASE_DB_URL",
  "SUPABASE_DATABASE_URL",
  "DIRECT_URL",
] as const

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"])

function hostnameIsLoopback(hostname: string): boolean {
  const h = hostname.trim().toLowerCase().replace(/^\[|\]$/g, "")
  if (LOOPBACK_HOSTS.has(h)) return true
  // IPv4-mapped IPv6 loopback
  if (h === "::ffff:127.0.0.1") return true
  return false
}

function dbNameLooksDisposable(pathname: string): boolean {
  const raw = pathname.replace(/^\//, "").split("?")[0] ?? ""
  const name = decodeURIComponent(raw).toLowerCase()
  if (!name) return false
  return DISPOSABLE_DB_NAME_MARKERS.some((m) => name.includes(m))
}

function looksHostedSupabaseOrProd(hostname: string): boolean {
  const h = hostname.toLowerCase()
  if (h.endsWith(".supabase.co")) return true
  if (h.endsWith(".pooler.supabase.com")) return true
  if (h.includes("supabase.com")) return true
  if (h.includes("neon.tech")) return true
  if (h.includes("amazonaws.com")) return true
  if (h.includes("azure.com")) return true
  if (h.includes("gcp.") || h.includes("googleusercontent.com")) return true
  return false
}

/**
 * Pure validation — does not open a socket. Throws DisposablePgTargetError on reject.
 */
export function assertDisposableSeasonSimPgUrl(raw: string): URL {
  const trimmed = raw.trim()
  if (!trimmed) {
    throw new DisposablePgTargetError(
      "MISSING_URL",
      `${SEASON_SIM_PG_URL_ENV} is required for season-sim PG harnesses (no POSTGRES_URL fallback)`,
    )
  }

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    throw new DisposablePgTargetError(
      "INVALID_URL",
      `${SEASON_SIM_PG_URL_ENV} is not a valid URL`,
    )
  }

  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new DisposablePgTargetError(
      "BAD_PROTOCOL",
      `${SEASON_SIM_PG_URL_ENV} must use postgres(ql): scheme`,
    )
  }

  if (!url.hostname) {
    throw new DisposablePgTargetError(
      "MISSING_HOST",
      `${SEASON_SIM_PG_URL_ENV} missing hostname`,
    )
  }

  if (looksHostedSupabaseOrProd(url.hostname)) {
    throw new DisposablePgTargetError(
      "HOSTED_REJECTED",
      `${SEASON_SIM_PG_URL_ENV} hostname looks hosted/prod (${url.hostname}) — refused without connecting`,
    )
  }

  if (!hostnameIsLoopback(url.hostname)) {
    throw new DisposablePgTargetError(
      "NON_LOOPBACK",
      `${SEASON_SIM_PG_URL_ENV} host must be loopback (127.0.0.1/localhost/[::1]); got ${url.hostname}`,
    )
  }

  if (!dbNameLooksDisposable(url.pathname)) {
    throw new DisposablePgTargetError(
      "DB_NAME_NOT_DISPOSABLE",
      `${SEASON_SIM_PG_URL_ENV} database name must include a disposable marker ` +
        `(${DISPOSABLE_DB_NAME_MARKERS.join("|")}); got path ${url.pathname}`,
    )
  }

  return url
}

/**
 * Resolve SEASON_SIM_PG_URL for harnesses. Returns null when unset (honest skip).
 * Throws if set but unsafe, or if a blocked generic env is the only candidate
 * someone might have intended (we never use those values).
 */
export function resolveSeasonSimPgUrl(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const explicit = env[SEASON_SIM_PG_URL_ENV]?.trim() ?? ""
  if (explicit) {
    assertDisposableSeasonSimPgUrl(explicit)
    return explicit
  }

  // Fail closed: if operator set a generic prod-ish URL but forgot the disposable
  // var, refuse rather than silently skipping when they thought tests would run
  // against that URL (or worse, if a future edit reintroduces fallback).
  for (const key of BLOCKED_ENV_FALLBACKS) {
    if (env[key]?.trim()) {
      // Do not connect; just refuse to treat these as season-sim targets.
      // Honest skip only when NO pg URL envs are set at all.
      throw new DisposablePgTargetError(
        "BLOCKED_FALLBACK_ENV",
        `${key} is set but season-sim harnesses refuse generic fallbacks. ` +
          `Set ${SEASON_SIM_PG_URL_ENV} to an explicit loopback disposable DB ` +
          `(name must include season_sim|disposable|test marker), or unset ${key} to skip.`,
      )
    }
  }

  return null
}

/** Fixture marker written into sentinel rows — never touch live-named tables. */
export const SEASON_SIM_FIXTURE_MARKER = "season_sim_disposable_fixture_v1" as const
