/**
 * Resolve a coach's league team for a season (profiles.team_id + coaches.id → teams).
 */

import type { SupabaseClient } from "@supabase/supabase-js"

export type CoachTeamRow = {
  id: string
  name: string
  season_id: string | null
  coach_id: string | null
  [key: string]: unknown
}

export async function getCoachIdForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data: coach } = await supabase
    .from("coaches")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle()
  return coach?.id ?? null
}

/**
 * Prefer profiles.team_id when it points at a team in this season; else teams.coach_id = coaches.id.
 */
export async function resolveCoachTeamForSeason(
  supabase: SupabaseClient,
  userId: string,
  seasonId: string
): Promise<{ team: CoachTeamRow | null; coachId: string | null }> {
  const coachId = await getCoachIdForUser(supabase, userId)

  const { data: profile } = await supabase
    .from("profiles")
    .select("team_id")
    .eq("id", userId)
    .maybeSingle()

  if (profile?.team_id) {
    const { data: team } = await supabase
      .from("teams")
      .select("*")
      .eq("id", profile.team_id)
      .eq("season_id", seasonId)
      .maybeSingle()
    if (team) {
      return { team: team as CoachTeamRow, coachId }
    }
  }

  if (coachId) {
    const { data: team } = await supabase
      .from("teams")
      .select("*")
      .eq("coach_id", coachId)
      .eq("season_id", seasonId)
      .maybeSingle()
    if (team) {
      return { team: team as CoachTeamRow, coachId }
    }
  }

  return { team: null, coachId }
}
