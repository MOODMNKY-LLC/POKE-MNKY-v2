/**
 * GET: List pending Tera assignment windows for the current user's team (not expired, not completed).
 * Returns received_pokemon (from trade offer) with id, name, primary_type for Tera type picker.
 */

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const POKEMON_TYPES = [
  "normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison",
  "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy",
] as const

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date().toISOString()
    const { data: teams } = await supabase
      .from("coaches")
      .select("id")
      .eq("user_id", user.id)

    const coachIds = (teams ?? []).map((c: any) => c.id)
    if (coachIds.length === 0) {
      return NextResponse.json({ windows: [] })
    }

    const { data: teamRows } = await supabase
      .from("teams")
      .select("id")
      .in("coach_id", coachIds)
    const teamIds = (teamRows ?? []).map((t: any) => t.id)
    if (teamIds.length === 0) {
      return NextResponse.json({ windows: [] })
    }

    const { data: windows, error } = await supabase
      .from("tera_assignment_windows")
      .select(
        `
        id,
        league_trade_offer_id,
        receiving_team_id,
        expires_at,
        completed,
        created_at
      `
      )
      .in("receiving_team_id", teamIds)
      .eq("completed", false)
      .gt("expires_at", now)
      .order("expires_at", { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const list = windows ?? []

    const withPokemon = await Promise.all(
      list.map(async (w: any) => {
        const { data: offer } = await supabase
          .from("league_trade_offers")
          .select("offering_team_id, receiving_team_id, offered_pokemon_ids, requested_pokemon_ids")
          .eq("id", w.league_trade_offer_id)
          .single()
        const ids =
          w.receiving_team_id === (offer as any)?.receiving_team_id
            ? ((offer as any)?.offered_pokemon_ids ?? []) as string[]
            : ((offer as any)?.requested_pokemon_ids ?? []) as string[]
        const received: Array<{ id: string; name: string; primary_type: string }> = []
        for (const pid of ids) {
          const { data: p } = await supabase
            .from("pokemon")
            .select("id, name, type1")
            .eq("id", pid)
            .single()
          if (p) {
            const primary = p.type1 != null ? String(p.type1).toLowerCase() : "normal"
            received.push({
              id: p.id,
              name: p.name ?? "Unknown",
              primary_type: POKEMON_TYPES.includes(primary as any) ? primary : "normal",
            })
          }
        }
        return { ...w, received_pokemon: received, all_types: POKEMON_TYPES }
      })
    )

    return NextResponse.json({ windows: withPokemon })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
