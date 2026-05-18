import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET() {
  try {
    const { data: currentSeason, error: seasonError } = await supabase
      .from("seasons")
      .select("id, name")
      .eq("is_current", true)
      .maybeSingle()

    if (seasonError) {
      console.error("[v0] Current season fetch error:", seasonError)
      return NextResponse.json({ error: seasonError.message }, { status: 500 })
    }

    if (!currentSeason?.id) {
      return NextResponse.json({
        standings: [],
        season: null,
      })
    }

    const { data: standings, error } = await supabase
      .from("v_regular_team_rankings")
      .select("season_id, team_id, team_name, conference, division, wins, losses, differential, active_win_streak, sos, league_rank")
      .eq("season_id", currentSeason.id)
      .order("league_rank", { ascending: true })

    if (error) {
      console.error("[v0] Standings fetch error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      season: currentSeason,
      standings:
        (standings || []).map((row) => ({
          id: row.team_id,
          season_id: row.season_id,
          name: row.team_name,
          conference: row.conference,
          division: row.division,
          wins: row.wins,
          losses: row.losses,
          differential: row.differential,
          current_streak: row.active_win_streak,
          streak_type: row.active_win_streak > 0 ? "W" : null,
          strength_of_schedule: row.sos,
          league_rank: row.league_rank,
        })) || [],
    })
  } catch (error) {
    console.error("[v0] Standings error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch standings" },
      { status: 500 },
    )
  }
}
