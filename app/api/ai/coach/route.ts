import { NextResponse } from "next/server"
import { openai, AI_MODELS } from "@/lib/openai-client"
import { createServerClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const body = await request.json()
    const { team_id, question } = body

    // Get team context
    const { data: team } = await supabase
      .from("teams")
      .select(
        `
        *,
        roster:team_rosters(
          pokemon:pokemon_cache(name, types, base_stats, tier, draft_cost)
        )
      `,
      )
      .eq("id", team_id)
      .single()

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 })
    }

    // Get recent matches
    const { data: recentMatches } = await supabase
      .from("matches")
      .select("*, opponent:teams(name)")
      .or(`team1_id.eq.${team_id},team2_id.eq.${team_id}`)
      .order("played_at", { ascending: false })
      .limit(5)

    // Use GPT-5 for strategic analysis
    const response = await openai.chat.completions.create({
      model: AI_MODELS.STRATEGY_COACH,
      messages: [
        {
          role: "system",
          content: `You are an expert Pokémon competitive coach analyzing team strategy. Provide:
- Tactical advice grounded in team composition
- Type coverage analysis
- Matchup considerations
- Strategic suggestions for improvement
Base recommendations on the actual roster and recent performance. Be specific and actionable.`,
        },
        {
          role: "user",
          content: `Team: ${team.name}
Record: ${team.wins}-${team.losses}
Roster: ${JSON.stringify(team.roster, null, 2)}
Recent matches: ${JSON.stringify(recentMatches, null, 2)}

Question: ${question}`,
        },
      ],
    })

    const advice = response.choices[0].message.content

    return NextResponse.json({
      team_name: team.name,
      advice,
      context: {
        record: `${team.wins}-${team.losses}`,
        roster_size: team.roster?.length || 0,
        recent_form: recentMatches?.slice(0, 3),
      },
    })
  } catch (error) {
    console.error("[v0] Coach AI error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Coach advice failed" }, { status: 500 })
  }
}
