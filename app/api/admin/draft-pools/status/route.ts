/**
 * GET /api/admin/draft-pools/status?season_id=
 * Pool readiness: season_draft_pool vs draft_pool counts.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { getDraftStaffProfile } from "@/lib/admin-draft-auth"
import { getDraftPoolStatus } from "@/lib/draft-pool-publish"

export async function GET(request: NextRequest) {
  try {
    const staff = await getDraftStaffProfile()
    if (!staff.ok) {
      return NextResponse.json({ success: false, error: staff.error }, { status: staff.status })
    }

    const { searchParams } = new URL(request.url)
    let seasonId = searchParams.get("season_id")?.trim() ?? ""

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

    const status = await getDraftPoolStatus(seasonId)

    return NextResponse.json({
      success: true,
      ready_for_draft: status.draft_pool_available > 0,
      ...status,
    })
  } catch (err) {
    console.error("[draft-pools/status]", err)
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Failed to load status",
      },
      { status: 500 }
    )
  }
}
