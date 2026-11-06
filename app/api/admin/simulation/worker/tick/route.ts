/**
 * POST /api/admin/simulation/worker/tick
 * Bounded foundation tick. OFF by default (SIM_WORKER_TICK_ENABLED).
 * Auth: league admin session OR SIMULATION_WORKER_KEY / SIMULATION_API_KEY bearer
 * scoped to sandbox run ticks only (never exposed as service_role).
 */

import { NextRequest, NextResponse } from "next/server"
import { requireLeagueAdmin } from "@/lib/admin-api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service"
import {
  isSimSandboxV2Enabled,
  isSimWorkerTickEnabled,
  SIM_V2_DISABLED_MESSAGE,
  SIM_WORKER_DISABLED_MESSAGE,
} from "@/lib/season-sim/flags"
import { processWorkerTick } from "@/lib/season-sim/run-service"

function workerKeyValid(request: NextRequest): boolean {
  const key =
    request.headers.get("x-simulation-worker-key")?.trim() ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim()
  const expected =
    process.env.SIMULATION_WORKER_KEY?.trim() ||
    process.env.SIMULATION_API_KEY?.trim()
  return Boolean(expected && key && key === expected)
}

export async function POST(request: NextRequest) {
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

  const keyOk = workerKeyValid(request)
  if (!keyOk) {
    const admin = await requireLeagueAdmin()
    if ("response" in admin) return admin.response
  }

  const body = await request.json().catch(() => ({}))
  const workerId =
    typeof body.worker_id === "string" && body.worker_id.trim()
      ? body.worker_id.trim()
      : `tick-${crypto.randomUUID()}`
  const runId = typeof body.run_id === "string" ? body.run_id : undefined
  const maxSteps =
    typeof body.max_steps === "number" ? Math.min(body.max_steps, 50) : 25

  try {
    const results = await processWorkerTick(createServiceRoleClient(), {
      run_id: runId,
      worker_id: workerId,
      max_steps: maxSteps,
    })
    return NextResponse.json({
      ok: true,
      worker_id: workerId,
      results,
      note: "Foundation ticks only; domain units block without fabricating results.",
    })
  } catch (err) {
    console.error("[simulation/worker/tick]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    )
  }
}
