/**
 * POST /api/coach/claim-team
 * Self-service: assign authenticated user to an explicit open team slot.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { assignCoachToTeam } from "@/lib/coach-assignment"
import { resolveCoachTeamForSeason } from "@/lib/coach-team-context"
import { syncAppRoleToDiscord } from "@/lib/discord-role-sync"

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
    const { teamId } = body as { teamId?: string }

    if (!teamId || typeof teamId !== "string") {
      return NextResponse.json(
        { error: "teamId is required — pick a specific league team" },
        { status: 400 }
      )
    }

    const service = createServiceRoleClient()

    const { data: profile } = await service
      .from("profiles")
      .select("id, role, discord_id, display_name")
      .eq("id", user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    const { data: team, error: teamError } = await service
      .from("teams")
      .select("id, name, season_id, coach_id")
      .eq("id", teamId)
      .single()

    if (teamError || !team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 })
    }

    if (team.coach_id) {
      return NextResponse.json(
        { error: "That team is already assigned to another coach" },
        { status: 409 }
      )
    }

    if (team.season_id) {
      const { team: existing } = await resolveCoachTeamForSeason(
        service,
        user.id,
        team.season_id
      )
      if (existing && existing.id !== teamId) {
        return NextResponse.json(
          {
            error:
              "You already have a team in this season. Release it first (Dashboard → Your teams), then claim the correct slot.",
            currentTeamId: existing.id,
            currentTeamName: existing.name,
          },
          { status: 409 }
        )
      }
    }

    if (profile.role !== "coach" && profile.role !== "admin" && profile.role !== "commissioner") {
      const { error: roleError } = await service
        .from("profiles")
        .update({ role: "coach" })
        .eq("id", user.id)

      if (roleError) {
        return NextResponse.json(
          { error: `Failed to set coach role: ${roleError.message}` },
          { status: 500 }
        )
      }
    }

    const result = await assignCoachToTeam(user.id, teamId)

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 500 })
    }

    let discordSynced = false
    if (profile.discord_id && process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_GUILD_ID) {
      try {
        const syncResult = await syncAppRoleToDiscord(profile.discord_id, "coach", user.id)
        discordSynced = syncResult.success
      } catch {
        discordSynced = false
      }
    }

    await service.from("user_activity_log").insert({
      user_id: user.id,
      action: "coach_claimed_team",
      resource_type: "team",
      resource_id: teamId,
      metadata: {
        team_name: team.name,
        season_id: team.season_id,
      },
    })

    return NextResponse.json({
      success: true,
      message: result.message,
      teamId: result.teamId ?? teamId,
      team: { id: team.id, name: team.name },
      discordRoleSynced: discordSynced,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
