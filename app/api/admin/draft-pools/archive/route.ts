/**
 * POST /api/admin/draft-pools/archive
 * Save current season_draft_pool to draft_pools (archived snapshot)
 * Body: { season_id, name, source_metadata? }
 * Admin/commissioner only
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
    const { season_id, name, source_metadata = {} } = body

    if (!season_id || !name) {
      return NextResponse.json(
        { error: "season_id and name are required" },
        { status: 400 }
      )
    }

    const service = createServiceRoleClient()

    // Fetch season_draft_pool for this season
    const { data: poolRows, error: fetchErr } = await service
      .from("season_draft_pool")
      .select("pokemon_id, assigned_points, is_included")
      .eq("season_id", season_id)

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    }

    if (!poolRows || poolRows.length === 0) {
      return NextResponse.json(
        { error: "No Pokemon in season draft pool. Generate a draft pool first." },
        { status: 400 }
      )
    }

    // Create draft_pools record
    const { data: pool, error: insertErr } = await service
      .from("draft_pools")
      .insert({
        season_id,
        name,
        rules_notes: `Archived from season_draft_pool. ${poolRows.length} Pokemon.`,
        locked: false,
        source_metadata: { ...source_metadata, source: "season_draft_pool" },
      })
      .select("id")
      .single()

    if (insertErr) {
      if (insertErr.code === "23505") {
        return NextResponse.json(
          { error: `A pool named "${name}" already exists for this season` },
          { status: 400 }
        )
      }
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    // Copy to draft_pool_pokemon_master (season_draft_pool uses pokemon_master)
    const toInsert = poolRows.map((row: { pokemon_id: string; assigned_points: number | null; is_included: boolean }) => ({
      draft_pool_id: pool.id,
      pokemon_master_id: row.pokemon_id,
      assigned_points: row.assigned_points ?? null,
      is_included: row.is_included ?? true,
    }))

    const { error: batchErr } = await service.from("draft_pool_pokemon_master").insert(toInsert)

    if (batchErr) {
      await service.from("draft_pools").delete().eq("id", pool.id)
      return NextResponse.json({ error: batchErr.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      pool_id: pool.id,
      pokemon_count: toInsert.length,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
