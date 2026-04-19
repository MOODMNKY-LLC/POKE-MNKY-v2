import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { notifyOpsEvent, OpsEvents } from "@/lib/ops-alerts"
import { hasAnyRole } from "@/lib/rbac"
import { UserRole } from "@/lib/rbac"
const applicantUpdateSchema = z.object({
  team_name: z.string().min(2).max(120).optional(),
  age: z.number().int().min(13).max(120).optional(),
  is_age_21_plus: z.boolean().optional(),
  liability_acknowledged: z.boolean().optional(),
})

const staffUpdateSchema = z.object({
  status: z.enum(["pending", "hold", "follow_up", "approved", "rejected"]),
  admin_notes: z.string().max(4000).optional().nullable(),
  rejection_reason: z
    .enum(["season_full", "no_current_draft", "not_enough_experience", "not_qualified", "other"])
    .optional()
    .nullable(),
  spectator_only_offer: z.boolean().optional(),
})

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: row, error: loadError } = await supabase
      .from("coach_applications")
      .select("*")
      .eq("id", id)
      .single()

    if (loadError || !row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const isStaff = await hasAnyRole(supabase, user.id, [UserRole.ADMIN, UserRole.COMMISSIONER])
    const isOwner = row.applicant_id === user.id

    const body = await request.json()

    if (isStaff) {
      const parsed = staffUpdateSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
      }

      const updates: Record<string, unknown> = {
        status: parsed.data.status,
        admin_notes: parsed.data.admin_notes ?? null,
        rejection_reason:
          parsed.data.status === "rejected" ? parsed.data.rejection_reason ?? "other" : null,
        spectator_only_offer:
          parsed.data.status === "rejected" ? parsed.data.spectator_only_offer ?? false : false,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { data: updated, error } = await supabase
        .from("coach_applications")
        .update(updates)
        .eq("id", id)
        .select()
        .single()

      if (error) {
        console.error("[coach-applications PATCH staff]", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Role changes for applicant profile (service role; staff already authorized)
      try {
        const admin = createServiceRoleClient()
        if (parsed.data.status === "approved") {
          await admin
            .from("profiles")
            .update({ role: "coach", updated_at: new Date().toISOString() })
            .eq("id", row.applicant_id)
        } else if (parsed.data.status === "rejected" && parsed.data.spectator_only_offer) {
          await admin
            .from("profiles")
            .update({ role: "spectator", updated_at: new Date().toISOString() })
            .eq("id", row.applicant_id)
        }
      } catch (roleErr) {
        console.error("[coach-applications PATCH role sync]", roleErr)
      }

      void notifyOpsEvent(OpsEvents.coachApplicationStatus, {
        application_id: id,
        status: parsed.data.status,
        applicant_id: row.applicant_id,
      })

      return NextResponse.json({ application: updated })
    }

    if (isOwner && row.status === "pending") {
      const parsed = applicantUpdateSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
      }

      const patch: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }
      if (parsed.data.team_name !== undefined) patch.team_name = parsed.data.team_name.trim()
      if (parsed.data.age !== undefined) patch.age = parsed.data.age
      if (parsed.data.is_age_21_plus !== undefined) patch.is_age_21_plus = parsed.data.is_age_21_plus
      if (parsed.data.liability_acknowledged !== undefined) {
        patch.liability_acknowledged = parsed.data.liability_acknowledged
      }

      const { data: updated, error } = await supabase
        .from("coach_applications")
        .update(patch)
        .eq("id", id)
        .eq("applicant_id", user.id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ application: updated })
    }

    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    )
  }
}
