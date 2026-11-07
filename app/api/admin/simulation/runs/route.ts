/**
 * POST /api/admin/simulation/runs — create sandbox season + foundation run
 * Requires SIM_SANDBOX_V2=true and league admin session.
 */

import { NextRequest, NextResponse } from "next/server"
import { requireSimDemoOperator } from "@/lib/season-sim/demo-allowlist"
import { createServiceRoleClient } from "@/lib/supabase/service"
import {
  isSimSandboxV2Enabled,
  SIM_V2_DISABLED_MESSAGE,
} from "@/lib/season-sim/flags"
import {
  createSandboxSimulationRun,
  toProgress,
} from "@/lib/season-sim/run-service"

export async function POST(request: NextRequest) {
  if (!isSimSandboxV2Enabled()) {
    return NextResponse.json(
      { error: SIM_V2_DISABLED_MESSAGE, code: "SIM_SANDBOX_V2_DISABLED" },
      { status: 503 },
    )
  }

  const admin = await requireSimDemoOperator()
  if ("response" in admin) return admin.response

  const body = await request.json().catch(() => ({}))
  const masterSeed =
    typeof body.master_seed === "string" ? body.master_seed : undefined
  const teamCount =
    typeof body.team_count === "number" ? body.team_count : undefined
  const totalRounds =
    typeof body.total_rounds === "number" ? body.total_rounds : undefined
  const budgetTotal =
    typeof body.budget_total === "number" ? body.budget_total : undefined
  const scheduleWeeks =
    typeof body.schedule_weeks === "number" ? body.schedule_weeks : undefined
  const playoffSize =
    typeof body.playoff_size === "number" ? body.playoff_size : undefined
  const selectorDraft =
    body.selector_draft === "random" ||
    body.selector_draft === "heuristic" ||
    body.selector_draft === "jev"
      ? body.selector_draft
      : undefined
  const queueImmediately = body.queue_immediately !== false

  try {
    const supabase = createServiceRoleClient()
    const created = await createSandboxSimulationRun(supabase, admin.userId, {
      master_seed: masterSeed,
      team_count: teamCount,
      total_rounds: totalRounds,
      budget_total: budgetTotal,
      schedule_weeks: scheduleWeeks,
      playoff_size: playoffSize,
      selector_draft: selectorDraft,
      queue_immediately: queueImmediately,
    })

    return NextResponse.json(
      {
        run: toProgress(created.run),
        season_id: created.season_id,
        team_ids: created.team_ids,
        rules_label: "provisional_demo_v0",
        note: "Synthetic seats only — no auth.users / real coaches created. Draft pool/budgets seeded under provisional_demo_v0.",
      },
      { status: 201 },
    )
  } catch (err) {
    console.error("[simulation/runs POST]", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    const infeasible = /INFEASIBLE_/.test(message)
    return NextResponse.json(
      {
        error: message,
        code: infeasible ? message.split(":")[0] : "CREATE_FAILED",
      },
      { status: infeasible ? 422 : 500 },
    )
  }
}
