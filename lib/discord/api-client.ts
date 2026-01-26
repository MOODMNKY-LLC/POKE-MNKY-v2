/**
 * Phase 6: Discord Bot API Client Helper
 * Utility functions for Discord bot commands to call API endpoints with bot authentication
 */

const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || "http://localhost:3000"
const BOT_API_KEY = process.env.DISCORD_BOT_API_KEY

if (!BOT_API_KEY) {
  console.warn("[Discord API Client] DISCORD_BOT_API_KEY not set - API calls will fail")
}

/**
 * Make authenticated GET request to API endpoint
 */
export async function appGet<T>(path: string): Promise<T> {
  if (!BOT_API_KEY) {
    throw new Error("DISCORD_BOT_API_KEY not configured")
  }

  const url = path.startsWith("http") ? path : `${APP_BASE_URL}${path}`
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${BOT_API_KEY}`,
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(error.error || error.message || `API request failed: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Make authenticated POST request to API endpoint
 */
export async function appPost<T>(path: string, body: any): Promise<T> {
  if (!BOT_API_KEY) {
    throw new Error("DISCORD_BOT_API_KEY not configured")
  }

  const url = path.startsWith("http") ? path : `${APP_BASE_URL}${path}`
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${BOT_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(error.error || error.message || `API request failed: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get guild default season ID (with caching)
 */
const guildConfigCache = new Map<string, { seasonId: string | null; expires: number }>()
const CACHE_TTL = 30_000 // 30 seconds

export async function getGuildDefaultSeasonId(guildId: string | null): Promise<string | null> {
  if (!guildId) return null

  // Check cache
  const cached = guildConfigCache.get(guildId)
  if (cached && cached.expires > Date.now()) {
    return cached.seasonId
  }

  try {
    const response = await appGet<{
      ok: boolean
      guild_id: string
      default_season_id: string | null
      configured: boolean
    }>(`/api/discord/guild/config?guild_id=${encodeURIComponent(guildId)}`)

    const seasonId = response.default_season_id || null

    // Cache result
    guildConfigCache.set(guildId, {
      seasonId,
      expires: Date.now() + CACHE_TTL,
    })

    return seasonId
  } catch (error) {
    console.error(`[Discord API] Failed to get guild config for ${guildId}:`, error)
    return null
  }
}
