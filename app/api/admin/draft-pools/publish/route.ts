/**
 * POST /api/admin/draft-pools/publish
 * Publish season_draft_pool → draft_pool for the live draft board.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { getDraftStaffProfile } from "@/lib/admin-draft-auth"
import {
  DraftPoolPublishError,
  publishSeasonDraftPoolToBoard,
} from "@/lib/draft-pool-publish"

export async function POST(request: NextRequest) {
  try {
    const staff = await getDraftStaffProfile()
    if (!staff.ok) {
      return NextResponse.json({ success: false, error: staff.error }, { status: staff.status })
    }

    const body = await request.json().catch(() => ({}))
    let seasonId = typeof body?.season_id === "string" ? body.season_id.trim() : ""

    if (!seasonId) {
      const supabase = createServiceRoleClient()
      const { data: season } = await supabase
        .from("seasons")
        .select("id")
        .eq("is_current", true)
        .single()
      if (!season?.id) {
        return NextResponse.json(
          { success: false, error: "No current season found" },
          { status: 404 }
        )
      }
      seasonId = season.id
    }

    const force = body?.force === true && staff.role === "admin"
    const pruneAbsent = body?.prune_absent === true

    const result = await publishSeasonDraftPoolToBoard(seasonId, {
      prune_absent: pruneAbsent,
      force,
    })

    return NextResponse.json({
      success: true,
      season_id: seasonId,
      ...result,
    })
  } catch (err) {
    if (err instanceof DraftPoolPublishError) {
      return NextResponse.json(
        { success: false, error: err.message, code: err.code },
        { status: err.status }
      )
    }
    console.error("[draft-pools/publish]", err)
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Publish failed",
      },
      { status: 500 }
    )
  }
}
