/**
 * Invoke Supabase Edge Functions from Next.js server code with correct auth headers.
 *
 * Local dev often uses sb_secret_* / sb_publishable_* keys (not JWTs). Those must be sent
 * as `apikey`, not only as Authorization Bearer, or the gateway returns "Missing authorization header".
 */

export function getSupabaseEdgeFunctionKey(): string {
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim()

  if (!key) {
    throw new Error(
      "Missing Supabase API key. Set SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) in .env.local."
    )
  }
  return key
}

/** Headers required by Supabase Functions gateway (local + hosted). */
export function getSupabaseEdgeFunctionHeaders(
  extra?: Record<string, string>
): Record<string, string> {
  const key = getSupabaseEdgeFunctionKey()
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: key,
    ...extra,
  }

  // Legacy JWT keys (eyJ…) validate as Bearer; new sb_* keys rely on apikey (see config verify_jwt).
  if (key.startsWith("eyJ")) {
    headers.Authorization = `Bearer ${key}`
  } else {
    headers.Authorization = `Bearer ${key}`
  }

  return headers
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
