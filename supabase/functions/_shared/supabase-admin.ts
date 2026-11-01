/**
 * Shared admin client + caller auth for server-only Edge Functions.
 *
 * The project uses the new Supabase API keys (sb_secret_* / sb_publishable_*);
 * the legacy JWT anon/service_role keys are disabled. Consequences:
 *  - The admin client must use a secret key. Supabase injects all secret keys
 *    as JSON into SUPABASE_SECRET_KEYS ({ "<name>": "sb_secret_..." }).
 *  - The gateway's verify_jwt check only understands JWTs, so these functions
 *    are deployed with verify_jwt = false and authorize the caller here:
 *    the request must present a project secret key in the `apikey` header
 *    (preferred) or as `Authorization: Bearer <secret key>`.
 *
 * Never log key material.
 */

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2"

const SECRET_PREFIX = "sb_secret_"

function readSecretKeyMap(): Record<string, string> {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS")
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    const out: Record<string, string> = {}
    if (parsed && typeof parsed === "object") {
      for (const [name, value] of Object.entries(parsed)) {
        if (typeof value === "string" && value.startsWith(SECRET_PREFIX)) out[name] = value
      }
    }
    return out
  } catch {
    console.error("[supabase-admin] SUPABASE_SECRET_KEYS is not valid JSON")
    return {}
  }
}

/** All secret keys this function will accept from callers. */
export function getSecretKeys(): string[] {
  const keys = Object.values(readSecretKeyMap())
  // Optional explicit overrides (function secrets). Only opaque sb_secret_ keys are
  // accepted; a legacy JWT service_role key is ignored because it is disabled.
  for (const name of ["SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"]) {
    const v = Deno.env.get(name)?.trim()
    if (v && v.startsWith(SECRET_PREFIX)) keys.push(v)
  }
  return [...new Set(keys)]
}

/** The key used for the function's own admin client ("default" first). */
export function getAdminKey(): string | null {
  const map = readSecretKeyMap()
  if (map["default"]) return map["default"]
  const first = Object.values(map)[0]
  if (first) return first
  return getSecretKeys()[0] ?? null
}

/** Admin (RLS-bypassing) client authenticated with the project's secret key. */
export function createAdminClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL")
  const key = getAdminKey()
  if (!url || !key) {
    throw new Error(
      "Missing Supabase configuration (SUPABASE_URL or a sb_secret_ key in SUPABASE_SECRET_KEYS)"
    )
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder()
  const x = enc.encode(a)
  const y = enc.encode(b)
  let diff = x.length ^ y.length
  const len = Math.max(x.length, y.length)
  for (let i = 0; i < len; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0)
  return diff === 0
}

/** True when the request presents one of the project's secret keys. */
export function isAuthorizedRequest(req: Request): boolean {
  const presented: string[] = []
  const apikey = req.headers.get("apikey")?.trim()
  if (apikey) presented.push(apikey)
  const auth = req.headers.get("authorization")?.trim()
  if (auth && /^bearer\s+/i.test(auth)) presented.push(auth.replace(/^bearer\s+/i, "").trim())
  if (presented.length === 0) return false
  const keys = getSecretKeys()
  if (keys.length === 0) {
    console.error("[supabase-admin] No secret keys available to authorize callers")
    return false
  }
  return presented.some((p) => keys.some((k) => safeEqual(p, k)))
}

export function unauthorizedResponse(extraHeaders: Record<string, string> = {}): Response {
  return new Response(
    JSON.stringify({ success: false, error: "Unauthorized: a project secret key is required" }),
    { status: 401, headers: { ...extraHeaders, "Content-Type": "application/json" } }
  )
}

/**
 * Cheap liveness probe: proves the admin client can reach the database with
 * the secret key. Invoke with body { "healthcheck": true }.
 */
export async function healthcheckResponse(
  fn: string,
  supabase: SupabaseClient,
  table: string,
  extraHeaders: Record<string, string> = {}
): Promise<Response> {
  const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true })
  const ok = !error
  console.log(`[${fn}] healthcheck`, { ok, table, count, error: error?.message ?? null })
  return new Response(
    JSON.stringify({ success: ok, function: fn, healthcheck: true, table, count, error: error?.message ?? null }),
    { status: ok ? 200 : 500, headers: { ...extraHeaders, "Content-Type": "application/json" } }
  )
}
