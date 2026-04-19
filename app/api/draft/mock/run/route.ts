/**
 * POST /api/draft/mock/run
 *
 * Admin-only: run automated mock draft for the Mock Draft Demo season.
 * Optional body: { season_id?: string, max_picks?: number }
 * Creates session if none active; runs picks until complete or max_picks.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { DraftSystem } from "@/lib/draft-system"
import { scoreCandidatesForAutopick } from "@/lib/draft-autopick-heuristics"

const MOCK_SEASON_NAME = "Mock Draft Demo"

async function sendDiscordMessage(text: string) {
  const url = process.env.MOCK_DRAFT_DISCORD_WEBHOOK_URL
  if (!url) return
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
    })
  } catch {
    // ignore
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "admin" && profile?.role !== "commissioner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = (await request.json().catch(() => ({}))) as {
      season_id?: string
      max_picks?: number
      autopick_budget_weight?: number
      autopick_diversity_weight?: number
    }
    const seasonIdParam = body.season_id
    const maxPicksParam = typeof body.max_picks === "number" ? body.max_picks : undefined

    const admin = createServiceRoleClient()
    const draftSystem = new DraftSystem()

    let seasonId: string
    if (seasonIdParam) {
      const { data: s } = await admin
        .from("seasons")
        .select("id")
        .eq("id", seasonIdParam)
        .maybeSingle()
      if (!s) {
        return NextResponse.json({ error: "Season not found" }, { status: 404 })
      }
      seasonId = s.id
    } else {
      const { data: mockSeason } = await admin
        .from("seasons")
        .select("id")
        .eq("name", MOCK_SEASON_NAME)
        .maybeSingle()
      if (!mockSeason) {
        return NextResponse.json(
          { error: "Mock season not found. Run scripts/seed-mock-draft.ts first." },
          { status: 404 }
        )
      }
      seasonId = mockSeason.id
    }

    let session = await draftSystem.getActiveSession(seasonId)

    if (!session) {
      const { data: teams } = await admin
        .from("teams")
        .select("id")
        .eq("season_id", seasonId)
      const teamIds = (teams ?? []).map((t: { id: string }) => t.id)
      if (teamIds.length < 2) {
        return NextResponse.json(
          { error: "Need at least 2 teams for mock season." },
          { status: 400 }
        )
      }
      session = await draftSystem.createSession(seasonId, teamIds, {
        draftType: "snake",
        pickTimeLimit: 45,
        autoDraftEnabled: false,
      })
      await sendDiscordMessage(`Mock draft started (API). Session ${session.id}.`)
    }

    const sessionId = session.id
    const maxPicks = maxPicksParam && maxPicksParam > 0 ? maxPicksParam : 0
    let pickCount = 0
    const picks: { pick_number: number; team_id: string; team_name: string; pokemon_name: string; point_value: number }[] = []

    while (true) {
      if (session.status === "completed") break
      if (maxPicks > 0 && pickCount >= maxPicks) break

      const turn = await draftSystem.getCurrentTurn(sessionId)
      if (!turn) break

      const { data: budget } = await admin
        .from("draft_budgets")
        .select("remaining_points")
        .eq("team_id", turn.teamId)
        .eq("season_id", seasonId)
        .single()

      const remaining = budget?.remaining_points ?? 0
      if (remaining <= 0) break

      const { data: poolRows } = await admin
        .from("draft_pool")
        .select("pokemon_name, point_value")
        .eq("season_id", seasonId)
        .or("status.eq.available,status.is.null")
        .lte("point_value", remaining)
        .order("point_value", { ascending: false })
        .limit(24)

      const candidates = (poolRows ?? []).map((r) => ({
        pokemon_name: r.pokemon_name as string,
        point_value: r.point_value as number,
      }))
      const chosen = scoreCandidatesForAutopick(candidates, new Set(), {
        budgetPressure: body.autopick_budget_weight,
        diversityWeight: body.autopick_diversity_weight,
      })
      const available = chosen ?? candidates[0]

      if (!available) break

      const result = await draftSystem.makePick(sessionId, turn.teamId, available.pokemon_name)
      if (!result.success) break

      pickCount++
      const { data: team } = await admin
        .from("teams")
        .select("name")
        .eq("id", turn.teamId)
        .single()
      const teamName = (team?.name as string) ?? turn.teamId
      picks.push({
        pick_number: result.pick?.pick_number ?? pickCount,
        team_id: turn.teamId,
        team_name: teamName,
        pokemon_name: available.pokemon_name,
        point_value: available.point_value,
      })
      await sendDiscordMessage(
        `Mock draft: Pick #${result.pick?.pick_number ?? pickCount} – ${teamName} drafted **${available.pokemon_name}** (${available.point_value} pts).`
      )

      const { data: updated } = await admin
        .from("draft_sessions")
        .select("status")
        .eq("id", sessionId)
        .single()
      session = { ...session, status: (updated?.status as string) ?? session.status }
    }

    const { data: budgets } = await admin
      .from("draft_budgets")
      .select("team_id, total_points, spent_points, remaining_points")
      .eq("season_id", seasonId)

    await sendDiscordMessage(`Mock draft run finished. Picks made: ${pickCount}.`)

    return NextResponse.json({
      success: true,
      sessionId,
      picksMade: pickCount,
      completed: session.status === "completed",
      picks,
      finalBudgets: budgets ?? [],
    })
  } catch (err) {
    console.error("[mock/run]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
