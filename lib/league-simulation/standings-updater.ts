/**
 * Standings Updater
 * Recalculates team wins, losses, differential from completed matches
 */

import type { SupabaseClient } from "@supabase/supabase-js"

export async function updateStandingsFromMatches(
  supabase: SupabaseClient,
  seasonId: string
): Promise<{ updated: number }> {
  const { data: matches, error: matchError } = await supabase
    .from("matches")
    .select("team1_id, team2_id, winner_id, team1_score, team2_score, differential")
    .eq("season_id", seasonId)
    .eq("status", "completed")

  if (matchError || !matches?.length) {
    return { updated: 0 }
  }

  const teamStats = new Map<
    string,
    { wins: number; losses: number; differential: number }
  >()

  for (const m of matches) {
    const t1 = m.team1_id
    const t2 = m.team2_id
    const winner = m.winner_id
    const diff = m.differential ?? Math.abs((m.team1_score ?? 0) - (m.team2_score ?? 0))

    if (!teamStats.has(t1)) teamStats.set(t1, { wins: 0, losses: 0, differential: 0 })
    if (!teamStats.has(t2)) teamStats.set(t2, { wins: 0, losses: 0, differential: 0 })

    const s1 = teamStats.get(t1)!
    const s2 = teamStats.get(t2)!

    if (winner === t1) {
      s1.wins++
      s2.losses++
      s1.differential += diff
      s2.differential -= diff
    } else if (winner === t2) {
      s2.wins++
      s1.losses++
      s2.differential += diff
      s1.differential -= diff
    }
  }

  let updated = 0
  for (const [teamId, stats] of teamStats.entries()) {
    const { error } = await supabase
      .from("teams")
      .update({
        wins: stats.wins,
        losses: stats.losses,
        differential: stats.differential,
        updated_at: new Date().toISOString(),
      })
      .eq("id", teamId)

    if (!error) updated++
  }

  return { updated }
}
