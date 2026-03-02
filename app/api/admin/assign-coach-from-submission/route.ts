/**
 * POST /api/admin/assign-coach-from-submission
 * Assign a coach to a league team and link their submitted showdown team.
 * Body: { user_id: string, showdown_team_id: string, league_team_id: string }
 * Auth: admin or commissioner.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { assignCoachToTeam } from "@/lib/coach-assignment"
import { syncAppRoleToDiscord } from "@/lib/discord-role-sync"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const serviceSupabase = createServiceRoleClient()
    const { data: profile } = await serviceSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "admin" && profile?.role !== "commissioner") {
      return NextResponse.json(
        { error: "Forbidden - Admin or Commissioner required" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const userId = body.user_id as string | undefined
    const showdownTeamId = body.showdown_team_id as string | undefined
    const leagueTeamId = body.league_team_id as string | undefined

    if (!userId || !showdownTeamId || !leagueTeamId) {
      return NextResponse.json(
        {
          error:
            "user_id, showdown_team_id, and league_team_id are required",
        },
        { status: 400 }
      )
    }

    const { data: showdownTeam, error: stError } = await serviceSupabase
      .from("showdown_teams")
      .select("id, coach_id, submitted_for_league_at")
      .eq("id", showdownTeamId)
      .single()

    if (stError || !showdownTeam) {
      return NextResponse.json(
        { error: "Submitted team not found" },
        { status: 404 }
      )
    }

    if (!showdownTeam.submitted_for_league_at) {
      return NextResponse.json(
        { error: "Team is not submitted for league" },
        { status: 400 }
      )
    }

    const { data: coach } = await serviceSupabase
      .from("coaches")
      .select("user_id")
      .eq("id", showdownTeam.coach_id)
      .single()

    if (!coach || coach.user_id !== userId) {
      return NextResponse.json(
        { error: "Submitted team is not owned by this user" },
        { status: 403 }
      )
    }

    const result = await assignCoachToTeam(userId, leagueTeamId)
    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 500 }
      )
    }

    await serviceSupabase
      .from("showdown_teams")
      .update({
        team_id: leagueTeamId,
        submitted_for_league_at: null,
        submission_notes: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", showdownTeamId)

    const { data: targetProfile } = await serviceSupabase
      .from("profiles")
      .select("discord_id")
      .eq("id", userId)
      .single()

    let discordSynced = false
    if (
      targetProfile?.discord_id &&
      process.env.DISCORD_BOT_TOKEN &&
      process.env.DISCORD_GUILD_ID
    ) {
      try {
        const syncResult = await syncAppRoleToDiscord(
          targetProfile.discord_id,
          "coach",
          userId
        )
        discordSynced = syncResult.success
      } catch {
        // non-fatal
      }
    }

    return NextResponse.json({
      success: true,
      message: "Coach assigned and submission linked",
      coachId: result.coachId,
      teamId: result.teamId,
      discordRoleSynced: discordSynced,
    })
  } catch (err: unknown) {
    console.error("[Assign coach from submission] Error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
