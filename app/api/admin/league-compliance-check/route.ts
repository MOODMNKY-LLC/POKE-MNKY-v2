/**
 * POST /api/admin/league-compliance-check
 * Run league compliance (rule-based + optional AI) on a submitted showdown team.
 * Body: { showdown_team_id: string, season_id?: string, include_ai?: boolean }
 * Auth: admin or commissioner.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import {
  checkLeagueCompliance,
  extractPokemonNamesFromShowdownTeam,
} from "@/lib/league-compliance"
import { openai } from "@/lib/openai-client"

const LEAGUE_DOCS_SNIPPET = `
League rules (summary): Draft budget 120 points per team; roster 8-10 Pokemon; point values in range; Tera budget 15 for Tera Captains; transaction cap 10 per season; trades/FA execute 12:00 AM Monday EST.
`.trim()

async function getLeagueComplianceAIWarnings(
  teamName: string,
  rosterSize: number,
  totalPoints: number,
  resolvedNames: string[]
): Promise<string[]> {
  try {
    if (!process.env.OPENAI_API_KEY) return []
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a league commissioner assistant. Given a team summary and the league rules below, reply with 0-3 short advisory warnings only if something might violate or stretch league rules (format, Tera usage, transaction limits, etc.). If the team looks fine, reply with exactly: NONE. Be very brief; one line per warning. Rules: ${LEAGUE_DOCS_SNIPPET}`,
        },
        {
          role: "user",
          content: `Team: ${teamName}. Roster size: ${rosterSize}. Total draft points: ${totalPoints}. Pokemon: ${resolvedNames.join(", ")}. Any advisory warnings?`,
        },
      ],
      max_tokens: 150,
    })
    const text =
      response.choices?.[0]?.message?.content?.trim()?.toUpperCase() ?? ""
    if (!text || text === "NONE" || text.startsWith("NONE")) return []
    return text.split("\n").map((s) => s.trim()).filter(Boolean)
  } catch {
    return []
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const serviceSupabase = createServiceRoleClient()
    const { data: profile } = await serviceSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "admin" && profile?.role !== "commissioner") {
      return NextResponse.json(
        { error: "Forbidden - Admin or Commissioner required" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const showdownTeamId = body.showdown_team_id as string | undefined
    const seasonId = (body.season_id as string | null) ?? null
    const includeAi = body.include_ai === true

    if (!showdownTeamId) {
      return NextResponse.json(
        { error: "showdown_team_id is required" },
        { status: 400 }
      )
    }

    const { data: team, error: teamError } = await serviceSupabase
      .from("showdown_teams")
      .select("id, team_name, pokemon_data, team_text, canonical_text")
      .eq("id", showdownTeamId)
      .single()

    if (teamError || !team) {
      return NextResponse.json(
        { error: "Showdown team not found" },
        { status: 404 }
      )
    }

    const names = extractPokemonNamesFromShowdownTeam(team)
    const result = await checkLeagueCompliance(
      serviceSupabase,
      names,
      seasonId
    )

    if (includeAi && result.compliant && result.resolved.length > 0) {
      const resolvedNames = result.resolved.map((r) => `${r.name} (${r.pointValue})`)
      const aiWarnings = await getLeagueComplianceAIWarnings(
        team.team_name ?? "Unknown",
        result.rosterSize,
        result.totalPoints,
        resolvedNames
      )
      result.warnings.push(...aiWarnings)
    }

    return NextResponse.json({
      compliant: result.compliant,
      errors: result.errors,
      warnings: result.warnings,
      totalPoints: result.totalPoints,
      rosterSize: result.rosterSize,
      resolved: result.resolved,
    })
  } catch (err: unknown) {
    console.error("[League compliance check] Error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
