/**
 * GET /api/admin/simulation/runs/[id] — progress snapshot
 */

import { NextResponse } from "next/server"
import { requireLeagueAdmin } from "@/lib/admin-api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service"
import {
  isSimSandboxV2Enabled,
  SIM_V2_DISABLED_MESSAGE,
} from "@/lib/season-sim/flags"
import {
  getDraftEvidence,
  getRun,
  toProgress,
} from "@/lib/season-sim/run-service"
import { SandboxIsolationError } from "@/lib/season-sim/sandbox-guard"

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!isSimSandboxV2Enabled()) {
    return NextResponse.json(
      { error: SIM_V2_DISABLED_MESSAGE, code: "SIM_SANDBOX_V2_DISABLED" },
      { status: 503 },
    )
  }

  const admin = await requireLeagueAdmin()
  if ("response" in admin) return admin.response

  const { id } = await context.params
  try {
    const supabase = createServiceRoleClient()
    const run = await getRun(supabase, id)
    const draft = await getDraftEvidence(supabase, id)
    return NextResponse.json({
      progress: toProgress(run),
      draft,
    })
  } catch (err) {
    if (err instanceof SandboxIsolationError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      )
    }
    const message = err instanceof Error ? err.message : "Internal server error"
    const status = message === "Run not found" ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
