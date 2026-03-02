/**
 * League compliance check for user-submitted showdown teams.
 * Rules: 8-10 Pokemon, all in draft pool, total points <= 120.
 */

import type { SupabaseClient } from "@supabase/supabase-js"

const LEAGUE_BUDGET = 120
const MIN_ROSTER = 8
const MAX_ROSTER = 10

export interface LeagueComplianceResult {
  compliant: boolean
  errors: string[]
  warnings: string[]
  totalPoints: number
  rosterSize: number
  resolved: { name: string; pointValue: number }[]
}

function normalizeName(name: string): string {
  return (name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s+/g, "-")
}

/**
 * Resolve Pokemon names from submission to draft pool and sum points.
 * Uses draft_pool for the given season (or current season).
 */
export async function checkLeagueCompliance(
  supabase: SupabaseClient,
  pokemonNames: string[],
  seasonId: string | null
): Promise<LeagueComplianceResult> {
  const errors: string[] = []
  const warnings: string[] = []
  const resolved: { name: string; pointValue: number }[] = []

  const rosterSize = pokemonNames.length

  if (rosterSize < MIN_ROSTER) {
    errors.push(
      `Roster size is ${rosterSize}; minimum is ${MIN_ROSTER} Pokemon.`
    )
  }
  if (rosterSize > MAX_ROSTER) {
    errors.push(
      `Roster size is ${rosterSize}; maximum is ${MAX_ROSTER} Pokemon.`
    )
  }

  let seasonToUse = seasonId
  if (!seasonToUse) {
    const { data: current } = await supabase
      .from("seasons")
      .select("id")
      .eq("is_current", true)
      .limit(1)
      .single()
    seasonToUse = current?.id ?? null
  }

  const nameToPoints = new Map<string, number>()

  if (seasonToUse) {
    const { data: rows, error: seasonError } = await supabase
      .from("draft_pool")
      .select("pokemon_name, point_value")
      .eq("season_id", seasonToUse)

    if (!seasonError && rows?.length) {
      for (const r of rows) {
        const key = normalizeName(r.pokemon_name)
        if (!nameToPoints.has(key)) {
          nameToPoints.set(key, r.point_value ?? 0)
        }
      }
    }
    if (nameToPoints.size === 0) {
      warnings.push("No draft pool found for this season; using global pool.")
    }
  }

  if (nameToPoints.size === 0) {
    const { data: rows } = await supabase
      .from("draft_pool")
      .select("pokemon_name, point_value")
      .limit(2000)

    if (rows?.length) {
      for (const r of rows) {
        const key = normalizeName(r.pokemon_name)
        if (!nameToPoints.has(key)) {
          nameToPoints.set(key, r.point_value ?? 0)
        }
      }
    }
  }

  if (nameToPoints.size === 0) {
    errors.push("Draft pool is empty; cannot verify Pokemon or points.")
    return {
      compliant: false,
      errors,
      warnings,
      totalPoints: 0,
      rosterSize,
      resolved: [],
    }
  }

  let totalPoints = 0
  for (const rawName of pokemonNames) {
    const n = normalizeName(rawName)
    const pointValue = nameToPoints.get(n)
    if (pointValue === undefined) {
      errors.push(`"${rawName}" is not in the draft pool.`)
    } else {
      resolved.push({ name: rawName, pointValue })
      totalPoints += pointValue
    }
  }

  if (totalPoints > LEAGUE_BUDGET) {
    errors.push(
      `Total points (${totalPoints}) exceeds league budget (${LEAGUE_BUDGET}).`
    )
  }

  const compliant =
    errors.length === 0 &&
    rosterSize >= MIN_ROSTER &&
    rosterSize <= MAX_ROSTER &&
    totalPoints <= LEAGUE_BUDGET

  return {
    compliant,
    errors,
    warnings,
    totalPoints,
    rosterSize,
    resolved,
  }
}

/**
 * Extract Pokemon names from showdown_teams row (pokemon_data or team_text).
 */
export function extractPokemonNamesFromShowdownTeam(team: {
  pokemon_data?: unknown
  team_text?: string
  canonical_text?: string
}): string[] {
  const names: string[] = []
  const data = team.pokemon_data
  if (Array.isArray(data)) {
    for (const p of data) {
      const name =
        (p as { name?: string }).name ??
        (p as { species?: string }).species ??
        (p as { pokemon?: string }).pokemon
      if (name && typeof name === "string") {
        names.push(name.trim())
      }
    }
  }
  if (names.length > 0) return names
  const text = team.team_text || team.canonical_text || ""
  if (!text) return []
  const lineRegex = /^(?:[-*\s]*)([A-Za-z0-9\s'-]+?)(?:\s*\(|$)/gm
  const seen = new Set<string>()
  let m: RegExpExecArray | null
  while ((m = lineRegex.exec(text)) !== null) {
    const name = m[1].trim()
    if (
      name &&
      !/^(Ability|Item|Level|EVs|IVs|Nature|Tera|Moves|Shiny|Gender|Happiness)$/i.test(
        name
      ) &&
      name.length < 50
    ) {
      const key = name.toLowerCase()
      if (!seen.has(key)) {
        seen.add(key)
        names.push(name)
      }
    }
  }
  return names
}
