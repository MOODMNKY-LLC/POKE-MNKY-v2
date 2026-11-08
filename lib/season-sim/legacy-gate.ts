import { NextResponse } from "next/server"
import {
  LEGACY_SIM_WRITES_DISABLED_CODE,
  LEGACY_SIM_WRITES_DISABLED_MESSAGE,
  legacySimulationWriteDeniedResponse as canonicalLegacyWriteDenied,
} from "@/lib/league-simulation/legacy-simulation-writes-gate"

/**
 * Season-sim facade over the production cutover gate (PR37).
 * Name-based reset stays permanently retired even when legacy writes are re-enabled.
 */
export function legacySimulationWriteDeniedResponse(): NextResponse | null {
  const denied = canonicalLegacyWriteDenied()
  if (!denied) return null
  // Preserve v2 console "supported" hint used by season-sim UI.
  return NextResponse.json(
    {
      error: LEGACY_SIM_WRITES_DISABLED_MESSAGE,
      code: LEGACY_SIM_WRITES_DISABLED_CODE,
      supported: "/api/admin/simulation/runs",
    },
    { status: 410 },
  )
}

/** Permanently retire name-matching reset — never a safe bypass. */
export function legacyNameBasedResetDeniedResponse(): NextResponse {
  return NextResponse.json(
    {
      error:
        "Name-based Mock Draft Demo reset is permanently disabled. Sandbox purge must use explicit run/season UUIDs (not yet exposed). Prefer cancelling a foundation run.",
      code: "LEGACY_NAME_RESET_RETIRED",
      supported: "/api/admin/simulation/runs",
    },
    { status: 410 },
  )
}
