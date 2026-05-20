import type { SupabaseClient } from "@supabase/supabase-js"

export type TeamRosterPick = {
  id: string
  pokemon_id: string
  draft_round: number | null
  pick_number: number | null
  points_snapshot: number
  pokemon: {
    name: string
    type1: string | null
    type2: string | null
  }
}

/**
 * Active roster for public team pages — prefers `draft_picks`, falls back to legacy `team_rosters`.
 */
export async function getTeamRosterPicks(
  supabase: SupabaseClient,
  teamId: string,
  seasonId: string
): Promise<TeamRosterPick[]> {
  const { data: draftPicks, error: draftError } = await supabase
    .from("draft_picks")
    .select(
      `
      id,
      pokemon_id,
      draft_round,
      pick_number,
      points_snapshot,
      pokemon:pokemon_id(name, type1, type2)
    `
    )
    .eq("season_id", seasonId)
    .eq("team_id", teamId)
    .eq("status", "active")
    .order("draft_round", { ascending: true })
    .order("pick_number", { ascending: true })

  if (draftError) {
    throw draftError
  }

  if (draftPicks && draftPicks.length > 0) {
    return draftPicks.map((row) => {
      const poke = row.pokemon as { name: string; type1: string | null; type2: string | null } | null
      return {
        id: row.id,
        pokemon_id: row.pokemon_id,
        draft_round: row.draft_round,
        pick_number: row.pick_number,
        points_snapshot: row.points_snapshot,
        pokemon: {
          name: poke?.name ?? "Unknown",
          type1: poke?.type1 ?? null,
          type2: poke?.type2 ?? null,
        },
      }
    })
  }

  const { data: legacy, error: legacyError } = await supabase
    .from("team_rosters")
    .select(
      `
      id,
      pokemon_id,
      draft_round,
      draft_order,
      draft_points,
      pokemon:pokemon_id(name, type1, type2)
    `
    )
    .eq("team_id", teamId)
    .order("draft_round", { ascending: true })
    .order("draft_order", { ascending: true })

  if (legacyError) {
    throw legacyError
  }

  return (legacy ?? []).map((row) => {
    const poke = row.pokemon as { name: string; type1: string | null; type2: string | null } | null
    return {
      id: row.id,
      pokemon_id: row.pokemon_id,
      draft_round: row.draft_round,
      pick_number: row.draft_order,
      points_snapshot: row.draft_points ?? 0,
      pokemon: {
        name: poke?.name ?? "Unknown",
        type1: poke?.type1 ?? null,
        type2: poke?.type2 ?? null,
      },
    }
  })
}
