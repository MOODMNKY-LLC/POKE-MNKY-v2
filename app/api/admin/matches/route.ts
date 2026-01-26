import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const week = searchParams.get("week")
    const status = searchParams.get("status")
    const teamId = searchParams.get("team_id")
    const isPlayoff = searchParams.get("is_playoff")
    const limit = parseInt(searchParams.get("limit") || "100")
    const offset = parseInt(searchParams.get("offset") || "0")

    // Build query
    let query = supabase
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

    // Apply filters
    if (week) {
      query = query.eq("week", parseInt(week))
    }

    if (status) {
      query = query.eq("status", status)
    }

    if (teamId) {
      query = query.or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`)
    }

    if (isPlayoff !== null) {
      query = query.eq("is_playoff", isPlayoff === "true")
    }

    // Apply pagination
    const { data: matches, error, count } = await query
      .order("week", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return NextResponse.json({
      matches: matches || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    })
  } catch (error: any) {
    console.error("Error fetching matches:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch matches" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      week,
      team1_id,
      team2_id,
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

    const { data: match, error } = await supabase
      .from("matches")
      .insert({
        week,
        team1_id,
        team2_id,
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
  } catch (error: any) {
    console.error("Error creating match:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create match" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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

    const updateData: any = {}
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

    const { data: match, error } = await supabase
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

    return NextResponse.json({
      success: true,
      match,
      message: "Match updated successfully",
    })
  } catch (error: any) {
    console.error("Error updating match:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update match" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 })
    }

    const { error } = await supabase.from("matches").delete().eq("id", id)

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: "Match deleted successfully",
    })
  } catch (error: any) {
    console.error("Error deleting match:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete match" },
      { status: 500 }
    )
  }
}
