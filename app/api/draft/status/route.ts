import { createServiceRoleClient } from "@/lib/supabase/service"
import { DraftSystem } from "@/lib/draft-system"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const seasonId = searchParams.get("season_id")
    let resolvedSeasonId = seasonId

    if (!resolvedSeasonId) {
      // Get current season
      const supabase = createServiceRoleClient()
      const { data: season } = await supabase
        .from("seasons")
        .select("id")
        .eq("is_current", true)
        .single()

      if (!season?.id) {
        return NextResponse.json({ success: false, error: "No active season found" }, { status: 404 })
      }

      resolvedSeasonId = season.id
    }

    if (!resolvedSeasonId) {
      return NextResponse.json({ success: false, error: "No active season found" }, { status: 404 })
    }

    const draftSystem = new DraftSystem()
    let session = await draftSystem.getActiveSession(resolvedSeasonId)

    if (!session) {
      return NextResponse.json({ 
        success: false, 
        error: "No active draft session found. Use POST /api/draft/create-session to create one." 
      }, { status: 404 })
    }

    // Enforce pick timer on status polls (Hobby-friendly primary path).
    const timer = await draftSystem.enforcePickTimer(session.id)
    if (timer.action === "auto_pick" || timer.action === "skip" || timer.action === "deadline_set") {
      session = (await draftSystem.getActiveSession(resolvedSeasonId)) ?? session
    }

    // Get current turn info
    const currentTurn = await draftSystem.getCurrentTurn(session.id)

    // Get team names
    const supabase = createServiceRoleClient()
    const { data: currentTeam } = currentTurn
      ? await supabase.from("teams").select("name").eq("id", currentTurn.teamId).single()
      : { data: null }

    // Get next team
    const turnOrder = session.turn_order || []
    const currentIndex = currentTurn
      ? turnOrder.indexOf(currentTurn.teamId)
      : -1
    const nextIndex = currentIndex + 1 < turnOrder.length ? currentIndex + 1 : 0
    const nextTeamId = turnOrder[nextIndex]

    const { data: nextTeam } = nextTeamId
      ? await supabase.from("teams").select("name").eq("id", nextTeamId).single()
      : { data: null }

    const sessionWithDeadline = session as typeof session & {
      current_pick_deadline_at?: string | null
      pick_time_limit_seconds?: number | null
      auto_draft_enabled?: boolean | null
    }

    return NextResponse.json({
      success: true,
      session: sessionWithDeadline,
      currentTeam,
      nextTeam,
      currentTurn,
      timer: {
        action: timer.action ?? "none",
        deadline_at: sessionWithDeadline.current_pick_deadline_at ?? null,
        pick_time_limit_seconds: sessionWithDeadline.pick_time_limit_seconds ?? null,
        auto_draft_enabled: sessionWithDeadline.auto_draft_enabled ?? false,
      },
    })
  } catch (error: any) {
    console.error("Draft status error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
