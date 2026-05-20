/**
 * POST /api/admin/pokemon-master/backfill
 * Populates pokemon_master from draft_pool + reference tables. Admin/commissioner only.
 * Body: { dry_run?: boolean }
 */

import { NextRequest, NextResponse } from "next/server"
import { getDraftStaffProfile } from "@/lib/admin-draft-auth"
import {
  backfillPokemonMasterFromDraftPool,
  getPokemonMasterCount,
} from "@/lib/pokemon-master-backfill"

export async function GET() {
  try {
    const staff = await getDraftStaffProfile()
    if (!staff.ok) {
      return NextResponse.json({ error: staff.error }, { status: staff.status })
    }

    const service = await import("@/lib/supabase/service").then((m) => m.createServiceRoleClient())
    const [masterCount, draftPoolTotal, draftPoolWithGen] = await Promise.all([
      getPokemonMasterCount(),
      service.from("draft_pool").select("id", { count: "exact", head: true }),
      service
        .from("draft_pool")
        .select("id", { count: "exact", head: true })
        .not("generation", "is", null),
    ])

    const { count: gamesCount } = await service
      .from("pokemon_games")
      .select("id", { count: "exact", head: true })

    return NextResponse.json({
      success: true,
      pokemon_master_count: masterCount,
      draft_pool_rows_total: draftPoolTotal.count ?? 0,
      draft_pool_rows_with_generation: draftPoolWithGen.count ?? 0,
      pokemon_games_rows: gamesCount ?? 0,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const staff = await getDraftStaffProfile()
    if (!staff.ok) {
      return NextResponse.json({ error: staff.error }, { status: staff.status })
    }

    let dry_run = false
    let season_id: string | undefined
    let default_generation = 9
    try {
      const body = await request.json()
      dry_run = Boolean(body?.dry_run)
      if (typeof body?.season_id === "string" && body.season_id) {
        season_id = body.season_id
      }
      if (body?.default_generation != null) {
        default_generation = Number(body.default_generation)
      }
    } catch {
      // empty body is fine
    }

    const result = await backfillPokemonMasterFromDraftPool({
      dry_run,
      season_id,
      default_generation,
    })
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
