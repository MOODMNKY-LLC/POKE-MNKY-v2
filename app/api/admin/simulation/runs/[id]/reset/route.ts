/**
 * POST /api/admin/simulation/runs/[id]/reset
 * Scoped UUID domain reset for sandbox sim runs only (sim_* tables).
 * Not public; requires SIM_SANDBOX_V2 + demo operator allowlist gate.
 * Does not delete append-only steps/events evidence; clears domain tables + cursor.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import {
  isSimSandboxV2Enabled,
  SIM_V2_DISABLED_MESSAGE,
} from "@/lib/season-sim/flags"
import { requireSimDemoOperator } from "@/lib/season-sim/demo-allowlist"
import { assertSandboxRunOperatorAccess } from "@/lib/season-sim/run-access"
import { getRun, seedSandboxDraftDomain } from "@/lib/season-sim/run-service"
import { buildProvisionalDemoConfig } from "@/lib/season-sim/config"
import { SandboxIsolationError } from "@/lib/season-sim/sandbox-guard"

export async function POST(
  _request: NextRequest,
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
  try {
    const supabase = createServiceRoleClient()
    const access = await assertSandboxRunOperatorAccess(supabase, id, operator)
    if ("response" in access) return access.response
    const run = access.run

    const { data, error } = await supabase.rpc("sim_reset_run_domain", {
      p_run_id: id,
      p_keep_config: true,
    })
    if (error) {
      return NextResponse.json(
        { error: error.message, code: "RESET_FAILED" },
        { status: 500 },
      )
    }
    const row = Array.isArray(data) ? data[0] : data
    if (!row?.ok) {
      return NextResponse.json(
        { error: String(row?.reason ?? "RESET_DENIED"), code: String(row?.reason ?? "RESET_DENIED") },
        { status: 409 },
      )
    }

    // Re-seed provisional draft pool/budgets for replay (same frozen config/seed).
    const config = buildProvisionalDemoConfig({
      master_seed: run.master_seed ?? undefined,
      team_count: Number((run.config as { team_count?: number })?.team_count ?? 12),
      total_rounds: Number((run.config as { total_rounds?: number })?.total_rounds ?? 10),
      selector_draft: (run.config as { selector_draft?: "random" | "heuristic" | "jev" })
        ?.selector_draft,
    })
    const { data: seats } = await supabase
      .from("sim_bot_seats")
      .select("team_id")
      .eq("run_id", id)
      .order("seat_index", { ascending: true })
    const teamIds = (seats ?? [])
      .map((s) => s.team_id as string | null)
      .filter((t): t is string => Boolean(t))

    if (run.season_id && teamIds.length) {
      await seedSandboxDraftDomain(supabase, {
        runId: id,
        seasonId: run.season_id,
        teamIds,
        config,
      })
    }

    const refreshed = await getRun(supabase, id)
    return NextResponse.json({
      ok: true,
      reason: "DOMAIN_RESET",
      run_id: id,
      status: refreshed.status,
      phase: refreshed.phase,
      note: "sim_* domain cleared; append-only evidence retained; draft pool re-seeded for replay",
    })
  } catch (err) {
    if (err instanceof SandboxIsolationError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      )
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    )
  }
}
