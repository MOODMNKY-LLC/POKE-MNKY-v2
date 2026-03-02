/**
 * POST /api/coach/set-current-team
 * Body: { teamId: string }
 * Sets the authenticated coach's profile.team_id to the given team if they coach it.
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUserProfile } from "@/lib/rbac"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const profile = await getCurrentUserProfile(supabase)
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 })
  }

  if (profile.role !== "coach") {
    return NextResponse.json({ error: "Only coaches can set current team" }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const teamId = body?.teamId ?? body?.team_id

  if (!teamId || typeof teamId !== "string") {
    return NextResponse.json(
      { error: "teamId is required" },
      { status: 400 }
    )
  }

  const { data: coach } = await supabase
    .from("coaches")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (!coach) {
    return NextResponse.json({ error: "No coach record" }, { status: 403 })
  }

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id, name, coach_id")
    .eq("id", teamId)
    .single()

  if (teamError || !team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 })
  }

  if (team.coach_id !== coach.id) {
    return NextResponse.json(
      { error: "You do not coach this team" },
      { status: 403 }
    )
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ team_id: teamId, updated_at: new Date().toISOString() })
    .eq("id", user.id)

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message ?? "Failed to update current team" },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    team_id: teamId,
    team_name: team.name,
    message: `Current team set to ${team.name}`,
  })
}
