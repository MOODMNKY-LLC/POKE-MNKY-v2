/**
 * POST /api/admin/draft-pool-generate
 * Body: { season_id, generation?, game_code?, include_legendary?, include_mythical?, include_paradox? }
 * Inserts into season_draft_pool from pokemon_master with filters. Admin/commissioner only.
 */

import { NextRequest, NextResponse } from "next/server"
import { generateDraftPoolFromMaster } from "@/lib/draft-pool-ops"
import { getDraftStaffProfile } from "@/lib/admin-draft-auth"

export async function POST(request: NextRequest) {
  try {
    const staff = await getDraftStaffProfile()
    if (!staff.ok) {
      return NextResponse.json({ error: staff.error }, { status: staff.status })
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

    const { inserted } = await generateDraftPoolFromMaster({
      season_id,
      generation,
      game_code,
      include_legendary,
      include_mythical,
      include_paradox,
    })

    return NextResponse.json({ ok: true, inserted })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
