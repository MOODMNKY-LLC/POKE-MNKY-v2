import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { requireAdminOrCommissioner } from "@/lib/admin-api-auth"
import {
  finalizeMatchAfterInsert,
  resolveCurrentSeasonId,
} from "@/lib/match-result-complete"

async function requireAdminMatchesActor(request: NextRequest) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  const gate = await requireAdminOrCommissioner(user.id)
  if ("error" in gate) {
    return {
      error: NextResponse.json({ error: gate.error }, { status: gate.status }),
    }
  }

  return { user, service: createServiceRoleClient() }
}

async function resolveSeasonIdParam(
  service: ReturnType<typeof createServiceRoleClient>,
  seasonIdParam: string | null
): Promise<string | null> {
  if (seasonIdParam) return seasonIdParam
  return resolveCurrentSeasonId(service)
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminMatchesActor(request)
    if ("error" in auth && auth.error) return auth.error
    const { service } = auth as { service: ReturnType<typeof createServiceRoleClient> }

    const searchParams = request.nextUrl.searchParams
    const week = searchParams.get("week")
    const status = searchParams.get("status")
    const teamId = searchParams.get("team_id")
    const isPlayoff = searchParams.get("is_playoff")
    const limit = parseInt(searchParams.get("limit") || "500", 10)
    const offset = parseInt(searchParams.get("offset") || "0", 10)
    const seasonId = await resolveSeasonIdParam(service, searchParams.get("season_id"))

    if (!seasonId) {
      return NextResponse.json({
        season: null,
        matches: [],
        pagination: { total: 0, limit, offset, hasMore: false },
      })
    }

    const { data: seasonRow } = await service
      .from("seasons")
      .select("id, name, is_current, regular_season_weeks, playoff_weeks")
      .eq("id", seasonId)
      .maybeSingle()

    let query = service
      .from("matches")
      .select(
        `
        *,
        team1:teams!matches_team1_id_fkey(id, name, coach_name, division, conference),
        team2:teams!matches_team2_id_fkey(id, name, coach_name, division, conference),
        winner:teams!matches_winner_id_fkey(id, name)
        `,
        { count: "exact" }
      )
      .eq("season_id", seasonId)

    if (week) {
      query = query.eq("week", parseInt(week, 10))
    }

    if (status) {
      query = query.eq("status", status)
    }

    if (teamId) {
      query = query.or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`)
    }

    if (isPlayoff !== null && isPlayoff !== "all") {
      query = query.eq("is_playoff", isPlayoff === "true")
    }

    const { data: matches, error, count } = await query
      .order("week", { ascending: true })
      .order("is_playoff", { ascending: true })
      .order("created_at", { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return NextResponse.json({
      season: seasonRow,
      matches: matches || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    })
  } catch (error: unknown) {
    console.error("Error fetching matches:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch matches" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminMatchesActor(request)
    if ("error" in auth && auth.error) return auth.error
    const { user, service } = auth as {
      user: { id: string }
      service: ReturnType<typeof createServiceRoleClient>
    }

    const body = await request.json()
    const {
      week,
      team1_id,
      team2_id,
      season_id,
      scheduled_time,
      is_playoff = false,
      playoff_round,
      status = "scheduled",
    } = body

    if (!week || !team1_id || !team2_id) {
      return NextResponse.json(
        { error: "week, team1_id, and team2_id are required" },
        { status: 400 }
      )
    }

    if (team1_id === team2_id) {
      return NextResponse.json(
        { error: "Team 1 and Team 2 must be different" },
        { status: 400 }
      )
    }

    let resolvedSeasonId =
      typeof season_id === "string" && season_id
        ? season_id
        : await resolveSeasonIdParam(service, null)

    if (!resolvedSeasonId) {
      const { data: teamRow } = await service
        .from("teams")
        .select("season_id")
        .eq("id", team1_id)
        .maybeSingle()
      resolvedSeasonId = teamRow?.season_id ?? null
    }

    if (!resolvedSeasonId) {
      return NextResponse.json(
        { error: "season_id is required when no current season is set" },
        { status: 400 }
      )
    }

    let matchweekId: string | null = null
    if (!is_playoff) {
      const { data: matchweek } = await service
        .from("matchweeks")
        .select("id")
        .eq("season_id", resolvedSeasonId)
        .eq("week_number", week)
        .eq("is_playoff", false)
        .maybeSingle()
      matchweekId = matchweek?.id ?? null
    }

    const { data: match, error } = await service
      .from("matches")
      .insert({
        season_id: resolvedSeasonId,
        week,
        team1_id,
        team2_id,
        matchweek_id: matchweekId,
        scheduled_time: scheduled_time || null,
        is_playoff,
        playoff_round: playoff_round || null,
        status,
      })
      .select(
        `
        *,
        team1:teams!matches_team1_id_fkey(id, name, coach_name),
        team2:teams!matches_team2_id_fkey(id, name, coach_name)
        `
      )
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      match,
      message: "Match created successfully",
    })
  } catch (error: unknown) {
    console.error("Error creating match:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create match" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdminMatchesActor(request)
    if ("error" in auth && auth.error) return auth.error
    const { user, service } = auth as {
      user: { id: string }
      service: ReturnType<typeof createServiceRoleClient>
    }

    const body = await request.json()
    const {
      id,
      week,
      team1_id,
      team2_id,
      winner_id,
      team1_score,
      team2_score,
      differential,
      scheduled_time,
      played_at,
      status,
      is_playoff,
      playoff_round,
      replay_url,
    } = body

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (week !== undefined) updateData.week = week
    if (team1_id !== undefined) updateData.team1_id = team1_id
    if (team2_id !== undefined) updateData.team2_id = team2_id
    if (winner_id !== undefined) updateData.winner_id = winner_id
    if (team1_score !== undefined) updateData.team1_score = team1_score
    if (team2_score !== undefined) updateData.team2_score = team2_score
    if (differential !== undefined) updateData.differential = differential
    if (scheduled_time !== undefined) updateData.scheduled_time = scheduled_time
    if (played_at !== undefined) updateData.played_at = played_at
    if (status !== undefined) updateData.status = status
    if (is_playoff !== undefined) updateData.is_playoff = is_playoff
    if (playoff_round !== undefined) updateData.playoff_round = playoff_round
    if (replay_url !== undefined) updateData.replay_url = replay_url

    const { data: match, error } = await service
      .from("matches")
      .update(updateData)
      .eq("id", id)
      .select(
        `
        *,
        team1:teams!matches_team1_id_fkey(id, name, coach_name),
        team2:teams!matches_team2_id_fkey(id, name, coach_name),
        winner:teams!matches_winner_id_fkey(id, name)
        `
      )
      .single()

    if (error) throw error

    if (status === "completed" && match) {
      const seasonId =
        match.season_id ?? (await resolveCurrentSeasonId(service))
      if (seasonId) {
        const sideEffects = await finalizeMatchAfterInsert(
          match.id,
          seasonId,
          user.id
        )
        return NextResponse.json({
          success: true,
          match,
          message: "Match updated successfully",
          standings_updated: sideEffects.standings_updated,
          discord_notified: sideEffects.discord_notified,
        })
      }
    }

    return NextResponse.json({
      success: true,
      match,
      message: "Match updated successfully",
    })
  } catch (error: unknown) {
    console.error("Error updating match:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update match" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdminMatchesActor(request)
    if ("error" in auth && auth.error) return auth.error
    const { service } = auth as {
      service: ReturnType<typeof createServiceRoleClient>
    }

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 })
    }

    const { error } = await service.from("matches").delete().eq("id", id)

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: "Match deleted successfully",
    })
  } catch (error: unknown) {
    console.error("Error deleting match:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete match" },
      { status: 500 }
    )
  }
}
