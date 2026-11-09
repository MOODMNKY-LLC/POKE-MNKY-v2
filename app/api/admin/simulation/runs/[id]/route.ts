/**
 * GET /api/admin/simulation/runs/[id] — progress + draft + season evidence
 * Owner-scoped (or league admin/commissioner under demo operator gate).
 */

import { NextResponse } from "next/server"
import { requireSimDemoOperator } from "@/lib/season-sim/demo-allowlist"
import { assertSandboxRunOperatorAccess } from "@/lib/season-sim/run-access"
import { createServiceRoleClient } from "@/lib/supabase/service"
import {
  isSimSandboxV2Enabled,
  SIM_V2_DISABLED_MESSAGE,
} from "@/lib/season-sim/flags"
import {
  getDraftEvidence,
  getSeasonEvidence,
  toProgress,
} from "@/lib/season-sim/run-service"

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

  const operator = await requireSimDemoOperator()
  if ("response" in operator) return operator.response

  const { id } = await context.params
  const supabase = createServiceRoleClient()
  const access = await assertSandboxRunOperatorAccess(supabase, id, operator)
  if ("response" in access) return access.response

  const draft = await getDraftEvidence(supabase, id)
  const season = await getSeasonEvidence(supabase, id)
  return NextResponse.json({
    progress: toProgress(access.run),
    draft,
    season,
  })
}
