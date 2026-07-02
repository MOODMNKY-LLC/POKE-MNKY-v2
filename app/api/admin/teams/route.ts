/**
 * GET  /api/admin/teams — list league teams for a season
 * POST /api/admin/teams — create a league team in a season
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { requireAdminOrCommissioner } from "@/lib/admin-api-auth"
import { createLeagueTeam } from "@/lib/league-season-setup"
import { logActivity } from "@/lib/rbac"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const gate = await requireAdminOrCommissioner(user.id)
    if ("error" in gate) {
      return NextResponse.json({ error: gate.error }, { status: gate.status })
    }

    const { searchParams } = new URL(request.url)
    let seasonId = searchParams.get("season_id")

    const service = createServiceRoleClient()
    if (!seasonId) {
      const { data: season } = await service
        .from("seasons")
        .select("id")
        .eq("is_current", true)
        .maybeSingle()
      seasonId = season?.id ?? null
    }
    if (!seasonId) {
      return NextResponse.json({ success: true, teams: [], season: null })
    }

    const { data: seasonRow } = await service
      .from("seasons")
      .select("id, name, conference_count, division_count, team_slot_count")
      .eq("id", seasonId)
      .single()

    const { data: teams, error } = await service
      .from("teams")
      .select(
        "id, name, team_number, coach_name, coach_id, season_id, division, conference, division_id, is_active, claimable, wins, losses, logo_url, avatar_url"
      )
      .eq("season_id", seasonId)
      .order("team_number", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const teamRows = teams

    const coachIds = [...new Set((teamRows ?? []).map((t) => t.coach_id).filter(Boolean))]
    let coachProfiles: Record<string, { display_name: string | null; username: string | null }> =
      {}

    if (coachIds.length > 0) {
      const { data: coaches } = await service
        .from("coaches")
        .select("id, user_id, display_name")
        .in("id", coachIds as string[])

      const userIds = (coaches ?? []).map((c) => c.user_id).filter(Boolean)
      if (userIds.length > 0) {
        const { data: profiles } = await service
          .from("profiles")
          .select("id, display_name, username")
          .in("id", userIds as string[])

        const profileByUser = new Map((profiles ?? []).map((p) => [p.id, p]))
        for (const coach of coaches ?? []) {
          if (coach.user_id && profileByUser.has(coach.user_id)) {
            coachProfiles[coach.id] = profileByUser.get(coach.user_id)!
          } else {
            coachProfiles[coach.id] = {
              display_name: coach.display_name,
              username: null,
            }
          }
        }
      }
    }

    const enriched = (teamRows ?? []).map((t) => ({
      ...t,
      coach_profile: t.coach_id ? coachProfiles[t.coach_id as string] ?? null : null,
    }))

    return NextResponse.json({
      success: true,
      season: seasonRow,
      teams: enriched,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const gate = await requireAdminOrCommissioner(user.id)
    if ("error" in gate) {
      return NextResponse.json({ error: gate.error }, { status: gate.status })
    }

    const body = await request.json().catch(() => ({}))
    const seasonId = typeof body?.season_id === "string" ? body.season_id : null
    const name = typeof body?.name === "string" ? body.name.trim() : null
    const teamNumber = typeof body?.team_number === "number" ? body.team_number : undefined
    const isActive = body?.is_active !== false
    const claimable = body?.claimable !== false

    if (!seasonId || !name) {
      return NextResponse.json(
        { error: "season_id and name are required" },
        { status: 400 }
      )
    }

    const service = createServiceRoleClient()
    const team = await createLeagueTeam(service, {
      seasonId,
      name,
      teamNumber,
      isActive,
      claimable,
    })

    await logActivity(supabase, user.id, "admin_created_league_team", {
      resource_type: "team",
      resource_id: team.id,
      season_id: seasonId,
      team_name: name,
    })

    return NextResponse.json({ success: true, team })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
