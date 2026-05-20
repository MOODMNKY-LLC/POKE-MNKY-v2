import type { SupabaseClient } from "@supabase/supabase-js"
import { getCurrentSeasonIdWithFallback } from "@/lib/seasons"

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
 * Prefer current season; fall back to all teams if the season filter returns none.
 */
export async function getPublicLeagueTeams(
  supabase: SupabaseClient
): Promise<{ teams: PublicTeamRow[]; seasonId: string | null; seasonName: string | null }> {
  const seasonId = await getCurrentSeasonIdWithFallback(supabase)

  let seasonName: string | null = null
  if (seasonId) {
    const { data: season } = await supabase
      .from("seasons")
      .select("name")
      .eq("id", seasonId)
      .maybeSingle()
    seasonName = season?.name ?? null
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

  let { data: teams, error } = await load(true)

  if (error) {
    throw error
  }

  if ((!teams || teams.length === 0) && seasonId) {
    const fallback = await load(false)
    if (fallback.error) throw fallback.error
    teams = fallback.data
  }

  return {
    teams: (teams ?? []) as PublicTeamRow[],
    seasonId: seasonId ?? null,
    seasonName,
  }
}
