/**
 * Invoke Supabase Edge Functions from Next.js server code with correct auth headers.
 *
 * The project uses the new API keys (sb_secret_* / sb_publishable_*). These are not JWTs,
 * so they must be sent in the `apikey` header only — sending them as `Authorization: Bearer`
 * makes the gateway reject the request with "Invalid JWT" when verify_jwt is on.
 *
 * Our admin edge functions (pokepedia-*, sync-pokepedia, ingest-showdown-pokedex,
 * sync-pokemon-pokeapi) run with verify_jwt = false and authorize in code: the `apikey`
 * header (or Bearer token) must equal one of the project's secret keys. Publishable/anon
 * keys are rejected with 401, so they are intentionally NOT used as a fallback here.
 */

function isSecretKey(key: string | undefined): key is string {
  return !!key && key.startsWith("sb_secret_")
}

export function getSupabaseEdgeFunctionKey(): string {
  const secret = process.env.SUPABASE_SECRET_KEY?.trim()
  if (isSecretKey(secret)) return secret

  // Some environments still store the new secret key under the legacy variable name.
  const legacyName = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (isSecretKey(legacyName)) return legacyName

  throw new Error(
    "Missing Supabase secret key. Set SUPABASE_SECRET_KEY (sb_secret_…) in the server environment. " +
      "Legacy JWT service_role keys and publishable/anon keys are not accepted by the edge functions."
  )
}

/** Headers for invoking admin edge functions (local + hosted). */
export function getSupabaseEdgeFunctionHeaders(
  extra?: Record<string, string>
): Record<string, string> {
  const key = getSupabaseEdgeFunctionKey()
  return {
    "Content-Type": "application/json",
    apikey: key,
    ...extra,
  }
}

export type InvokeEdgeFunctionResult<T> = {
  ok: boolean
  status: number
  data?: T
  error?: string
  raw?: string
}

export async function invokeSupabaseEdgeFunction<T>(
  functionName: string,
  body: Record<string, unknown> = {},
  options?: { timeoutMs?: number }
): Promise<InvokeEdgeFunctionResult<T>> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL")
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options?.timeoutMs ?? 60_000)

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: "POST",
      headers: getSupabaseEdgeFunctionHeaders(),
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    const raw = await res.text()
    let data: T | undefined
    try {
      data = raw ? (JSON.parse(raw) as T) : undefined
    } catch {
      return {
        ok: false,
        status: res.status,
        error: `Invalid JSON from ${functionName}`,
        raw: raw.slice(0, 500),
      }
    }

    const errMsg =
      (data as { error?: string; msg?: string })?.error ??
      (data as { msg?: string })?.msg

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data,
        error: errMsg ?? res.statusText,
        raw,
      }
    }

    if ((data as { success?: boolean })?.success === false) {
      return {
        ok: false,
        status: res.status,
        data,
        error: errMsg ?? "Edge function returned success: false",
        raw,
      }
    }

    return { ok: true, status: res.status, data, raw }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, status: 0, error: msg }
  } finally {
    clearTimeout(timer)
  }
}
