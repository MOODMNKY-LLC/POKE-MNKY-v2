/**
 * POST /api/admin/simulation/draft
 * Runs mock draft (reuses DraftSystem and /api/draft/mock/run logic)
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { DraftSystem, type DraftSession } from "@/lib/draft-system"
import { ensureMockDraftDemoSandboxSeason } from "@/lib/league-simulation/mock-draft-demo-season"
import { legacySimulationWriteDeniedResponse } from "@/lib/league-simulation/legacy-simulation-writes-gate"
import { recordSimulationRun } from "@/lib/league-simulation/simulation-engine"

type DraftSessionStatus = DraftSession["status"]

function isDraftSessionStatus(value: string | null | undefined): value is DraftSessionStatus {
  return (
    value === "pending" ||
    value === "active" ||
    value === "paused" ||
    value === "completed" ||
    value === "cancelled"
  )
}

export async function POST(request: NextRequest) {
  try {
    const legacyDenied = legacySimulationWriteDeniedResponse()
    if (legacyDenied) return legacyDenied

    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

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

    const body = await request.json().catch(() => ({}))
    const maxPicks = typeof body.max_picks === "number" ? body.max_picks : undefined

    const admin = createServiceRoleClient()
    const draftSystem = new DraftSystem()

    const seasonId = await ensureMockDraftDemoSandboxSeason(admin)

    let session = await draftSystem.getActiveSession(seasonId)
    if (!session) {
      const { data: teams } = await admin
        .from("teams")
        .select("id")
        .eq("season_id", seasonId)
      const teamIds = (teams ?? []).map((t: { id: string }) => t.id)
      if (teamIds.length < 2) {
        return NextResponse.json(
          { error: "Need at least 2 teams. Run seed first." },
          { status: 400 }
        )
      }
      session = await draftSystem.createSession(seasonId, teamIds, {
        draftType: "snake",
        pickTimeLimit: 45,
        autoDraftEnabled: false,
      })
    }

    if (!session) {
      return NextResponse.json({ error: "Failed to create draft session" }, { status: 500 })
    }

    let draftSession: DraftSession = session
    const sessionId = draftSession.id
    let pickCount = 0
    const picks: Array<{ pick_number: number; team_name: string; pokemon_name: string; point_value: number }> = []

    while (true) {
      if (draftSession.status === "completed") break
      if (maxPicks && maxPicks > 0 && pickCount >= maxPicks) break

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

      const { data: available } = await admin
        .from("draft_pool")
        .select("pokemon_name, point_value")
        .eq("season_id", seasonId)
        .or("status.eq.available,status.is.null")
        .lte("point_value", remaining)
        .order("point_value", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!available) break

      const result = await draftSystem.makePick(sessionId, turn.teamId, available.pokemon_name)
      if (!result.success) break

      pickCount++
      const { data: team } = await admin
        .from("teams")
        .select("name")
        .eq("id", turn.teamId)
        .single()

      picks.push({
        pick_number: result.pick?.pick_number ?? pickCount,
        team_name: (team?.name as string) ?? turn.teamId,
        pokemon_name: available.pokemon_name,
        point_value: available.point_value,
      })

      const { data: updated } = await admin
        .from("draft_sessions")
        .select("status")
        .eq("id", sessionId)
        .single()
      const nextStatus = updated?.status
      draftSession = {
        ...draftSession,
        status: isDraftSessionStatus(nextStatus) ? nextStatus : draftSession.status,
      }
    }

    await recordSimulationRun(seasonId, draftSession.status === "completed" ? "regular_season" : "drafting", {})

    return NextResponse.json({
      success: true,
      sessionId,
      picksMade: pickCount,
      completed: draftSession.status === "completed",
      picks,
    })
  } catch (err) {
    console.error("[simulation/draft]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
