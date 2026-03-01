/**
 * Trade block API: list (league or own), add entry.
 * GET ?team_id=uuid for one team, or no param for league-wide.
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get("team_id")

    let query = supabase
      .from("trade_block_entries")
      .select(
        `
        id,
        team_id,
        pokemon_id,
        is_tera_captain,
        note,
        active,
        updated_at,
        team:teams(id, name),
        pokemon:pokemon(id, name)
      `
      )
      .eq("active", true)

    if (teamId) {
      query = query.eq("team_id", teamId)
    }

    const { data, error } = await query.order("updated_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ entries: data ?? [] })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { team_id, pokemon_id, is_tera_captain, note } = body
    if (!team_id || !pokemon_id) {
      return NextResponse.json(
        { error: "team_id and pokemon_id are required" },
        { status: 400 }
      )
    }

    const { data: entry, error } = await supabase
      .from("trade_block_entries")
      .insert({
        team_id,
        pokemon_id,
        is_tera_captain: !!is_tera_captain,
        note: note ?? null,
        active: true,
      })
      .select(
        `
        id,
        team_id,
        pokemon_id,
        is_tera_captain,
        note,
        active,
        updated_at
      `
      )
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "This Pokémon is already on your trade block" },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ entry })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
