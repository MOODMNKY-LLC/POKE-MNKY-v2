/**
 * POST /api/admin/simulation/seed
 * Seeds full mock season (teams, pool, budgets, matchweeks)
 * Runs the seed-mock-draft logic via API
 */

import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { recordSimulationRun } from "@/lib/league-simulation/simulation-engine"

const MOCK_SEASON_NAME = "Mock Draft Demo"
const MOCK_TEAM_NAMES = ["Mock Draft Team A", "Mock Draft Team B", "Mock Draft Team C"]
const BUDGET_TOTAL = 120

export async function POST() {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "admin" && profile?.role !== "commissioner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const admin = createServiceRoleClient()

    const mockSeasonId = await getOrCreateMockSeason(admin)
    const teamIds = await getOrCreateMockTeams(admin, mockSeasonId)
    await ensureMatchweeks(admin, mockSeasonId)
    await seedDraftPool(admin, mockSeasonId)
    await ensureDraftBudgets(admin, mockSeasonId, teamIds)

    await recordSimulationRun(mockSeasonId, "drafting", {})

    return NextResponse.json({
      success: true,
      season_id: mockSeasonId,
      team_ids: teamIds,
      message: "Mock season seeded successfully",
    })
  } catch (err) {
    console.error("[simulation/seed]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}

async function getOrCreateMockSeason(supabase: ReturnType<typeof createServiceRoleClient>): Promise<string> {
  const { data: existing } = await supabase
    .from("seasons")
    .select("id")
    .eq("name", MOCK_SEASON_NAME)
    .maybeSingle()

  if (existing) return existing.id

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

  if (error || !created) throw new Error(`Failed to create mock season: ${error?.message ?? "unknown"}`)
  return created.id
}

async function ensureMatchweeks(
  supabase: ReturnType<typeof createServiceRoleClient>,
  seasonId: string
) {
  const baseDate = new Date()
  const weeks: Array<{ week_number: number; is_playoff: boolean }> = [
    ...Array.from({ length: 10 }, (_, i) => ({ week_number: i + 1, is_playoff: false })),
    ...Array.from({ length: 4 }, (_, i) => ({ week_number: 11 + i, is_playoff: true })),
  ]
  for (const w of weeks) {
    const startDate = new Date(baseDate)
    startDate.setDate(startDate.getDate() + (w.week_number - 1) * 7)
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + 6)
    await supabase.from("matchweeks").upsert(
      {
        season_id: seasonId,
        week_number: w.week_number,
        start_date: startDate.toISOString().slice(0, 10),
        end_date: endDate.toISOString().slice(0, 10),
        is_playoff: w.is_playoff,
      },
      { onConflict: "season_id,week_number" }
    )
  }
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

      if (error || !created) throw new Error(`Failed to create team ${name}: ${error?.message ?? "unknown"}`)
      ids.push(created.id)
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

  if (existing) return

  const { data: sourceRows } = await supabase
    .from("draft_pool")
    .select("pokemon_name, point_value, pokemon_id")
    .neq("season_id", seasonId)
    .eq("status", "available")
    .limit(150)

  const fallbackList = [
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
  ]

  const toInsert =
    sourceRows && sourceRows.length >= 9
      ? sourceRows.map((row) => ({
          season_id: seasonId,
          pokemon_name: row.pokemon_name,
          point_value: Math.min(20, Math.max(1, row.point_value ?? 10)),
          status: "available",
          pokemon_id: row.pokemon_id ?? null,
        }))
      : fallbackList.map((p) => ({
          season_id: seasonId,
          pokemon_name: p.pokemon_name,
          point_value: p.point_value,
          status: "available",
        }))

  const { error } = await supabase.from("draft_pool").upsert(toInsert, {
    onConflict: "season_id,pokemon_name,point_value",
    ignoreDuplicates: false,
  })
  if (error) throw new Error(`Failed to seed draft pool: ${error.message}`)
}

async function ensureDraftBudgets(
  supabase: ReturnType<typeof createServiceRoleClient>,
  seasonId: string,
  teamIds: string[]
) {
  for (const teamId of teamIds) {
    await supabase.from("draft_budgets").upsert(
      { team_id: teamId, season_id: seasonId, total_points: BUDGET_TOTAL, spent_points: 0 },
      { onConflict: "team_id,season_id" }
    )
  }
}
