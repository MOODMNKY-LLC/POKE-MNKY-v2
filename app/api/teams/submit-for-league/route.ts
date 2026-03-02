/**
 * POST /api/teams/submit-for-league
 * Flag a user-owned showdown team for league submission.
 * Body: { showdown_team_id: string, submission_notes?: string }
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const showdownTeamId = body.showdown_team_id as string | undefined
    const submissionNotes = body.submission_notes as string | undefined

    if (!showdownTeamId) {
      return NextResponse.json(
        { error: "showdown_team_id is required" },
        { status: 400 }
      )
    }

    const serviceSupabase = createServiceRoleClient()

    const { data: team, error: fetchError } = await serviceSupabase
      .from("showdown_teams")
      .select("id, coach_id, deleted_at")
      .eq("id", showdownTeamId)
      .single()

    if (fetchError || !team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 })
    }

    if (team.deleted_at) {
      return NextResponse.json(
        { error: "Cannot submit a deleted team" },
        { status: 400 }
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
        { error: "You can only submit teams you own" },
        { status: 403 }
      )
    }

    const { data: updated, error: updateError } = await serviceSupabase
      .from("showdown_teams")
      .update({
        submitted_for_league_at: new Date().toISOString(),
        submission_notes: submissionNotes ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", showdownTeamId)
      .select("id, submitted_for_league_at, submission_notes")
      .single()

    if (updateError) {
      console.error("[Submit for league] Update error:", updateError)
      return NextResponse.json(
        { error: updateError.message || "Failed to submit team" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      team: updated,
      message: "Team submitted for league",
    })
  } catch (err: unknown) {
    console.error("[Submit for league] Error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
