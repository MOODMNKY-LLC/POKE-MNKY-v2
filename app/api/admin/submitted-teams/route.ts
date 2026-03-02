/**
 * GET /api/admin/submitted-teams
 * List showdown teams flagged for league submission.
 * Query: ?user_id=uuid (optional; if omitted, return all with owner info).
 * Auth: admin or commissioner.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"

export async function GET(request: NextRequest) {
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

    if (
      profile?.role !== "admin" &&
      profile?.role !== "commissioner"
    ) {
      return NextResponse.json(
        { error: "Forbidden - Admin or Commissioner required" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id")

    let query = serviceSupabase
      .from("showdown_teams")
      .select(
        `
        id,
        team_name,
        pokemon_count,
        submitted_for_league_at,
        submission_notes,
        created_at,
        coach_id,
        coaches:coach_id(user_id, display_name)
      `
      )
      .not("submitted_for_league_at", "is", null)
      .is("deleted_at", null)
      .order("submitted_for_league_at", { ascending: false })

    if (userId) {
      const { data: coach } = await serviceSupabase
        .from("coaches")
        .select("id")
        .eq("user_id", userId)
        .single()
      if (coach) {
        query = query.eq("coach_id", coach.id)
      } else {
        return NextResponse.json({ submittedTeams: [] })
      }
    }

    const { data: rows, error } = await query

    if (error) {
      console.error("[Submitted teams] Error:", error)
      return NextResponse.json(
        { error: error.message || "Failed to load submitted teams" },
        { status: 500 }
      )
    }

    const submittedTeams = (rows || []).map((r: any) => {
      const coachRow = r.coaches
      return {
        id: r.id,
        team_name: r.team_name,
        pokemon_count: r.pokemon_count,
        submitted_for_league_at: r.submitted_for_league_at,
        submission_notes: r.submission_notes,
        created_at: r.created_at,
        coach_id: r.coach_id,
        owner_user_id: coachRow?.user_id ?? null,
        owner_display_name: coachRow?.display_name ?? "Unknown",
      }
    })

    return NextResponse.json({ submittedTeams })
  } catch (err: unknown) {
    console.error("[Submitted teams] Error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
