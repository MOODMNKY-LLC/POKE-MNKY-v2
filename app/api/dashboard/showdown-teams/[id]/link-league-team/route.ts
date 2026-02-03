import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { getCurrentUserProfile } from "@/lib/rbac"

/**
 * POST /api/dashboard/showdown-teams/[id]/link-league-team
 * Link a Showdown team to the current coach's league team (or unlink).
 * Body: { unlink?: boolean }
 * Coach only; only the owner of the Showdown team can link/unlink.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const profile = await getCurrentUserProfile(supabase)
    if (!profile || profile.role !== "coach" || !profile.team_id) {
      return NextResponse.json(
        { error: "Only coaches with a league team can link Showdown teams" },
        { status: 403 }
      )
    }

    const { id: showdownTeamId } = await params
    if (!showdownTeamId) {
      return NextResponse.json({ error: "Team ID required" }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const unlink = Boolean(body?.unlink)

    const serviceSupabase = createServiceRoleClient()

    // Resolve coach id for current user
    const { data: coach } = await serviceSupabase
      .from("coaches")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (!coach) {
      return NextResponse.json({ error: "Coach record not found" }, { status: 404 })
    }

    // Verify ownership: Showdown team must belong to this coach
    const { data: team, error: fetchError } = await serviceSupabase
      .from("showdown_teams")
      .select("id, coach_id, team_id")
      .eq("id", showdownTeamId)
      .is("deleted_at", null)
      .single()

    if (fetchError || !team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 })
    }

    if (team.coach_id !== coach.id) {
      return NextResponse.json(
        { error: "You can only link or unlink your own Showdown teams" },
        { status: 403 }
      )
    }

    const newLeagueTeamId = unlink ? null : profile.team_id

    const { data: updated, error: updateError } = await serviceSupabase
      .from("showdown_teams")
      .update({ team_id: newLeagueTeamId })
      .eq("id", showdownTeamId)
      .eq("coach_id", coach.id)
      .select()
      .single()

    if (updateError) {
      console.error("[link-league-team] Update error:", updateError)
      return NextResponse.json(
        { error: updateError.message || "Failed to update team" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      team: updated,
      linked: !unlink,
    })
  } catch (error: unknown) {
    console.error("[link-league-team] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
