/**
 * Owner-scoped access for sandbox sim runs.
 * Allowlisted operators may only mutate/read their own runs unless they are
 * league admin/commissioner (still require requireSimDemoOperator upstream).
 */

import { NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import { unauthorizedJson } from "@/lib/admin-api-auth"
import { getRun } from "@/lib/season-sim/run-service"
import type { SimRunRow } from "@/lib/season-sim/types"
import { SandboxIsolationError } from "@/lib/season-sim/sandbox-guard"

type ServiceClient = SupabaseClient

export async function assertSandboxRunOperatorAccess(
  supabase: ServiceClient,
  runId: string,
  operator: { userId: string; role: string },
): Promise<{ run: SimRunRow } | { response: NextResponse }> {
  try {
    const run = await getRun(supabase, runId)
    if (run.owner_user_id === operator.userId) {
      return { run }
    }
    if (operator.role === "admin" || operator.role === "commissioner") {
      return { run }
    }
    return {
      response: unauthorizedJson(
        "Forbidden — sandbox run is owned by another operator",
        403,
      ),
    }
  } catch (err) {
    if (err instanceof SandboxIsolationError) {
      return {
        response: NextResponse.json(
          { error: err.message, code: err.code },
          { status: err.status },
        ),
      }
    }
    const message = err instanceof Error ? err.message : "Run not found"
    const status = message === "Run not found" ? 404 : 500
    return {
      response: NextResponse.json(
        { error: message, code: status === 404 ? "RUN_NOT_FOUND" : "RUN_ACCESS_ERROR" },
        { status },
      ),
    }
  }
}
