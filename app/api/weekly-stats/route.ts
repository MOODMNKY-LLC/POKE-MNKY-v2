import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getWeeklyStats } from "@/lib/weekly-stats"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const weekParam = searchParams.get("week_number")
    const seasonId = searchParams.get("season_id")

    const weekNumber = weekParam ? Number.parseInt(weekParam, 10) : null
    if (weekParam && (!Number.isFinite(weekNumber) || weekNumber < 1)) {
      return NextResponse.json({ error: "week_number must be a positive integer" }, { status: 400 })
    }

    const stats = await getWeeklyStats(supabase, {
      seasonId: seasonId || null,
      weekNumber: weekNumber && weekNumber > 0 ? weekNumber : null,
    })

    if (!stats) {
      return NextResponse.json({
        season: null,
        week_number: weekNumber ?? null,
        matches: [],
        team_summary: [],
        top_performers: [],
      })
    }

    return NextResponse.json({
      season: stats.season,
      week_number: stats.week_number,
      match_count: stats.matches.length,
      team_summary_count: stats.team_summary.length,
      top_performer_count: stats.top_performers.length,
      matches: stats.matches,
      team_summary: stats.team_summary,
      top_performers: stats.top_performers,
    })
  } catch (error) {
    console.error("[weekly-stats] error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch weekly stats" },
      { status: 500 },
    )
  }
}
