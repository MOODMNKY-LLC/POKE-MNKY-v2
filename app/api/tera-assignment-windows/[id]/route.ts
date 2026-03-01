/**
 * PATCH: Complete a Tera assignment window (choose Tera types or decline).
 * Body: { action: "assign" | "decline", tera_types?: string[] } (assign: exactly 3 types, primary required)
 *   or { action: "assign", tera_assignments?: { pokemon_id: string, tera_types: string[] }[] }
 * Resolution is stored and applied to draft_picks when the trade executes.
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const POKEMON_TYPES = [
  "normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison",
  "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy",
] as const

function isValidType(t: string): boolean {
  return POKEMON_TYPES.includes(t.toLowerCase() as any)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const action = body?.action as string
    const teraTypes = body?.tera_types as string[] | undefined
    const teraAssignments = body?.tera_assignments as Array<{ pokemon_id: string; tera_types: string[] }> | undefined

    if (action !== "assign" && action !== "decline") {
      return NextResponse.json(
        { error: "action must be 'assign' or 'decline'" },
        { status: 400 }
      )
    }

    const { data: window, error: fetchErr } = await supabase
      .from("tera_assignment_windows")
      .select("id, completed, expires_at, receiving_team_id, league_trade_offer_id")
      .eq("id", id)
      .single()

    if (fetchErr || !window) {
      return NextResponse.json({ error: "Window not found" }, { status: 404 })
    }
    if ((window as any).completed) {
      return NextResponse.json({ error: "Window already completed" }, { status: 400 })
    }
    if (new Date((window as any).expires_at) <= new Date()) {
      return NextResponse.json({ error: "Window expired" }, { status: 400 })
    }

    const TERA_BUDGET = 15
    let resolution: { assignments: Array<{ pokemon_id: string; tera_types: string[] }> } | null = null

    if (action === "assign") {
      const assignments: Array<{ pokemon_id: string; tera_types: string[] }> = []
      if (teraAssignments && Array.isArray(teraAssignments) && teraAssignments.length > 0) {
        for (const a of teraAssignments) {
          if (!a.pokemon_id || !Array.isArray(a.tera_types) || a.tera_types.length !== 3) {
            return NextResponse.json(
              { error: "Each assignment must have pokemon_id and exactly 3 tera_types" },
              { status: 400 }
            )
          }
          const types = a.tera_types.map((t) => String(t).toLowerCase()).filter(isValidType)
          if (types.length !== 3) {
            return NextResponse.json(
              { error: "Each tera_types must be exactly 3 valid Pokémon types" },
              { status: 400 }
            )
          }
          const { data: p } = await supabase
            .from("pokemon")
            .select("id, type1")
            .eq("id", a.pokemon_id)
            .single()
          const primary = p?.type1 != null ? String(p.type1).toLowerCase() : "normal"
          if (!types.includes(primary)) {
            return NextResponse.json(
              { error: `Primary type (${primary}) must be one of the 3 Tera types for this Pokémon` },
              { status: 400 }
            )
          }
          assignments.push({ pokemon_id: a.pokemon_id, tera_types: types })
        }
      } else if (Array.isArray(teraTypes) && teraTypes.length === 3) {
        const { data: offer } = await supabase
          .from("league_trade_offers")
          .select("offered_pokemon_ids")
          .eq("id", (window as any).league_trade_offer_id)
          .single()
        const firstId = (offer?.offered_pokemon_ids as string[])?.[0]
        if (!firstId) {
          return NextResponse.json(
            { error: "No Pokémon in this trade to assign Tera types to" },
            { status: 400 }
          )
        }
        const types = teraTypes.map((t) => String(t).toLowerCase()).filter(isValidType)
        if (types.length !== 3) {
          return NextResponse.json(
            { error: "tera_types must be exactly 3 valid Pokémon types" },
            { status: 400 }
          )
        }
        const { data: p } = await supabase
          .from("pokemon")
          .select("id, type1")
          .eq("id", firstId)
          .single()
        const primary = p?.type1 != null ? String(p.type1).toLowerCase() : "normal"
        if (!types.includes(primary)) {
          return NextResponse.json(
            { error: `Primary type (${primary}) must be one of the 3 Tera types` },
            { status: 400 }
          )
        }
        assignments.push({ pokemon_id: firstId, tera_types: types })
      } else {
        return NextResponse.json(
          { error: "assign requires tera_types (array of 3) or tera_assignments" },
          { status: 400 }
        )
      }
      const receivingTeamId = (window as any).receiving_team_id
      const { data: offer } = await supabase
        .from("league_trade_offers")
        .select("season_id")
        .eq("id", (window as any).league_trade_offer_id)
        .single()
      const sid = (offer as any)?.season_id
      let currentSum = 0
      if (sid) {
        const { data: currentTeraPicks } = await supabase
          .from("draft_picks")
          .select("points_snapshot")
          .eq("season_id", sid)
          .eq("team_id", receivingTeamId)
          .eq("status", "active")
          .eq("is_tera_captain", true)
        currentSum = (currentTeraPicks ?? []).reduce((s: number, p: any) => s + (p.points_snapshot ?? 0), 0)
      }
      let newSum = 0
      for (const a of assignments) {
        const { data: p } = await supabase.from("pokemon").select("draft_points").eq("id", a.pokemon_id).single()
        newSum += (p as any)?.draft_points ?? 0
      }
      if (sid && currentSum + newSum > TERA_BUDGET) {
        return NextResponse.json(
          { error: `Tera budget would exceed ${TERA_BUDGET} points (current: ${currentSum}, adding: ${newSum})` },
          { status: 400 }
        )
      }
      resolution = { assignments }
    }

    const { error: updateErr } = await supabase
      .from("tera_assignment_windows")
      .update({ completed: true, resolution: resolution ?? null })
      .eq("id", id)

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

    return NextResponse.json({
      ok: true,
      action,
      message: action === "assign" ? "Tera types recorded. They will apply when the trade executes." : "Declined; promoting later will cost 3 transaction points.",
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
