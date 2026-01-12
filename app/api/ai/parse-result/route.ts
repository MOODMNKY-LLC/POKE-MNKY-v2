import { NextResponse } from "next/server"
import { parseMatchResult } from "@/lib/openai-client"
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
    const { text } = body

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 })
    }

    // Parse using GPT-4
    const parsed = await parseMatchResult(text)

    // If needs review, return for manual verification
    if (parsed.needs_review) {
      return NextResponse.json({
        parsed,
        status: "needs_review",
        message: "Result requires manual review: " + parsed.notes,
      })
    }

    // Auto-submit if confident
    const { data: teams } = await supabase.from("teams").select("id, name").in("name", [parsed.team_a, parsed.team_b])

    const teamA = teams?.find((t) => t.name === parsed.team_a)
    const teamB = teams?.find((t) => t.name === parsed.team_b)

    if (!teamA || !teamB) {
      return NextResponse.json({
        parsed,
        status: "error",
        message: "Teams not found in database",
      })
    }

    const winnerId = parsed.winner === parsed.team_a ? teamA.id : teamB.id

    // Create match record
    const { data: match, error } = await supabase
      .from("matches")
      .insert({
        week: parsed.week,
        team1_id: teamA.id,
        team2_id: teamB.id,
        winner_id: winnerId,
        team1_score: parsed.winner === parsed.team_a ? parsed.differential : 0,
        team2_score: parsed.winner === parsed.team_b ? parsed.differential : 0,
        differential: parsed.differential,
        status: "completed",
        replay_url: parsed.proof_url,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      parsed,
      status: "success",
      match_id: match.id,
      message: "Match result recorded successfully",
    })
  } catch (error) {
    console.error("[v0] Parse result error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Parse failed" }, { status: 500 })
  }
}
