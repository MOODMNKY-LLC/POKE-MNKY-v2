/**
 * Draft pick by Pokémon name (session-based).
 * Used by the draft board UI which sends pokemon_name, team_id, season_id.
 * Delegates to DraftSystem.makePick after resolving the active session and validating turn.
 *
 * POST /api/draft/pick-by-name
 * Body: { season_id: string, team_id: string, pokemon_name: string }
 */

import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { DraftSystem } from "@/lib/draft-system"

const pickByNameSchema = {
  season_id: "string",
  team_id: "string",
  pokemon_name: "string",
} as const

function validateBody(body: unknown): { season_id: string; team_id: string; pokemon_name: string } | null {
  if (!body || typeof body !== "object") return null
  const b = body as Record<string, unknown>
  if (
    typeof b.season_id !== "string" ||
    typeof b.team_id !== "string" ||
    typeof b.pokemon_name !== "string"
  ) {
    return null
  }
  const name = (b.pokemon_name as string).trim()
  if (!name) return null
  return { season_id: b.season_id.trim(), team_id: b.team_id.trim(), pokemon_name: name }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = validateBody(body)
    if (!parsed) {
      return NextResponse.json(
        { success: false, error: "Invalid body: season_id, team_id, and pokemon_name (non-empty string) required" },
        { status: 400 }
      )
    }

    const { season_id, team_id, pokemon_name } = parsed
    const supabase = createServiceRoleClient()
    const draftSystem = new DraftSystem()

    const session = await draftSystem.getActiveSession(season_id)
    if (!session) {
      return NextResponse.json(
        { success: false, error: "No active draft session for this season" },
        { status: 404 }
      )
    }

    const turn = await draftSystem.getCurrentTurn(session.id)
    if (!turn || turn.teamId !== team_id) {
      return NextResponse.json(
        { success: false, error: "It's not your turn to pick" },
        { status: 403 }
      )
    }

    const { data: poolRow } = await supabase
      .from("draft_pool")
      .select("pokemon_name")
      .eq("season_id", season_id)
      .or("status.eq.available,status.is.null")
      .ilike("pokemon_name", pokemon_name)
      .limit(1)
      .maybeSingle()

    const resolvedName = poolRow?.pokemon_name ?? pokemon_name

    const result = await draftSystem.makePick(session.id, team_id, resolvedName)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error ?? "Failed to make pick" },
        { status: 422 }
      )
    }

    return NextResponse.json({
      success: true,
      pick: result.pick,
    })
  } catch (err) {
    console.error("[pick-by-name]", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
