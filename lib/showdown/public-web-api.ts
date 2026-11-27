/**
 * Read-only clients for official Pokémon Showdown public web APIs.
 * Docs: https://github.com/smogon/pokemon-showdown-client/blob/master/WEB-API.md
 *
 * These endpoints are CORS-open and do not prove account ownership.
 * Never treat a username lookup as verified linking.
 */

import { PUBLIC_SHOWDOWN_CLIENT_URL, PUBLIC_SHOWDOWN_REPLAY_URL } from "@/lib/showdown/public-hosts"

export const PUBLIC_PS_SITE_URL = "https://pokemonshowdown.com"

export type PublicShowdownUser = {
  username: string
  userid: string
  registertime?: number
  group?: number
  ratings?: Record<
    string,
    {
      elo?: number
      gxe?: number
      w?: number
      l?: number
      [key: string]: unknown
    }
  >
}

export type PublicLadderEntry = {
  userid?: string
  username?: string
  elo?: number
  gxe?: number
  [key: string]: unknown
}

export type PublicLadder = {
  formatid: string
  format?: string
  toplist: PublicLadderEntry[]
}

export type PublicReplaySearchHit = {
  id: string
  uploadtime: number
  format?: string
  players?: string[]
  rating?: number | null
  private?: number
  password?: string | null
}

export type ReplaySearchParams = {
  user?: string
  user2?: string
  format?: string
  /** Prefer uploadtime of the last result from the previous page (official before= API). */
  before?: number
}

function toUserid(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]/g, "")
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      "User-Agent": "POKE-MNKY/1.0 (league-app; read-only)",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  })
  if (!res.ok) {
    throw new Error(`Showdown public API ${res.status} for ${url}`)
  }
  return (await res.json()) as T
}

/** Public profile + ladder ratings for a username (not ownership proof). */
export async function fetchPublicShowdownUser(username: string): Promise<PublicShowdownUser> {
  const userid = toUserid(username)
  if (!userid) throw new Error("Username required")
  return fetchJson<PublicShowdownUser>(`${PUBLIC_PS_SITE_URL}/users/${encodeURIComponent(userid)}.json`)
}

/** Ladder toplist for a format id (e.g. gen9ou). */
export async function fetchPublicLadder(formatId: string): Promise<PublicLadder> {
  const format = formatId.trim().toLowerCase()
  if (!format) throw new Error("Format required")
  return fetchJson<PublicLadder>(`${PUBLIC_PS_SITE_URL}/ladder/${encodeURIComponent(format)}.json`)
}

/** Full moves dex JSON from the public client data host. Large — prefer server-side cache. */
export async function fetchPublicMovesJson(): Promise<Record<string, unknown>> {
  return fetchJson<Record<string, unknown>>(`${PUBLIC_SHOWDOWN_CLIENT_URL}/data/moves.json`)
}

/**
 * Replay search. Returns up to 51 hits; a 51st hit means another page exists.
 * Paginate with `before` = last hit's uploadtime (not page=).
 * Filters out private / passworded entries by default.
 */
export async function searchPublicReplays(
  params: ReplaySearchParams,
  options?: { includePrivate?: boolean },
): Promise<{ hits: PublicReplaySearchHit[]; hasMore: boolean }> {
  const url = new URL(`${PUBLIC_SHOWDOWN_REPLAY_URL}/search.json`)
  if (params.user?.trim()) url.searchParams.set("user", params.user.trim())
  if (params.user2?.trim()) url.searchParams.set("user2", params.user2.trim())
  if (params.format?.trim()) url.searchParams.set("format", params.format.trim())
  if (typeof params.before === "number" && Number.isFinite(params.before)) {
    url.searchParams.set("before", String(Math.floor(params.before)))
  }

  const raw = await fetchJson<PublicReplaySearchHit[]>(url.toString())
  const list = Array.isArray(raw) ? raw : []
  const hasMore = list.length >= 51
  const page = hasMore ? list.slice(0, 50) : list
  const hits = options?.includePrivate
    ? page
    : page.filter((hit) => !hit.private && !hit.password)
  return { hits, hasMore }
}

export function publicReplayViewerUrl(replayId: string): string {
  return `${PUBLIC_SHOWDOWN_REPLAY_URL}/${replayId.replace(/^\//, "")}`
}

export function toShowdownUserid(username: string): string {
  return toUserid(username)
}
