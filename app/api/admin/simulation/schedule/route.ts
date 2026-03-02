/**
 * POST /api/admin/simulation/schedule
 * Generates and inserts matches for regular season
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { generateRoundRobinSchedule } from "@/lib/league-simulation/schedule-generator"
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
    const weeks = typeof body.weeks === "number" ? body.weeks : 10

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
      .select("id")
      .eq("season_id", season.id)

    if (!teams || teams.length < 2) {
      return NextResponse.json(
        { error: "Need at least 2 teams. Run seed first." },
        { status: 400 }
      )
    }

    const { data: matchweeks } = await admin
      .from("matchweeks")
      .select("id, week_number")
      .eq("season_id", season.id)
      .eq("is_playoff", false)

    const matchweekIdsByWeek: Record<number, string> = {}
    for (const mw of matchweeks ?? []) {
      matchweekIdsByWeek[mw.week_number] = mw.id
    }

    const schedule = generateRoundRobinSchedule({
      teamIds: teams.map((t) => t.id),
      weeks,
      matchweekIdsByWeek,
    })

    const inserted: string[] = []
    for (const m of schedule) {
      const { data: match, error } = await admin
        .from("matches")
        .insert({
          season_id: season.id,
          week: m.week,
          matchweek_id: m.matchweek_id ?? null,
          team1_id: m.team1_id,
          team2_id: m.team2_id,
          is_playoff: false,
          status: "scheduled",
        })
        .select("id")
        .single()

      if (!error && match) inserted.push(match.id)
    }

    await recordSimulationRun(season.id, "regular_season", { weeks })

    return NextResponse.json({
      success: true,
      matchesCreated: inserted.length,
      matchIds: inserted,
    })
  } catch (err) {
    console.error("[simulation/schedule]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
