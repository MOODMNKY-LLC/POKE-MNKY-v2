/**
 * POST /api/admin/simulation/run-results
 * Simulates results for a week or all pending matches
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { generateMockResult, type ResultStrategy } from "@/lib/league-simulation/mock-result-generator"
import { updateStandingsFromMatches } from "@/lib/league-simulation/standings-updater"
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
    const week = typeof body.week === "number" ? body.week : undefined
    const strategy: ResultStrategy = body.result_strategy ?? "random"

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

    let query = admin
      .from("matches")
      .select("id, team1_id, team2_id")
      .eq("season_id", season.id)
      .eq("status", "scheduled")

    if (week !== undefined) {
      query = query.eq("week", week)
    }

    const { data: matches } = await query

    if (!matches || matches.length === 0) {
      return NextResponse.json({
        success: true,
        updated: 0,
        message: "No scheduled matches to simulate",
      })
    }

    let updated = 0
    for (const m of matches) {
      const result = generateMockResult(m.team1_id, m.team2_id, strategy)
      const { error } = await admin
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

      if (!error) updated++
    }

    await updateStandingsFromMatches(admin, season.id)
    await recordSimulationRun(season.id, "regular_season", { result_strategy: strategy })

    return NextResponse.json({
      success: true,
      updated,
      total: matches.length,
    })
  } catch (err) {
    console.error("[simulation/run-results]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
