import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { hasRole } from "@/lib/rbac"
import { UserRole } from "@/lib/rbac"
import { notifyOpsEvent, OpsEvents } from "@/lib/ops-alerts"

type Ctx = { params: Promise<{ id: string }> }

/**
 * POST — Admin approves a commissioner-created draft session so it can go live.
 */
export async function POST(_req: Request, context: Ctx) {
  try {
    const { id } = await context.params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const isAdmin = await hasRole(supabase, user.id, UserRole.ADMIN)
    if (!isAdmin) {
      return NextResponse.json({ error: "Only admins can approve draft sessions" }, { status: 403 })
    }

    const admin = createServiceRoleClient()
    const { data: session, error: loadErr } = await admin
      .from("draft_sessions")
      .select("id, governance_approval_status, status")
      .eq("id", id)
      .single()

    if (loadErr || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    const { data: updated, error: updErr } = await admin
      .from("draft_sessions")
      .update({
        governance_approval_status: "approved",
        status: "active",
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (updErr) {
      console.error("[governance-approve]", updErr)
      return NextResponse.json({ error: updErr.message }, { status: 500 })
    }

    void notifyOpsEvent(OpsEvents.draftSessionGovernanceApproved, {
      session_id: id,
      season_id: updated?.season_id,
      approved_by: user.id,
    })

    return NextResponse.json({ success: true, session: updated })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal error" },
      { status: 500 }
    )
  }
}
