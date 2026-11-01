/**
 * Allowlists for server-side proxies that would otherwise forward
 * caller-controlled paths with a privileged credential.
 */

const MCP_PROXY_PATHS = new Set([
  "/api/health",
  "/health",
  "/api/get_available_pokemon",
  "/api/get_draft_status",
  "/api/get_team_budget",
  "/api/get_team_picks",
  "/api/get_pokemon_types",
  "/api/get_smogon_meta",
  "/api/get_ability_mechanics",
  "/api/get_move_mechanics",
  "/api/analyze_pick_value",
])

/** Upstream host is always the configured MCP server, never the request URL. */
export function mcpProxyEndpoint(segments: string[]): string | null {
  if (segments.length === 0) return null
  for (const segment of segments) {
    if (!segment || segment === "." || segment === ".." || segment.includes("\\") || segment.includes(":")) {
      return null
    }
  }
  const endpoint = `/${segments.join("/")}`
  return MCP_PROXY_PATHS.has(endpoint) ? endpoint : null
}

const MANAGEMENT_PATH_SUFFIXES = ["/database/query", "/logs", "/storage/buckets"] as const

export function configuredSupabaseProjectRef(
  env: Record<string, string | undefined> = process.env
): string | null {
  const explicit = env.NEXT_PUBLIC_SUPABASE_PROJECT_REF?.trim()
  if (explicit && /^[a-z0-9-]+$/i.test(explicit)) return explicit

  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? ""
  if (!url || /localhost|127\.0\.0\.1/i.test(url)) return null
  try {
    const ref = new URL(url).hostname.split(".")[0]
    if (ref && /^[a-z0-9-]+$/i.test(ref)) return ref
  } catch {
    return null
  }
  return null
}

/**
 * Only the platform-kit reads against this app's own project are allowed.
 * The host is fixed to api.supabase.com.
 */
export function isAllowedSupabaseManagementPath(
  path: string,
  env: Record<string, string | undefined> = process.env
): boolean {
  if (!path || path.includes("..") || path.includes("\\") || path.includes("//") || path.includes("?")) {
    return false
  }
  const ref = configuredSupabaseProjectRef(env)
  if (!ref) return false
  const prefix = `v1/projects/${ref}`
  return MANAGEMENT_PATH_SUFFIXES.some((suffix) => path === `${prefix}${suffix}`)
}

export function supabaseManagementUrl(
  path: string,
  search: string,
  env: Record<string, string | undefined> = process.env
): string | null {
  if (!isAllowedSupabaseManagementPath(path, env)) return null
  const qs = search ? `?${search}` : ""
  return `https://api.supabase.com/${path}${qs}`
}
