import { NextResponse } from "next/server"
import { createBattle } from "@/lib/battle-engine"
import { createServerClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { format, team_a_id, team_b_id } = body

    // Get team rosters
    const { data: teamARoster } = await supabase.from("team_rosters").select("*").eq("team_id", team_a_id)

    const { data: teamBRoster } = await supabase.from("team_rosters").select("*").eq("team_id", team_b_id)

    const battleId = await createBattle(format, teamARoster || [], teamBRoster || [])

    return NextResponse.json({ battle_id: battleId, status: "created" })
  } catch (error) {
    console.error("[v0] Battle creation error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create battle" },
      { status: 500 },
    )
  }
}
