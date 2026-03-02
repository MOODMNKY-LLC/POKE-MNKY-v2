/**
 * GET /api/coach/teams
 * Returns all teams the authenticated coach is assigned to (across seasons),
 * with is_current true for the profile's team_id.
 */

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUserProfile } from "@/lib/rbac"

export async function GET() {
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
    return NextResponse.json({ teams: [], message: "Not a coach" })
  }

  const { data: coach } = await supabase
    .from("coaches")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (!coach) {
    return NextResponse.json({ teams: [], message: "No coach record" })
  }

  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id, name, avatar_url, logo_url, wins, losses, differential, division, conference, season_id")
    .eq("coach_id", coach.id)
    .order("created_at", { ascending: false })

  if (teamsError) {
    return NextResponse.json({ error: teamsError.message }, { status: 500 })
  }

  const seasonIds = [...new Set((teams ?? []).map((t) => t.season_id).filter(Boolean))]
  const { data: seasons } =
    seasonIds.length > 0
      ? await supabase.from("seasons").select("id, name").in("id", seasonIds)
      : { data: [] }
  const seasonMap = new Map((seasons ?? []).map((s) => [s.id, s.name]))

  const currentTeamId = profile.team_id ?? null
  const result = (teams ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    avatar_url: t.avatar_url,
    logo_url: t.logo_url,
    wins: t.wins,
    losses: t.losses,
    differential: t.differential,
    division: t.division,
    conference: t.conference,
    season_id: t.season_id,
    season_name: t.season_id ? seasonMap.get(t.season_id) ?? null : null,
    is_current: t.id === currentTeamId,
  }))

  return NextResponse.json({ teams: result })
}
