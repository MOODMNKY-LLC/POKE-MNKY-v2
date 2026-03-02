/**
 * POST /api/admin/simulation/reset
 * Resets mock season: draft pool, picks, matches, standings
 */

import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { recordSimulationRun } from "@/lib/league-simulation/simulation-engine"

const MOCK_SEASON_NAME = "Mock Draft Demo"

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

    const { data: season } = await admin
      .from("seasons")
      .select("id")
      .eq("name", MOCK_SEASON_NAME)
      .maybeSingle()

    if (!season) {
      return NextResponse.json({
        success: true,
        message: "Mock season not found; nothing to reset",
      })
    }

    const seasonId = season.id

    await admin
      .from("draft_sessions")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("season_id", seasonId)
      .in("status", ["active", "paused"])

    await admin
      .from("draft_pool")
      .update({
        status: "available",
        drafted_by_team_id: null,
        drafted_at: null,
        draft_round: null,
        draft_pick_number: null,
        updated_at: new Date().toISOString(),
      })
      .eq("season_id", seasonId)
      .eq("status", "drafted")

    await admin
      .from("draft_budgets")
      .update({ spent_points: 0 })
      .eq("season_id", seasonId)

    const { data: teamIds } = await admin
      .from("teams")
      .select("id")
      .eq("season_id", seasonId)

    for (const t of teamIds ?? []) {
      await admin
        .from("teams")
        .update({
          wins: 0,
          losses: 0,
          differential: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", t.id)
    }

    await admin
      .from("team_rosters")
      .delete()
      .in("team_id", (teamIds ?? []).map((t) => t.id))

    await admin
      .from("matches")
      .delete()
      .eq("season_id", seasonId)

    await recordSimulationRun(seasonId, "reset", {})

    return NextResponse.json({
      success: true,
      message: "Mock season reset complete. Run seed to prepare for a new simulation.",
    })
  } catch (err) {
    console.error("[simulation/reset]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
