/**
 * POST /api/admin/draft-pool-generate
 * Body: { season_id, generation?, game_code?, include_legendary?, include_mythical?, include_paradox? }
 * Inserts into season_draft_pool from pokemon_master with filters. Admin/commissioner only.
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    if (profile?.role !== "admin" && profile?.role !== "commissioner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const {
      season_id,
      generation,
      game_code,
      include_legendary = false,
      include_mythical = false,
      include_paradox = false,
    } = body

    if (!season_id) {
      return NextResponse.json({ error: "season_id required" }, { status: 400 })
    }

    const service = createServiceRoleClient()

    let query = service.from("pokemon_master").select("id, default_draft_points, is_legendary, is_mythical, is_paradox, generation")
    if (generation != null && generation !== "") {
      query = query.eq("generation", parseInt(String(generation), 10))
    }

    const { data: masters, error: masterErr } = await query
    if (masterErr) {
      return NextResponse.json({ error: masterErr.message }, { status: 500 })
    }

    let filtered = (masters ?? []) as any[]
    if (!include_legendary) {
      filtered = filtered.filter((m) => !m.is_legendary)
    }
    if (!include_mythical) {
      filtered = filtered.filter((m) => !m.is_mythical)
    }
    if (!include_paradox) {
      filtered = filtered.filter((m) => !m.is_paradox)
    }

    let pokemonIds = filtered.map((m: any) => m.id)
    if (game_code) {
      const { data: games } = await service
        .from("pokemon_games")
        .select("pokemon_id")
        .eq("game_code", game_code)
      const inGame = new Set((games ?? []).map((g: any) => g.pokemon_id))
      pokemonIds = pokemonIds.filter((id: string) => inGame.has(id))
    }

    let inserted = 0
    for (const pid of pokemonIds) {
      const points = filtered.find((m: any) => m.id === pid)?.default_draft_points ?? null
      const { error: insErr } = await service.from("season_draft_pool").upsert(
        {
          season_id,
          pokemon_id: pid,
          is_included: true,
          assigned_points: points,
        },
        { onConflict: "season_id,pokemon_id" }
      )
      if (!insErr) inserted++
    }

    return NextResponse.json({ ok: true, inserted })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
