/**
 * GET /api/teams/[teamId]/roster-by-week?seasonId=uuid&week_number=1
 * Returns roster snapshot from team_roster_versions for the given week.
 * Used for week-aware roster view (prep integrity).
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getTeamRosterPicks } from "@/lib/team-roster-display"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params
    const { searchParams } = new URL(request.url)
    const seasonId = searchParams.get("seasonId")
    const weekParam = searchParams.get("week_number")

    if (!seasonId || weekParam == null || weekParam === "") {
      return NextResponse.json(
        { error: "seasonId and week_number are required" },
        { status: 400 }
      )
    }
    const weekNumber = parseInt(weekParam, 10)
    if (isNaN(weekNumber) || weekNumber < 1) {
      return NextResponse.json(
        { error: "week_number must be a positive integer" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: version, error: versionError } = await supabase
      .from("team_roster_versions")
      .select("snapshot")
      .eq("team_id", teamId)
      .eq("season_id", seasonId)
      .eq("week_number", weekNumber)
      .maybeSingle()

    if (versionError) {
      return NextResponse.json({ error: versionError.message }, { status: 500 })
    }

    const snapshot = (version?.snapshot ?? []) as Array<{
      pokemon_id: string
      points: number
      is_tera_captain?: boolean
      tera_types?: string[]
    }>
    if (snapshot.length === 0) {
      const active = await getTeamRosterPicks(supabase, teamId, seasonId)
      return NextResponse.json({
        team_id: teamId,
        season_id: seasonId,
        week_number: weekNumber,
        roster: active.map((p) => ({
          pokemon_id: p.pokemon_id,
          pokemon_name: p.pokemon.name,
          point_value: p.points_snapshot,
          is_tera_captain: false,
          tera_types: [] as string[],
        })),
        source: active.length > 0 ? "active_draft_picks" : "empty",
      })
    }

    const pokemonIds = snapshot.map((s) => s.pokemon_id)
    const { data: pokemonRows } = await supabase
      .from("pokemon")
      .select("id, name")
      .in("id", pokemonIds)
    const byId = new Map((pokemonRows ?? []).map((p: any) => [p.id, p]))

    const roster = snapshot.map((s) => ({
      pokemon_id: s.pokemon_id,
      pokemon_name: byId.get(s.pokemon_id)?.name ?? "Unknown",
      point_value: s.points,
      is_tera_captain: s.is_tera_captain ?? false,
      tera_types: s.tera_types ?? [],
    }))

    return NextResponse.json({
      team_id: teamId,
      season_id: seasonId,
      week_number: weekNumber,
      roster,
      source: "snapshot",
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
