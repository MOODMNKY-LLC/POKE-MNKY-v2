import { NextRequest, NextResponse } from "next/server"
import { requireLeagueAdmin } from "@/lib/admin-api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service"
import {
  isSimSandboxV2Enabled,
  SIM_V2_DISABLED_MESSAGE,
} from "@/lib/season-sim/flags"
import { acceptCommand, newCommandId } from "@/lib/season-sim/run-service"
import type { SimAdvanceUnit } from "@/lib/season-sim/types"

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

  const admin = await requireLeagueAdmin()
  if ("response" in admin) return admin.response

  const { id } = await context.params
  const body = await request.json().catch(() => ({}))
  const commandId =
    typeof body.command_id === "string" && body.command_id
      ? body.command_id
      : newCommandId()
  const unit = (body.unit as SimAdvanceUnit | undefined) ?? "foundation"
  const n = typeof body.n === "number" ? body.n : 1
  const expectedStepSeq = Number(body.expected_step_seq)
  const expectedRunVersion = Number(body.expected_run_version)

  if (!Number.isFinite(expectedStepSeq) || !Number.isFinite(expectedRunVersion)) {
    return NextResponse.json(
      {
        error: "expected_step_seq and expected_run_version are required",
        code: "VALIDATION_FAILED",
      },
      { status: 422 },
    )
  }

  const supabase = createServiceRoleClient()
  const result = await acceptCommand(supabase, id, {
    command_id: commandId,
    command_type: "advance",
    unit,
    n,
    expected_step_seq: expectedStepSeq,
    expected_run_version: expectedRunVersion,
  })

  if ("status" in result && result.status === 409) {
    return NextResponse.json(
      { error: result.message, code: result.code },
      { status: 409 },
    )
  }

  return NextResponse.json(result, { status: 202 })
}
