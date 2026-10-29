/**
 * GET /api/admin/draft-pools/copy-sources
 * Previous season and archived pools an admin can copy into the current season.
 * Admin/commissioner only. Does not write.
 */

import { NextResponse } from "next/server"
import { getDraftStaffProfile } from "@/lib/admin-draft-auth"
import { CopyDraftPoolError, getDraftPoolCopySources } from "@/lib/draft-pool-copy"

export async function GET() {
  try {
    const staff = await getDraftStaffProfile()
    if (!staff.ok) {
      return NextResponse.json({ error: staff.error }, { status: staff.status })
    }

    const sources = await getDraftPoolCopySources()
    return NextResponse.json({ success: true, ...sources })
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
