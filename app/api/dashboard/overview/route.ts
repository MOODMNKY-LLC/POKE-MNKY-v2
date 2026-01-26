import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUserProfile } from "@/lib/rbac"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const profile = await getCurrentUserProfile(supabase)
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // Get current season
    const { data: season, error: seasonError } = await supabase
      .from("seasons")
      .select("id, name, is_current")
      .eq("is_current", true)
      .single()

    if (seasonError || !season) {
      return NextResponse.json(
        {
          error: "No active season found",
          season: null,
        },
        { status: 404 }
      )
    }

    const response: {
      user: {
        id: string
        role: string
        team_id: string | null
        display_name: string | null
        username: string | null
      }
      season: {
        id: string
        name: string
        is_current: boolean
      }
      stats: {
        team_record?: { wins: number; losses: number; differential: number }
        draft_budget?: { total: number; spent: number; remaining: number }
        roster_count?: number
        next_match?: any
      }
      team?: any
    } = {
      user: {
        id: profile.id,
        role: profile.role,
        team_id: profile.team_id,
        display_name: profile.display_name,
        username: profile.username,
      },
      season: {
        id: season.id,
        name: season.name,
        is_current: season.is_current,
      },
      stats: {},
    }

    // If coach, fetch team data and stats
    if (profile.role === "coach" && profile.team_id) {
      // Fetch full team data for coach card
      const { data: team, error: teamError } = await supabase
        .from("teams")
        .select(
          "id, name, wins, losses, differential, division, conference, avatar_url, logo_url, coach_name"
        )
        .eq("id", profile.team_id)
        .single()

      if (team && !teamError) {
        response.team = team
        response.stats.team_record = {
          wins: team.wins || 0,
          losses: team.losses || 0,
          differential: team.differential || 0,
        }

        // Fetch draft budget
        const { data: budget, error: budgetError } = await supabase
          .from("draft_budgets")
          .select("total_points, spent_points, remaining_points")
          .eq("team_id", profile.team_id)
          .eq("season_id", season.id)
          .single()

        if (budget && !budgetError) {
          response.stats.draft_budget = {
            total: budget.total_points || 0,
            spent: budget.spent_points || 0,
            remaining: budget.remaining_points || 0,
          }
        }

        // Fetch roster count
        const { count: rosterCount, error: rosterError } = await supabase
          .from("team_rosters")
          .select("*", { count: "exact", head: true })
          .eq("team_id", profile.team_id)
          .eq("season_id", season.id)

        if (!rosterError) {
          response.stats.roster_count = rosterCount || 0
        }

        // Fetch next match
        const { data: matches, error: matchError } = await supabase
          .from("matches")
          .select(
            `
            id,
            week,
            team1_id,
            team2_id,
            matchweek_id,
            status,
            team1:teams!matches_team1_id_fkey(id, name, coach_name, logo_url, wins, losses, differential),
            team2:teams!matches_team2_id_fkey(id, name, coach_name, logo_url, wins, losses, differential)
          `
          )
          .or(`team1_id.eq.${profile.team_id},team2_id.eq.${profile.team_id}`)
          .eq("season_id", season.id)
          .eq("is_playoff", false)
          .is("winner_id", null)
          .order("week", { ascending: true })
          .limit(1)

        const nextMatch = matches?.[0]
        if (nextMatch && !matchError) {
          const isTeam1 = nextMatch.team1_id === profile.team_id
          const opponentTeam = isTeam1 ? nextMatch.team2 : nextMatch.team1

          response.stats.next_match = {
            match_id: nextMatch.id,
            week: nextMatch.week,
            opponent_name: opponentTeam?.name,
            opponent_coach: opponentTeam?.coach_name,
            opponent_logo_url: opponentTeam?.logo_url,
            status: nextMatch.status,
          }
        }
      }
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error("[Dashboard Overview] Error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
