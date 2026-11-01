import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { listStandingsSeasons, pickStandingsSeason } from "@/lib/standings-season"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(request: NextRequest) {
  try {
    const requested = request.nextUrl.searchParams.get("season")
    const seasons = await listStandingsSeasons(supabase)
    const season = pickStandingsSeason(seasons, requested)

    if (!season?.id) {
      return NextResponse.json({
        standings: [],
        season: null,
        seasons: seasons.map((row) => ({
          id: row.id,
          name: row.name,
          season_id: row.season_id,
          is_current: row.is_current,
        })),
      })
    }

    const { data: standings, error } = await supabase
      .from("v_regular_team_rankings")
      .select(
        "season_id, team_id, team_name, conference, division, wins, losses, differential, active_win_streak, streak_type, streak_len, sos, league_rank",
      )
      .eq("season_id", season.id)
      .order("league_rank", { ascending: true })

    if (error) {
      console.error("[v0] Standings fetch error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const teamIds = (standings ?? []).map((row) => row.team_id)
    const { data: teamTotals } =
      teamIds.length > 0
        ? await supabase
            .from("teams")
            .select(
              "id, regular_wins, regular_losses, playoff_wins, playoff_losses, wins, losses, differential",
            )
            .in("id", teamIds)
        : { data: [] }

    const totalsById = new Map((teamTotals ?? []).map((team) => [team.id, team]))

    return NextResponse.json({
      season: {
        id: season.id,
        name: season.name,
        season_id: season.season_id,
        is_current: season.is_current,
      },
      seasons: seasons.map((row) => ({
        id: row.id,
        name: row.name,
        season_id: row.season_id,
        is_current: row.is_current,
      })),
      standings: (standings || []).map((row) => {
        const totals = totalsById.get(row.team_id)
        const streakLen = Number(row.streak_len ?? 0)
        const streakType = streakLen > 0 && (row.streak_type === "W" || row.streak_type === "L")
          ? row.streak_type
          : null
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
          current_streak: streakLen,
          streak_type: streakType,
          strength_of_schedule: row.sos,
          league_rank: row.league_rank,
        }
      }),
    })
  } catch (error) {
    console.error("[v0] Standings error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch standings" },
      { status: 500 },
    )
  }
}
