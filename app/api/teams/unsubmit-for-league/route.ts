/**
 * POST /api/teams/unsubmit-for-league
 * Remove league submission flag from a user-owned showdown team.
 * Body: { showdown_team_id: string }
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const showdownTeamId = body.showdown_team_id as string | undefined

    if (!showdownTeamId) {
      return NextResponse.json(
        { error: "showdown_team_id is required" },
        { status: 400 }
      )
    }

    const serviceSupabase = createServiceRoleClient()

    const { data: team, error: fetchError } = await serviceSupabase
      .from("showdown_teams")
      .select("id, coach_id")
      .eq("id", showdownTeamId)
      .single()

    if (fetchError || !team) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      )
    }

    if (!team.coach_id) {
      return NextResponse.json(
        { error: "Team has no owner" },
        { status: 403 }
      )
    }

    const { data: coach } = await serviceSupabase
      .from("coaches")
      .select("user_id")
      .eq("id", team.coach_id)
      .single()

    if (!coach || coach.user_id !== user.id) {
      return NextResponse.json(
        { error: "You can only unsubmit teams you own" },
        { status: 403 }
      )
    }

    const { error: updateError } = await serviceSupabase
      .from("showdown_teams")
      .update({
        submitted_for_league_at: null,
        submission_notes: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", showdownTeamId)

    if (updateError) {
      console.error("[Unsubmit for league] Update error:", updateError)
      return NextResponse.json(
        { error: updateError.message || "Failed to unsubmit team" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Team unsubmitted from league",
    })
  } catch (err: unknown) {
    console.error("[Unsubmit for league] Error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
