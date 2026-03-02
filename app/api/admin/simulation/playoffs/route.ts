/**
 * POST /api/admin/simulation/playoffs
 * Generates playoff bracket and matches from standings
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { generatePlayoffRound1Only } from "@/lib/league-simulation/playoff-bracket-generator"
import { recordSimulationRun } from "@/lib/league-simulation/simulation-engine"

const MOCK_SEASON_NAME = "Mock Draft Demo"

export async function POST(request: NextRequest) {
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

    const body = await request.json().catch(() => ({}))
    const topN = typeof body.top_n === "number" ? body.top_n : 4

    const admin = createServiceRoleClient()

    const { data: season } = await admin
      .from("seasons")
      .select("id")
      .eq("name", MOCK_SEASON_NAME)
      .maybeSingle()

    if (!season) {
      return NextResponse.json(
        { error: "Mock season not found. Run seed first." },
        { status: 404 }
      )
    }

    const { data: teams } = await admin
      .from("teams")
      .select("id, wins, losses, differential")
      .eq("season_id", season.id)

    if (!teams || teams.length < 2) {
      return NextResponse.json(
        { error: "Need at least 2 teams with standings." },
        { status: 400 }
      )
    }

    const standings = teams.map((t) => ({
      team_id: t.id,
      wins: t.wins ?? 0,
      losses: t.losses ?? 0,
      differential: t.differential ?? 0,
    }))

    const { data: playoffMatchweek } = await admin
      .from("matchweeks")
      .select("id")
      .eq("season_id", season.id)
      .eq("is_playoff", true)
      .eq("week_number", 11)
      .maybeSingle()

    const playoffMatches = generatePlayoffRound1Only(standings, {
      topN: Math.min(topN, standings.length),
      baseWeek: 11,
      matchweek_id: playoffMatchweek?.id,
    })

    const inserted: string[] = []
    for (const m of playoffMatches) {
      const { data: match, error } = await admin
        .from("matches")
        .insert({
          season_id: season.id,
          week: m.week,
          matchweek_id: m.matchweek_id ?? null,
          team1_id: m.team1_id,
          team2_id: m.team2_id,
          is_playoff: true,
          playoff_round: m.playoff_round,
          status: "scheduled",
        })
        .select("id")
        .single()

      if (!error && match) inserted.push(match.id)
    }

    await recordSimulationRun(season.id, "playoffs", { playoff_format: `top${topN}` })

    return NextResponse.json({
      success: true,
      matchesCreated: inserted.length,
      matchIds: inserted,
    })
  } catch (err) {
    console.error("[simulation/playoffs]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
