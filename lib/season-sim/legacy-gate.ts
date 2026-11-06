import { NextResponse } from "next/server"
import {
  isLegacySimulationWritesEnabled,
  LEGACY_SIM_WRITES_DISABLED_MESSAGE,
} from "@/lib/season-sim/flags"

/** Block unsafe Mock Draft Demo mutation routes unless explicitly re-enabled. */
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
