/**
 * Seed Mock Draft environment: mock season, teams, draft pool, and budgets.
 * Idempotent: re-run safe. Use with run-mock-draft.ts and reset-mock-draft.ts.
 *
 * Usage: pnpm exec tsx --env-file=.env.local scripts/seed-mock-draft.ts
 */

import { config } from "dotenv"
import { resolve } from "path"
import { createServiceRoleClient } from "../lib/supabase/service"

config({ path: resolve(process.cwd(), ".env.local") })
config({ path: resolve(process.cwd(), ".env") })

const MOCK_SEASON_NAME = "Mock Draft Demo"
const MOCK_TEAM_NAMES = ["Mock Draft Team A", "Mock Draft Team B", "Mock Draft Team C"]

const BUDGET_TOTAL = 120

async function seedMockDraft() {
  console.log("Seeding Mock Draft environment...\n")
  const supabase = createServiceRoleClient()

  const mockSeasonId = await getOrCreateMockSeason(supabase)
  const teamIds = await getOrCreateMockTeams(supabase, mockSeasonId)
  await seedDraftPool(supabase, mockSeasonId)
  await ensureDraftBudgets(supabase, mockSeasonId, teamIds)

  console.log("\nMock draft seed complete.")
  console.log("Season ID:", mockSeasonId)
  console.log("Team IDs:", teamIds.join(", "))
  console.log("Next: run scripts/run-mock-draft.ts or POST /api/draft/create-session with season_id and team_ids.")
}

async function getOrCreateMockSeason(
  supabase: ReturnType<typeof createServiceRoleClient>
): Promise<string> {
  const { data: existing } = await supabase
    .from("seasons")
    .select("id")
    .eq("name", MOCK_SEASON_NAME)
    .maybeSingle()

  if (existing) {
    console.log("Using existing mock season:", MOCK_SEASON_NAME)
    return existing.id
  }

  const { data: created, error } = await supabase
    .from("seasons")
    .insert({
      name: MOCK_SEASON_NAME,
      is_current: false,
      start_date: new Date().toISOString().slice(0, 10),
      end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    })
    .select("id")
    .single()

  if (error || !created) {
    throw new Error(`Failed to create mock season: ${error?.message ?? "unknown"}`)
  }
  console.log("Created mock season:", MOCK_SEASON_NAME, created.id)
  return created.id
}

async function getOrCreateMockTeams(
  supabase: ReturnType<typeof createServiceRoleClient>,
  seasonId: string
): Promise<string[]> {
  const ids: string[] = []

  for (const name of MOCK_TEAM_NAMES) {
    const { data: existing } = await supabase
      .from("teams")
      .select("id")
      .eq("name", name)
      .maybeSingle()

    if (existing) {
      await supabase.from("teams").update({ season_id: seasonId }).eq("id", existing.id)
      ids.push(existing.id)
      console.log("Using existing team:", name)
    } else {
      const { data: created, error } = await supabase
        .from("teams")
        .insert({
          name,
          coach_name: "Demo Coach",
          division: "Demo",
          conference: "Demo",
          season_id: seasonId,
        })
        .select("id")
        .single()

      if (error || !created) {
        throw new Error(`Failed to create team ${name}: ${error?.message ?? "unknown"}`)
      }
      ids.push(created.id)
      console.log("Created team:", name)
    }
  }

  return ids
}

async function seedDraftPool(
  supabase: ReturnType<typeof createServiceRoleClient>,
  seasonId: string
) {
  const { data: existing } = await supabase
    .from("draft_pool")
    .select("id")
    .eq("season_id", seasonId)
    .limit(1)
    .maybeSingle()

  if (existing) {
    console.log("Draft pool for mock season already has rows; skipping seed.")
    return
  }

  const { data: sourceRows } = await supabase
    .from("draft_pool")
    .select("pokemon_name, point_value, pokemon_id")
    .neq("season_id", seasonId)
    .eq("status", "available")
    .limit(150)

  if (sourceRows && sourceRows.length >= 9) {
    const toInsert = sourceRows.map((row) => ({
      season_id: seasonId,
      pokemon_name: row.pokemon_name,
      point_value: Math.min(20, Math.max(1, row.point_value ?? 10)),
      status: "available",
      pokemon_id: row.pokemon_id ?? null,
    }))
    const { error } = await supabase.from("draft_pool").upsert(toInsert, {
      onConflict: "season_id,pokemon_name,point_value",
      ignoreDuplicates: false,
    })
    if (error) throw new Error(`Failed to copy draft pool: ${error.message}`)
    console.log("Copied", toInsert.length, "Pokémon into mock draft pool.")
    return
  }

  const fallbackList: Array<{ pokemon_name: string; point_value: number }> = [
    { pokemon_name: "pikachu", point_value: 12 },
    { pokemon_name: "charizard", point_value: 19 },
    { pokemon_name: "blastoise", point_value: 18 },
    { pokemon_name: "venusaur", point_value: 18 },
    { pokemon_name: "garchomp", point_value: 19 },
    { pokemon_name: "tyranitar", point_value: 17 },
    { pokemon_name: "metagross", point_value: 18 },
    { pokemon_name: "gengar", point_value: 16 },
    { pokemon_name: "dragonite", point_value: 18 },
    { pokemon_name: "lucario", point_value: 16 },
    { pokemon_name: "salamence", point_value: 17 },
    { pokemon_name: "magnezone", point_value: 15 },
    { pokemon_name: "heatran", point_value: 20 },
    { pokemon_name: "landorus", point_value: 20 },
    { pokemon_name: "ferrothorn", point_value: 17 },
    { pokemon_name: "clefable", point_value: 16 },
    { pokemon_name: "tapu koko", point_value: 19 },
    { pokemon_name: "toxapex", point_value: 17 },
    { pokemon_name: "corviknight", point_value: 17 },
  ]

  const { error } = await supabase.from("draft_pool").insert(
    fallbackList.map((p) => ({
      season_id: seasonId,
      pokemon_name: p.pokemon_name,
      point_value: p.point_value,
      status: "available",
    }))
  )
  if (error) throw new Error(`Failed to seed draft pool: ${error.message}`)
  console.log("Inserted", fallbackList.length, "fallback Pokémon into mock draft pool.")
}

async function ensureDraftBudgets(
  supabase: ReturnType<typeof createServiceRoleClient>,
  seasonId: string,
  teamIds: string[]
) {
  for (const teamId of teamIds) {
    const { error } = await supabase.from("draft_budgets").upsert(
      {
        team_id: teamId,
        season_id: seasonId,
        total_points: BUDGET_TOTAL,
        spent_points: 0,
        remaining_points: BUDGET_TOTAL,
      },
      { onConflict: "team_id,season_id" }
    )
    if (error) throw new Error(`Failed to upsert draft budget: ${error.message}`)
  }
  console.log("Draft budgets ensured for", teamIds.length, "teams (", BUDGET_TOTAL, "pts each).")
}

seedMockDraft().catch((err) => {
  console.error(err)
  process.exit(1)
})
