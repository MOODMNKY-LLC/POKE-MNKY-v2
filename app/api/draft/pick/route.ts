import { createServiceRoleClient } from "@/lib/supabase/service"
import { DraftSystem } from "@/lib/draft-system"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { pokemon_name, team_id, season_id } = body

    if (!pokemon_name || !team_id || !season_id) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: pokemon_name, team_id, season_id" },
        { status: 400 },
      )
    }

    // Get active draft session
    const draftSystem = new DraftSystem()
    const session = await draftSystem.getActiveSession(season_id)

    if (!session) {
      return NextResponse.json({ success: false, error: "No active draft session found" }, { status: 404 })
    }

    // Make the pick
    const result = await draftSystem.makePick(session.id, team_id, pokemon_name)

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true, pick: result.pick })
  } catch (error: any) {
    console.error("Draft pick error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
