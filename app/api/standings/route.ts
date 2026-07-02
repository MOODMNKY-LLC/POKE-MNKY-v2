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

    const teamIds = (standings ?? []).map((r) => r.team_id)
    const { data: teamTotals } =
      teamIds.length > 0
        ? await supabase
            .from("teams")
            .select(
              "id, regular_wins, regular_losses, playoff_wins, playoff_losses, wins, losses, differential"
            )
            .in("id", teamIds)
        : { data: [] }

    const totalsById = new Map((teamTotals ?? []).map((t) => [t.id, t]))

    return NextResponse.json({
      season: currentSeason,
      standings:
        (standings || []).map((row) => {
          const totals = totalsById.get(row.team_id)
          return {
            id: row.team_id,
            season_id: row.season_id,
            name: row.team_name,
            conference: row.conference,
            division: row.division,
            wins: row.wins,
            losses: row.losses,
            differential: row.differential,
            regular_wins: row.wins,
            regular_losses: row.losses,
            playoff_wins: totals?.playoff_wins ?? 0,
            playoff_losses: totals?.playoff_losses ?? 0,
            season_wins: totals?.wins ?? row.wins,
            season_losses: totals?.losses ?? row.losses,
            season_differential: totals?.differential ?? row.differential,
            current_streak: row.active_win_streak,
            streak_type: row.active_win_streak > 0 ? "W" : null,
            strength_of_schedule: row.sos,
            league_rank: row.league_rank,
          }
        }) || [],
    })
  } catch (error) {
    console.error("[v0] Standings error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch standings" },
      { status: 500 },
    )
  }
}
