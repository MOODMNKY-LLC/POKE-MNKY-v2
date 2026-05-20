/**
 * POST /api/admin/draft-pool/bootstrap
 * Cold-start: hydrate catalog (Showdown + PokeAPI Edge Functions / pokenode-ts),
 * seed draft_pool from Showdown tiers, trim to generation, build pokemon_master.
 */

import { NextRequest, NextResponse } from "next/server"

export const maxDuration = 120
import { getDraftStaffProfile } from "@/lib/admin-draft-auth"
import { bootstrapDraftPoolForSeason } from "@/lib/draft-pool-bootstrap"

export async function POST(request: NextRequest) {
  try {
    const staff = await getDraftStaffProfile()
    if (!staff.ok) {
      return NextResponse.json({ error: staff.error }, { status: staff.status })
    }

    let season_id: string | undefined
    let generation = 9
    try {
      const body = await request.json()
      if (typeof body?.season_id === "string" && body.season_id) {
        season_id = body.season_id
      }
      if (body?.generation != null) {
        generation = Number(body.generation)
      }
    } catch {
      // empty body
    }

    if (!season_id) {
      const service = await import("@/lib/supabase/service").then((m) => m.createServiceRoleClient())
      const { data: season } = await service
        .from("seasons")
        .select("id")
        .eq("is_current", true)
        .maybeSingle()
      season_id = season?.id
    }

    if (!season_id) {
      return NextResponse.json({ error: "No current season" }, { status: 400 })
    }

    const result = await bootstrapDraftPoolForSeason({ season_id, generation })
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
