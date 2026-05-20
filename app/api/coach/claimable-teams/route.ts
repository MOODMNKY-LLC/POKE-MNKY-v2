/**
 * GET /api/coach/claimable-teams
 * Unassigned teams in the current season for self-service claim.
 */

import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCoachIdForUser, resolveCoachTeamForSeason } from "@/lib/coach-team-context"

export async function GET() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: season } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("is_current", true)
    .maybeSingle()

  if (!season?.id) {
    return NextResponse.json({ error: "No current season configured" }, { status: 404 })
  }

  const { team: existingTeam } = await resolveCoachTeamForSeason(
    supabase,
    user.id,
    season.id
  )

  const { data: teams, error } = await supabase
    .from("teams")
    .select("id, name, division, conference, logo_url, avatar_url, coach_id")
    .eq("season_id", season.id)
    .is("coach_id", null)
    .order("name", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const coachId = await getCoachIdForUser(supabase, user.id)

  return NextResponse.json({
    season: { id: season.id, name: season.name },
    teams: teams ?? [],
    alreadyAssigned: !!existingTeam,
    currentTeam: existingTeam
      ? { id: existingTeam.id, name: existingTeam.name }
      : null,
    hasCoachRecord: !!coachId,
  })
}
