/**
 * Public Pokémon Showdown / Smogon hosts used after scaling back self-hosted aab-* services.
 * Prefer these defaults so the app works when private calc/play stacks are offline.
 */

export const PUBLIC_SHOWDOWN_CLIENT_URL = "https://play.pokemonshowdown.com"
export const PUBLIC_SHOWDOWN_REPLAY_URL = "https://replay.pokemonshowdown.com"
export const PUBLIC_DAMAGE_CALC_URL = "https://calc.pokemonshowdown.com"

const RETIRED_HOST_FRAGMENTS = [
  "aab-play.moodmnky.com",
  "aab-showdown.moodmnky.com",
  "aab-replay.moodmnky.com",
  "aab-calc.moodmnky.com",
] as const

function isRetiredHost(url: string): boolean {
  return RETIRED_HOST_FRAGMENTS.some((host) => url.includes(host))
}

function pickPublicUrl(fromEnv: string | undefined, fallback: string): string {
  const trimmed = fromEnv?.trim()
  if (trimmed && !isRetiredHost(trimmed)) return trimmed
  return fallback
}

/** Battle client URL: env override, else official public Showdown. */
export function getShowdownClientUrl(
  env: Record<string, string | undefined> = process.env,
): string {
  return pickPublicUrl(env.NEXT_PUBLIC_SHOWDOWN_CLIENT_URL, PUBLIC_SHOWDOWN_CLIENT_URL)
}

/** Damage calculator URL: env override, else official public Smogon calc. */
export function getDamageCalcUrl(
  env: Record<string, string | undefined> = process.env,
): string {
  return pickPublicUrl(env.NEXT_PUBLIC_DAMAGE_CALC_URL, PUBLIC_DAMAGE_CALC_URL)
}

/** Public replay viewer base (no trailing slash). */
export function getShowdownReplayBaseUrl(
  env: Record<string, string | undefined> = process.env,
): string {
  return pickPublicUrl(env.NEXT_PUBLIC_SHOWDOWN_REPLAY_URL, PUBLIC_SHOWDOWN_REPLAY_URL)
}

export function getPublicReplayViewerUrl(
  replayId: string,
  env: Record<string, string | undefined> = process.env,
): string {
  return `${getShowdownReplayBaseUrl(env)}/${replayId}`
}
