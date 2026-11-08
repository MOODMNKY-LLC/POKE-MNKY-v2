import { NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import {
  assertSeasonIsNotSandbox,
  SandboxIsolationError,
} from "@/lib/season-sim/sandbox-guard"

/** Competitive admin mutations must refuse sandbox seasons (service_role safe). */
export async function refuseSandboxSeasonOrResponse(
  supabase: SupabaseClient,
  seasonId: string,
): Promise<NextResponse | null> {
  try {
    await assertSeasonIsNotSandbox(supabase, seasonId)
    return null
  } catch (err) {
    if (err instanceof SandboxIsolationError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      )
    }
    throw err
  }
}
