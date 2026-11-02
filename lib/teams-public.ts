import type { SupabaseClient } from "@supabase/supabase-js"
import { getCurrentSeasonIdWithFallback } from "@/lib/seasons"
import { listStandingsSeasons, pickStandingsSeason, type StandingsSeasonRow } from "@/lib/standings-season"

export type PublicTeamRow = {
  id: string
  name: string
  coach_name: string
  division: string
  conference: string
  /** Prefer regular-season W-L for public cards; wins/losses remain overall fallbacks. */
  wins: number
  losses: number
  regular_wins?: number | null
  regular_losses?: number | null
  playoff_wins?: number | null
  playoff_losses?: number | null
  differential: number
  regular_differential?: number | null
  strength_of_schedule?: number | null
  logo_url?: string | null
  avatar_url?: string | null
  season_id?: string | null
  is_bye?: boolean
}

/** Regular-season record for public display (matches /standings). */
export function publicRegularRecord(team: PublicTeamRow): { wins: number; losses: number; differential: number } {
  return {
    wins: team.regular_wins ?? team.wins,
    losses: team.regular_losses ?? team.losses,
    differential: team.regular_differential ?? team.differential,
  }
}

/**
 * Load teams for public pages (/teams, homepage).
 * scope "current" keeps the draft season. scope "live" follows the shared
 * standings resolver (sheet-synced season) and does not fall back broadly.
 */
export async function getPublicLeagueTeams(
  supabase: SupabaseClient,
  options?: { requestedSeason?: string | null; scope?: "current" | "live" },
): Promise<{
  teams: PublicTeamRow[]
  seasonId: string | null
  seasonName: string | null
  seasons: StandingsSeasonRow[]
}> {
  const scope = options?.scope ?? "current"
  let seasonId: string | null = null
  let seasonName: string | null = null
  let seasons: StandingsSeasonRow[] = []

  if (scope === "live") {
    seasons = await listStandingsSeasons(supabase)
    const season = pickStandingsSeason(seasons, options?.requestedSeason)
    seasonId = season?.id ?? null
    seasonName = season?.name ?? null
  } else {
    seasonId = await getCurrentSeasonIdWithFallback(supabase)
    if (seasonId) {
      const { data: season } = await supabase
        .from("seasons")
        .select("name")
        .eq("id", seasonId)
        .maybeSingle()
      seasonName = season?.name ?? null
    }
  }

  const select =
    "id, name, coach_name, division, conference, wins, losses, regular_wins, regular_losses, playoff_wins, playoff_losses, differential, regular_differential, strength_of_schedule, logo_url, avatar_url, season_id, is_bye"

  const load = async (filterSeason: boolean) => {
    let q = supabase
      .from("teams")
      .select(select)
      .order("regular_wins", { ascending: false })
      .order("wins", { ascending: false })
      .order("name")
    if (filterSeason && seasonId) {
      q = q.eq("season_id", seasonId)
    }
    return q
  }

  const { data: initialTeams, error } = await load(true)
  let teams = initialTeams

  if (error) {
    throw error
  }

  if (scope !== "live" && (!teams || teams.length === 0) && seasonId) {
    const fallback = await load(false)
    if (fallback.error) throw fallback.error
    teams = fallback.data
  }

  return {
    teams: (teams ?? []) as PublicTeamRow[],
    seasonId: seasonId ?? null,
    seasonName,
    seasons,
  }
}
