import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { resolveCurrentSeasonId } from "@/lib/match-result-complete"

export async function GET() {
  try {
    const supabase = createServiceRoleClient()
    const seasonId = await resolveCurrentSeasonId(supabase)

    let query = supabase.from("teams").select("id, name, coach_name").order("name")

    if (seasonId) {
      query = query.eq("season_id", seasonId)
    }

    const { data: teams, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ teams: teams ?? [] })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load teams" },
      { status: 500 }
    )
  }
}
