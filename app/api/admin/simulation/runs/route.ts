/**
 * POST /api/admin/simulation/runs — create sandbox season + foundation run
 * Requires SIM_SANDBOX_V2=true and league admin session.
 */

import { NextRequest, NextResponse } from "next/server"
import { requireLeagueAdmin } from "@/lib/admin-api-auth"
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

  const admin = await requireLeagueAdmin()
  if ("response" in admin) return admin.response

  const body = await request.json().catch(() => ({}))
  const masterSeed =
    typeof body.master_seed === "string" ? body.master_seed : undefined
  const teamCount =
    typeof body.team_count === "number" ? body.team_count : undefined
  const queueImmediately = body.queue_immediately !== false

  try {
    const supabase = createServiceRoleClient()
    const created = await createSandboxSimulationRun(supabase, admin.userId, {
      master_seed: masterSeed,
      team_count: teamCount,
      queue_immediately: queueImmediately,
    })

    return NextResponse.json(
      {
        run: toProgress(created.run),
        season_id: created.season_id,
        team_ids: created.team_ids,
        rules_label: "provisional_demo_v0",
        note: "Synthetic seats only — no auth.users / real coaches created.",
      },
      { status: 201 },
    )
  } catch (err) {
    console.error("[simulation/runs POST]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    )
  }
}
