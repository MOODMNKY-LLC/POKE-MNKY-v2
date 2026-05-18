import { NextResponse } from "next/server"
import { openai, AI_MODELS } from "@/lib/openai-client"
import { createServerClient } from "@/lib/supabase/server"
import { getWeeklyStats } from "@/lib/weekly-stats"

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const weekNumber = Number.parseInt(String(body?.week_number ?? body?.weekNumber ?? ""), 10)

    const weeklyStats = await getWeeklyStats(supabase, {
      weekNumber: Number.isFinite(weekNumber) && weekNumber > 0 ? weekNumber : null,
    })

    if (!weeklyStats) {
      return NextResponse.json({ error: "No current season found" }, { status: 404 })
    }

    const response = await openai.chat.completions.create({
      model: AI_MODELS.WEEKLY_RECAP,
      messages: [
        {
          role: "system",
          content:
            "You are the commissioner of the Average at Best Battle League. Write an engaging, energetic weekly recap highlighting:\n" +
            "- Major upsets and close matches\n" +
            "- Standings changes and playoff implications\n" +
            "- Standout Pokémon performances\n" +
            "- Current streaks\n" +
            "- Looking ahead to next week\n" +
            "Keep it around 300-400 words. Be enthusiastic but professional. Do not invent data.",
        },
        {
          role: "user",
          content:
            "Generate Week " +
            weeklyStats.week_number +
            " recap.\n\nMatches:\n" +
            JSON.stringify(weeklyStats.matches, null, 2) +
            "\n\nTop Standings:\n" +
            JSON.stringify(weeklyStats.team_summary, null, 2) +
            "\n\nTop Performers:\n" +
            JSON.stringify(weeklyStats.top_performers, null, 2),
        },
      ],
    })

    const recap = response.choices[0].message.content

    return NextResponse.json({
      week: weeklyStats.week_number,
      recap,
      data_summary: {
        season: weeklyStats.season,
        matches_count: weeklyStats.matches.length,
        top_standings: weeklyStats.team_summary.slice(0, 3).map((t) => t.team_name),
        top_performer: weeklyStats.top_performers[0] ?? null,
      },
    })
  } catch (error) {
    console.error("[v0] Weekly recap error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Recap generation failed" },
      { status: 500 },
    )
  }
}
