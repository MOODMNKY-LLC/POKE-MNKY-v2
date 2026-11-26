/** The slice of Cloudflare KV this Worker uses. Declared here so the code type-checks without workers-types. */
export interface KVLike {
  get(key: string): Promise<string | null>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
  delete(key: string): Promise<void>
}

export interface Env {
  /** Kill switch. Only the exact string "true" turns the Worker on. */
  ONBOARDING_ENABLED?: string
  NETBIRD_API_BASE?: string
  NETBIRD_LEAGUE_GROUP_ID?: string
  INVITE_TTL_SECONDS?: string
  DAILY_INVITE_CAP?: string
  /** Secrets (wrangler secret put). */
  NETBIRD_API_TOKEN?: string
  DISCORD_BOT_TOKEN?: string
  SIGNING_SECRET?: string
  ONBOARD_KV: KVLike
}

export type WorkerStatus = "invited" | "already_member" | "revoked" | "ok" | "error"

export const GUIDE_URL = "https://poke-mnky.moodmnky.com/dashboard/guides/netbird"
export const NETBIRD_SERVER_URL = "https://netbird.moodmnky.com"
