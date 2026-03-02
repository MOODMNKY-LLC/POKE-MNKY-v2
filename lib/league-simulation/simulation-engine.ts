/**
 * Simulation Engine
 * Orchestrates full league simulation: seed → draft → schedule → results → playoffs
 */

import { createServiceRoleClient } from "@/lib/supabase/service"
import { DraftSystem } from "@/lib/draft-system"
import { generateRoundRobinSchedule } from "./schedule-generator"
import { generatePlayoffRound1Only } from "./playoff-bracket-generator"
import { generateMockResult, type ResultStrategy } from "./mock-result-generator"
import { updateStandingsFromMatches } from "./standings-updater"

const MOCK_SEASON_NAME = "Mock Draft Demo"

export interface SimulationConfig {
  team_count?: number
  weeks?: number
  playoff_format?: "top4" | "top8"
  result_strategy?: ResultStrategy
}

export interface SimulationStatus {
  season_id: string | null
  season_name: string | null
  has_teams: boolean
  team_count: number
  has_draft_pool: boolean
  draft_completed: boolean
  match_count: number
  completed_match_count: number
  playoff_match_count: number
  last_run: { id: string; status: string; completed_at: string } | null
}

export async function getSimulationStatus(
  seasonName: string = MOCK_SEASON_NAME
): Promise<SimulationStatus> {
  const supabase = createServiceRoleClient()

  const { data: season } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("name", seasonName)
    .maybeSingle()

  if (!season) {
    return {
      season_id: null,
      season_name: null,
      has_teams: false,
      team_count: 0,
      has_draft_pool: false,
      draft_completed: false,
      match_count: 0,
      completed_match_count: 0,
      playoff_match_count: 0,
      last_run: null,
    }
  }

  const { count: teamCount } = await supabase
    .from("teams")
    .select("id", { count: "exact", head: true })
    .eq("season_id", season.id)

  const { count: poolCount } = await supabase
    .from("draft_pool")
    .select("id", { count: "exact", head: true })
    .eq("season_id", season.id)

  const { data: session } = await supabase
    .from("draft_sessions")
    .select("status")
    .eq("season_id", season.id)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: matches } = await supabase
    .from("matches")
    .select("id, status, is_playoff")
    .eq("season_id", season.id)

  const matchCount = matches?.length ?? 0
  const completedCount = matches?.filter((m) => m.status === "completed").length ?? 0
  const playoffCount = matches?.filter((m) => m.is_playoff).length ?? 0

  const { data: lastRun } = await supabase
    .from("simulation_runs")
    .select("id, status, completed_at")
    .eq("season_id", season.id)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    season_id: season.id,
    season_name: season.name,
    has_teams: (teamCount ?? 0) > 0,
    team_count: teamCount ?? 0,
    has_draft_pool: (poolCount ?? 0) > 0,
    draft_completed: session?.status === "completed",
    match_count: matchCount,
    completed_match_count: completedCount,
    playoff_match_count: playoffCount,
    last_run: lastRun
      ? { id: lastRun.id, status: lastRun.status, completed_at: lastRun.completed_at ?? "" }
      : null,
  }
}

export async function recordSimulationRun(
  seasonId: string,
  status: string,
  config: SimulationConfig = {},
  errorMessage?: string
): Promise<string> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("simulation_runs")
    .insert({
      season_id: seasonId,
      status,
      config,
      error_message: errorMessage,
      completed_at: status === "completed" || status === "failed" ? new Date().toISOString() : null,
    })
    .select("id")
    .single()

  if (error) throw new Error(`Failed to record run: ${error.message}`)
  return data.id
}

export async function updateSimulationRun(
  runId: string,
  updates: { status?: string; completed_at?: string; error_message?: string }
): Promise<void> {
  const supabase = createServiceRoleClient()
  await supabase.from("simulation_runs").update(updates).eq("id", runId)
}
