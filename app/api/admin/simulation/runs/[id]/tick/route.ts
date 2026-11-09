/**
 * POST /api/admin/simulation/runs/[id]/tick
 * Owner-scoped sandbox tick for demo operators (allowlisted session).
 * Uses service-role worker processing server-side — never exposes SIMULATION_WORKER_KEY.
 * Cannot tick other operators' runs; cannot tick without run id in path.
 */

import { NextRequest, NextResponse } from "next/server"
import { requireSimDemoOperator } from "@/lib/season-sim/demo-allowlist"
import { assertSandboxRunOperatorAccess } from "@/lib/season-sim/run-access"
import { createServiceRoleClient } from "@/lib/supabase/service"
import {
  isSimSandboxV2Enabled,
  isSimWorkerTickEnabled,
  SIM_V2_DISABLED_MESSAGE,
  SIM_WORKER_DISABLED_MESSAGE,
} from "@/lib/season-sim/flags"
import { processWorkerTick } from "@/lib/season-sim/run-service"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!isSimSandboxV2Enabled()) {
    return NextResponse.json(
      { error: SIM_V2_DISABLED_MESSAGE, code: "SIM_SANDBOX_V2_DISABLED" },
      { status: 503 },
    )
  }
  if (!isSimWorkerTickEnabled()) {
    return NextResponse.json(
      { error: SIM_WORKER_DISABLED_MESSAGE, code: "SIM_WORKER_TICK_DISABLED" },
      { status: 503 },
    )
  }

  const operator = await requireSimDemoOperator()
  if ("response" in operator) return operator.response

  const { id: runId } = await context.params
  const body = await request.json().catch(() => ({}))
  const maxSteps =
    typeof body.max_steps === "number" ? Math.min(body.max_steps, 50) : 25
  const workerId =
    typeof body.worker_id === "string" && body.worker_id.trim()
      ? body.worker_id.trim().slice(0, 80)
      : `op-${operator.userId.slice(0, 8)}`

  try {
    const supabase = createServiceRoleClient()
    const access = await assertSandboxRunOperatorAccess(
      supabase,
      runId,
      operator,
    )
    if ("response" in access) return access.response

    const results = await processWorkerTick(supabase, {
      run_id: runId,
      worker_id: workerId,
      max_steps: maxSteps,
    })

    return NextResponse.json({
      ok: true,
      run_id: runId,
      worker_id: workerId,
      results,
      note: "Owner-scoped operator tick; worker secret remains server-only",
    })
  } catch (err) {
    console.error("[simulation/runs/id/tick]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    )
  }
}
