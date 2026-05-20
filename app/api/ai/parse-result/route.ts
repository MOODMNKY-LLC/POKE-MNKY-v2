import { NextResponse } from "next/server"
import { parseMatchResult } from "@/lib/openai-client"
import { createServerClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { completeMatchResult } from "@/lib/match-result-complete"

function isBotRequest(request: Request): boolean {
  const secret = process.env.DISCORD_BOT_INTERNAL_SECRET
  if (!secret) return false
  return request.headers.get("x-internal-bot-secret") === secret
}

async function resolveBotUserId(discordUserId: string): Promise<string | null> {
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("discord_id", discordUserId)
    .maybeSingle()
  return data?.id ?? null
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { text, discord_user_id: discordUserId } = body

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 })
    }

    let userId: string | null = null
    let authSupabase: Awaited<ReturnType<typeof createServerClient>> | undefined

    if (isBotRequest(request)) {
      if (discordUserId) {
        userId = await resolveBotUserId(String(discordUserId))
      }
    } else {
      authSupabase = await createServerClient()
      const {
        data: { user },
      } = await authSupabase.auth.getUser()

      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      userId = user.id
    }

    const parsed = await parseMatchResult(text)

    if (parsed.needs_review) {
      return NextResponse.json({
        parsed,
        status: "needs_review",
        message: "Result requires manual review: " + parsed.notes,
      })
    }

    const supabase = createServiceRoleClient()
    const { data: teams } = await supabase
      .from("teams")
      .select("id, name")
      .in("name", [parsed.team_a, parsed.team_b])

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
    const team1Score =
      parsed.winner === parsed.team_a ? parsed.differential : 0
    const team2Score =
      parsed.winner === parsed.team_b ? parsed.differential : 0

    const result = await completeMatchResult(
      {
        week: parsed.week,
        team1_id: teamA.id,
        team2_id: teamB.id,
        winner_id: winnerId,
        team1_score: team1Score,
        team2_score: team2Score,
        differential: parsed.differential,
        replay_url: parsed.proof_url ?? null,
        notes: parsed.notes ?? null,
      },
      userId,
      authSupabase
    )

    return NextResponse.json({
      parsed,
      status: "success",
      match_id: result.match_id,
      season_id: result.season_id,
      standings_updated: result.standings_updated,
      discord_notified: result.discord_notified,
      message: "Match result recorded successfully",
      warnings: result.discord_error
        ? { discord: result.discord_error }
        : undefined,
    })
  } catch (error) {
    console.error("[parse-result]", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Parse failed",
      },
      { status: 500 }
    )
  }
}
