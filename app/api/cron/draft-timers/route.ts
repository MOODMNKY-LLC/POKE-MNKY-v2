/**
 * Enforce live-draft pick timers (auto-pick or skip when deadline passed).
 *
 * Hobby-friendly design:
 * - Primary: status/pick API paths call rpc_enforce_draft_pick_timer opportunistically.
 * - Backup: this cron sweeps active sessions (Vercel Hobby minimum interval is once/day
 *   for free tier; Pro can run more often). Prefer calling status polling during a live draft.
 *
 * Auth: Authorization: Bearer <CRON_SECRET>
 */

import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { DraftSystem } from "@/lib/draft-system"

export const revalidate = 0
export const maxDuration = 60

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const supabase = createServiceRoleClient()
    const { data: sessions, error } = await supabase
      .from("draft_sessions")
      .select("id")
      .eq("status", "active")
      .or("governance_approval_status.eq.approved,governance_approval_status.is.null")

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      )
    }

    const draftSystem = new DraftSystem()
    const results: Array<{ session_id: string; action?: string; error?: string }> = []

    for (const session of sessions ?? []) {
      const outcome = await draftSystem.enforcePickTimer(session.id)
      results.push({
        session_id: session.id,
        action: outcome.action,
        error: outcome.error,
      })
    }

    return NextResponse.json({
      success: true,
      checked: results.length,
      results,
    })
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Draft timer cron failed",
      },
      { status: 500 },
    )
  }
}
