import { NextResponse } from "next/server"
import {
  isLegacySimulationWritesEnabled,
  LEGACY_SIM_WRITES_DISABLED_MESSAGE,
} from "@/lib/season-sim/flags"

/**
 * Block unsafe Mock Draft Demo mutation routes unless explicitly re-enabled.
 * Name-based reset is permanently retired even when the legacy flag is on.
 */
export function legacySimulationWriteDeniedResponse(): NextResponse | null {
  if (isLegacySimulationWritesEnabled()) return null
  return NextResponse.json(
    {
      error: LEGACY_SIM_WRITES_DISABLED_MESSAGE,
      code: "LEGACY_SIM_WRITES_DISABLED",
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
