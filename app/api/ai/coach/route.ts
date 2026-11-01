import { NextResponse } from "next/server"
import { openai, AI_MODELS } from "@/lib/openai-client"
import { requireSignedInUser } from "@/lib/admin-api-auth"
import { createServerClient } from "@/lib/supabase/server"

const TEAM_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  try {
    const auth = await requireSignedInUser()
    if ("response" in auth) return auth.response

    const supabase = await createServerClient()
    const body = await request.json()
    const { team_id, question } = body

    if (typeof team_id !== "string" || !TEAM_ID_PATTERN.test(team_id)) {
      return NextResponse.json({ error: "team_id must be a UUID" }, { status: 400 })
    }
    if (typeof question !== "string" || !question.trim() || question.length > 4000) {
      return NextResponse.json({ error: "question is required" }, { status: 400 })
    }

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
