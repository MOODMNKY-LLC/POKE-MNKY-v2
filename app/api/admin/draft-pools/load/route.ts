/**
 * POST /api/admin/draft-pools/load
 * Load archived draft pool into season_draft_pool for a target season
 * Body: { archived_pool_id, target_season_id }
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
    const { archived_pool_id, target_season_id } = body

    if (!archived_pool_id || !target_season_id) {
      return NextResponse.json(
        { error: "archived_pool_id and target_season_id are required" },
        { status: 400 }
      )
    }

    const service = createServiceRoleClient()

    // Fetch archived pool contents from draft_pool_pokemon_master
    const { data: poolRows, error: fetchErr } = await service
      .from("draft_pool_pokemon_master")
      .select("pokemon_master_id, assigned_points, is_included")
      .eq("draft_pool_id", archived_pool_id)
      .eq("is_included", true)

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    }

    if (!poolRows || poolRows.length === 0) {
      return NextResponse.json(
        { error: "Archived pool is empty or not found" },
        { status: 400 }
      )
    }

    // Upsert into season_draft_pool for target season
    let inserted = 0
    for (const row of poolRows) {
      const { error: upsertErr } = await service.from("season_draft_pool").upsert(
        {
          season_id: target_season_id,
          pokemon_id: row.pokemon_master_id,
          is_included: row.is_included ?? true,
          assigned_points: row.assigned_points ?? null,
        },
        { onConflict: "season_id,pokemon_id" }
      )
      if (!upsertErr) inserted++
    }

    return NextResponse.json({
      success: true,
      inserted,
      total: poolRows.length,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
