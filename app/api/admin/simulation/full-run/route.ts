/**
 * POST /api/admin/simulation/full-run
 * One-shot: seed → draft → schedule → run results → playoffs
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { DraftSystem } from "@/lib/draft-system"
import { generateRoundRobinSchedule } from "@/lib/league-simulation/schedule-generator"
import { generatePlayoffRound1Only } from "@/lib/league-simulation/playoff-bracket-generator"
import { generateMockResult, type ResultStrategy } from "@/lib/league-simulation/mock-result-generator"
import { updateStandingsFromMatches } from "@/lib/league-simulation/standings-updater"
import { recordSimulationRun, updateSimulationRun } from "@/lib/league-simulation/simulation-engine"

const MOCK_SEASON_NAME = "Mock Draft Demo"

function isSimulationApiKeyValid(request: NextRequest): boolean {
  const key =
    request.headers.get("X-Simulation-API-Key")?.trim() ||
    request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "").trim()
  const expected = process.env.SIMULATION_API_KEY?.trim()
  return !!expected && !!key && key === expected
}

export async function POST(request: NextRequest) {
  try {
    const apiKeyValid = isSimulationApiKeyValid(request)
    if (!apiKeyValid) {
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
    }

    const body = await request.json().catch(() => ({}))
    const config = {
      weeks: typeof body.weeks === "number" ? body.weeks : 10,
      result_strategy: (body.result_strategy as ResultStrategy) ?? "random",
      top_n: typeof body.top_n === "number" ? body.top_n : 4,
    }

    const admin = createServiceRoleClient()
    const draftSystem = new DraftSystem()

    let seasonId: string
    const { data: existingSeason } = await admin
      .from("seasons")
      .select("id")
      .eq("name", MOCK_SEASON_NAME)
      .maybeSingle()

    if (existingSeason) {
      seasonId = existingSeason.id
    } else {
      const { data: created } = await admin
        .from("seasons")
        .insert({
          name: MOCK_SEASON_NAME,
          is_current: false,
          start_date: new Date().toISOString().slice(0, 10),
          end_date: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        })
        .select("id")
        .single()
      if (!created) throw new Error("Failed to create season")
      seasonId = created.id
    }

    const runId = await recordSimulationRun(seasonId, "drafting", config)

    const { data: teams } = await admin
      .from("teams")
      .select("id")
      .eq("season_id", seasonId)

    let teamIds = (teams ?? []).map((t: { id: string }) => t.id)
    if (teamIds.length < 2) {
      const names = ["Mock Draft Team A", "Mock Draft Team B", "Mock Draft Team C"]
      for (const name of names) {
        const { data: t } = await admin
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
        if (t) teamIds.push(t.id)
      }
      await admin.from("draft_budgets").upsert(
        teamIds.map((tid) => ({
          team_id: tid,
          season_id: seasonId,
          total_points: 120,
          spent_points: 0,
        })),
        { onConflict: "team_id,season_id" }
      )
    }

    const { data: poolRows } = await admin
      .from("draft_pool")
      .select("id")
      .eq("season_id", seasonId)
      .limit(1)
    if (!poolRows?.length) {
      const fallback = [
        { pokemon_name: "pikachu", point_value: 12 },
        { pokemon_name: "charizard", point_value: 19 },
        { pokemon_name: "blastoise", point_value: 18 },
        { pokemon_name: "venusaur", point_value: 18 },
        { pokemon_name: "garchomp", point_value: 19 },
      ]
      await admin.from("draft_pool").insert(
        fallback.map((p) => ({
          season_id: seasonId,
          pokemon_name: p.pokemon_name,
          point_value: p.point_value,
          status: "available",
        }))
      )
    }

    for (let w = 1; w <= 14; w++) {
      await admin.from("matchweeks").upsert(
        {
          season_id: seasonId,
          week_number: w,
          start_date: new Date(Date.now() + (w - 1) * 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          end_date: new Date(Date.now() + (w - 1) * 7 * 24 * 60 * 60 * 1000 + 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          is_playoff: w >= 11,
        },
        { onConflict: "season_id,week_number" }
      )
    }

    let session = await draftSystem.getActiveSession(seasonId)
    if (!session) {
      session = await draftSystem.createSession(seasonId, teamIds, { draftType: "snake" })
    }
    let pickCount = 0
    while (session.status !== "completed") {
      const turn = await draftSystem.getCurrentTurn(session.id)
      if (!turn) break
      const { data: budget } = await admin
        .from("draft_budgets")
        .select("remaining_points")
        .eq("team_id", turn.teamId)
        .eq("season_id", seasonId)
        .single()
      if ((budget?.remaining_points ?? 0) <= 0) break
      const { data: avail } = await admin
        .from("draft_pool")
        .select("pokemon_name, point_value")
        .eq("season_id", seasonId)
        .or("status.eq.available,status.is.null")
        .lte("point_value", budget?.remaining_points ?? 0)
        .order("point_value", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!avail) break
      const res = await draftSystem.makePick(session.id, turn.teamId, avail.pokemon_name)
      if (!res.success) break
      pickCount++
      const { data: upd } = await admin.from("draft_sessions").select("status").eq("id", session.id).single()
      session = { ...session, status: (upd?.status as string) ?? session.status }
    }

    const { data: mw } = await admin
      .from("matchweeks")
      .select("id, week_number")
      .eq("season_id", seasonId)
      .eq("is_playoff", false)
    const mwByWeek: Record<number, string> = {}
    for (const m of mw ?? []) mwByWeek[m.week_number] = m.id

    const schedule = generateRoundRobinSchedule({
      teamIds,
      weeks: config.weeks,
      matchweekIdsByWeek: mwByWeek,
    })

    const matchIds: string[] = []
    for (const m of schedule) {
      const { data: match } = await admin
        .from("matches")
        .insert({
          season_id: seasonId,
          week: m.week,
          matchweek_id: m.matchweek_id ?? null,
          team1_id: m.team1_id,
          team2_id: m.team2_id,
          is_playoff: false,
          status: "scheduled",
        })
        .select("id")
        .single()
      if (match) matchIds.push(match.id)
    }

    const { data: scheduledMatches } = await admin
      .from("matches")
      .select("id, team1_id, team2_id")
      .eq("season_id", seasonId)
      .eq("status", "scheduled")
      .eq("is_playoff", false)

    for (const m of scheduledMatches ?? []) {
      const result = generateMockResult(m.team1_id, m.team2_id, config.result_strategy)
      await admin
        .from("matches")
        .update({
          winner_id: result.winner_id,
          team1_score: result.team1_score,
          team2_score: result.team2_score,
          differential: result.differential,
          status: "completed",
          played_at: new Date().toISOString(),
        })
        .eq("id", m.id)
    }

    await updateStandingsFromMatches(admin, seasonId)

    const { data: teamsWithStandings } = await admin
      .from("teams")
      .select("id, wins, losses, differential")
      .eq("season_id", seasonId)

    const standings = (teamsWithStandings ?? []).map((t) => ({
      team_id: t.id,
      wins: t.wins ?? 0,
      losses: t.losses ?? 0,
      differential: t.differential ?? 0,
    }))

    const { data: pmw } = await admin
      .from("matchweeks")
      .select("id")
      .eq("season_id", seasonId)
      .eq("is_playoff", true)
      .eq("week_number", 11)
      .maybeSingle()

    const playoffMatches = generatePlayoffRound1Only(standings, {
      topN: Math.min(config.top_n, standings.length),
      baseWeek: 11,
      matchweek_id: pmw?.id,
    })

    for (const m of playoffMatches) {
      await admin.from("matches").insert({
        season_id: seasonId,
        week: m.week,
        matchweek_id: m.matchweek_id ?? null,
        team1_id: m.team1_id,
        team2_id: m.team2_id,
        is_playoff: true,
        playoff_round: m.playoff_round,
        status: "scheduled",
      })
    }

    await updateSimulationRun(runId, {
      status: "completed",
      completed_at: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      runId,
      seasonId,
      picksMade: pickCount,
      matchesCreated: matchIds.length,
      playoffMatchesCreated: playoffMatches.length,
      message: "Full simulation completed",
    })
  } catch (err) {
    console.error("[simulation/full-run]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
