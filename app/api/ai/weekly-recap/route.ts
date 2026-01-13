import { NextResponse } from "next/server"
import { openai, AI_MODELS } from "@/lib/openai-client"
import { createServerClient } from "@/lib/supabase/server"

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
    const { week_number } = body

    // Gather week data from database
    const { data: matches } = await supabase
      .from("matches")
      .select(
        `
        *,
        team1:teams!matches_team1_id_fkey(name, coach_name),
        team2:teams!matches_team2_id_fkey(name, coach_name),
        winner:teams!matches_winner_id_fkey(name)
      `,
      )
      .eq("week", week_number)
      .eq("status", "completed")

    const { data: standings } = await supabase
      .from("teams")
      .select("name, wins, losses, differential, current_streak, streak_type")
      .order("wins", { ascending: false })
      .limit(10)

    const { data: topPerformers } = await supabase
      .from("pokemon_stats")
      .select(
        `
        kills,
        pokemon:pokemon_cache!pokemon_stats_pokemon_id_fkey(name),
        team:teams(name)
      `,
      )
      .gte("kills", 3)
      .order("kills", { ascending: false })
      .limit(5)

    // Generate recap using GPT-5
    const response = await openai.chat.completions.create({
      model: AI_MODELS.WEEKLY_RECAP,
      messages: [
        {
          role: "system",
          content: `You are the commissioner of the Average at Best Battle League. Write an engaging, energetic weekly recap highlighting:
- Major upsets and close matches
- Standings changes and playoff implications
- Standout Pokémon performances
- Current streaks
- Looking ahead to next week
Keep it around 300-400 words. Be enthusiastic but professional. Do not invent data.`,
        },
        {
          role: "user",
          content: `Generate Week ${week_number} recap.

Matches:
${JSON.stringify(matches, null, 2)}

Top Standings:
${JSON.stringify(standings, null, 2)}

Top Performers:
${JSON.stringify(topPerformers, null, 2)}`,
        },
      ],
    })

    const recap = response.choices[0].message.content

    return NextResponse.json({
      week: week_number,
      recap,
      data_summary: {
        matches_count: matches?.length || 0,
        top_standings: standings?.slice(0, 3).map((t) => t.name),
        top_performer: topPerformers?.[0],
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
