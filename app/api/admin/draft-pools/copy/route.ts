/**
 * POST /api/admin/draft-pools/copy
 * Copy the previous season or an archived pool into the current season.
 * Board rows are marked available. Draft picks are not copied. Idempotent upsert.
 * Admin/commissioner only.
 *
 * Body: { source: "previous_season" | "archived_pool", archived_pool_id?: string }
 */

import { NextRequest, NextResponse } from "next/server"
import { getDraftStaffProfile } from "@/lib/admin-draft-auth"
import { CopyDraftPoolError, copyDraftPoolIntoCurrentSeason } from "@/lib/draft-pool-copy"
import type { DraftPoolCopySourceKind } from "@/lib/draft-pool-copy-plan"

function isSourceKind(value: unknown): value is DraftPoolCopySourceKind {
  return value === "previous_season" || value === "archived_pool"
}

export async function POST(request: NextRequest) {
  try {
    const staff = await getDraftStaffProfile()
    if (!staff.ok) {
      return NextResponse.json({ error: staff.error }, { status: staff.status })
    }

    const body = await request.json()
    if (!isSourceKind(body?.source)) {
      return NextResponse.json(
        { error: "source must be previous_season or archived_pool" },
        { status: 400 }
      )
    }
    if (body.source === "archived_pool" && typeof body.archived_pool_id !== "string") {
      return NextResponse.json({ error: "archived_pool_id is required" }, { status: 400 })
    }

    const result = await copyDraftPoolIntoCurrentSeason({
      source: body.source,
      archivedPoolId: body.source === "archived_pool" ? body.archived_pool_id : undefined,
    })

    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    if (err instanceof CopyDraftPoolError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
