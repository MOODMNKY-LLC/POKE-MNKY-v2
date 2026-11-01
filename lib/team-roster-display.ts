import type { SupabaseClient } from "@supabase/supabase-js"
import { embeddedString, firstEmbedded } from "@/lib/embedded-record"

export type TeamRosterPick = {
  id: string
  pokemon_id: string
  draft_round: number | null
  pick_number: number | null
  points_snapshot: number
  start_date: string | null
  end_date: string | null
  is_tera_captain: boolean
  tera_types: string[]
  pokemon: {
    name: string
    type1: string | null
    type2: string | null
  }
}

export function normalizeEmbeddedPokemon(value: unknown): {
  name: string
  type1: string | null
  type2: string | null
} | null {
  const row = firstEmbedded(value)
  const name = embeddedString(row, "name")
  if (!name) return null
  return {
    name,
    type1: embeddedString(row, "type1"),
    type2: embeddedString(row, "type2"),
  }
}

export function toTeamRosterPick(row: {
  id: string
  pokemon_id: string
  draft_round: number | null
  pick_number: number | null
  points_snapshot: number
  pokemon: unknown
  start_date?: string | null
  end_date?: string | null
  is_tera_captain?: boolean | null
  tera_types?: string[] | null
}): TeamRosterPick {
  const poke = normalizeEmbeddedPokemon(row.pokemon)
  return {
    id: row.id,
    pokemon_id: row.pokemon_id,
    draft_round: row.draft_round,
    pick_number: row.pick_number,
    points_snapshot: row.points_snapshot,
    start_date: row.start_date ?? null,
    end_date: row.end_date ?? null,
    is_tera_captain: row.is_tera_captain === true,
    tera_types: row.tera_types ?? [],
    pokemon: {
      name: poke?.name ?? "Unknown",
      type1: poke?.type1 ?? null,
      type2: poke?.type2 ?? null,
    },
  }
}

/** Roster as of a week when team_roster_versions is empty. */
export function picksActiveDuringWeek(
  picks: TeamRosterPick[],
  weekStart: string,
  weekEnd: string,
): TeamRosterPick[] {
  return picks.filter((pick) => {
    const start = pick.start_date ?? "0001-01-01"
    if (start > weekEnd) return false
    if (pick.end_date && pick.end_date <= weekStart) return false
    return true
  })
}

export function weekBounds(seasonStart: string, weekNumber: number): { start: string; end: string } {
  const startDate = new Date(`${seasonStart}T00:00:00Z`)
  startDate.setUTCDate(startDate.getUTCDate() + (weekNumber - 1) * 7)
  const endDate = new Date(startDate)
  endDate.setUTCDate(endDate.getUTCDate() + 6)
  return { start: startDate.toISOString().slice(0, 10), end: endDate.toISOString().slice(0, 10) }
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
      start_date,
      end_date,
      is_tera_captain,
      tera_types,
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
    return draftPicks.map((row) => toTeamRosterPick(row))
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

  return (legacy ?? []).map((row) =>
    toTeamRosterPick({
      id: row.id,
      pokemon_id: row.pokemon_id,
      draft_round: row.draft_round,
      pick_number: row.draft_order,
      points_snapshot: row.draft_points ?? 0,
      pokemon: row.pokemon,
    }),
  )
}
