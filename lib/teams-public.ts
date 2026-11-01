import type { SupabaseClient } from "@supabase/supabase-js"
import { getCurrentSeasonIdWithFallback } from "@/lib/seasons"
import { listStandingsSeasons, pickStandingsSeason, type StandingsSeasonRow } from "@/lib/standings-season"

export type PublicTeamRow = {
  id: string
  name: string
  coach_name: string
  division: string
  conference: string
  wins: number
  losses: number
  differential: number
  strength_of_schedule?: number | null
  logo_url?: string | null
  avatar_url?: string | null
  season_id?: string | null
}

/**
 * Load teams for public pages (/teams, homepage).
 * scope "current" keeps the draft season (homepage). scope "live" follows the
 * shared standings resolver and does not fall back to every season's teams.
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
    "id, name, coach_name, division, conference, wins, losses, differential, strength_of_schedule, logo_url, avatar_url, season_id"

  const load = async (filterSeason: boolean) => {
    let q = supabase.from("teams").select(select).order("wins", { ascending: false }).order("name")
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
