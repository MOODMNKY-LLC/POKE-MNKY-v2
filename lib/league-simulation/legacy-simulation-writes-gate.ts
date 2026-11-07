/**
 * First-cutover gate: fail-closed disable of legacy Mock Draft Demo / league
 * simulation mutation paths. Schema-independent (no is_sandbox / sim_* deps).
 *
 * Default OFF. Set SIM_LEGACY_SIMULATION_WRITES=true only for explicit emergency
 * re-enable after coordinator approval — not part of ordinary deploy.
 *
 * Gate alone does not drain in-flight or queued requests already past this check
 * on older deployments; see docs/season-sim/FIRST-CUTOVER-LEGACY-WRITES-GATE.md.
 */

import { NextResponse } from "next/server"

type EnvLike = Record<string, string | undefined>

function truthy(raw: string | undefined): boolean {
  const v = raw?.trim().toLowerCase()
  return v === "true" || v === "1" || v === "yes" || v === "on"
}

/** Re-enables legacy simulation mutation writers. Default off — fail closed. */
export function isLegacySimulationWritesEnabled(
  env: EnvLike = process.env,
): boolean {
  return truthy(env.SIM_LEGACY_SIMULATION_WRITES)
}

export const LEGACY_SIM_WRITES_DISABLED_CODE = "LEGACY_SIM_WRITES_DISABLED" as const

export const LEGACY_SIM_WRITES_DISABLED_MESSAGE =
  "Legacy Mock Draft Demo /admin/simulation mutation routes are disabled (first cutover gate). " +
  "Set SIM_LEGACY_SIMULATION_WRITES=true only with explicit coordinator approval."

export class LegacySimulationWritesDisabledError extends Error {
  readonly code = LEGACY_SIM_WRITES_DISABLED_CODE

  constructor(message = LEGACY_SIM_WRITES_DISABLED_MESSAGE) {
    super(message)
    this.name = "LegacySimulationWritesDisabledError"
  }
}

/**
 * HTTP fail-closed for route handlers. Call before any DB / service-role work.
 * Returns null when writes are explicitly enabled.
 */
export function legacySimulationWriteDeniedResponse(
  env: EnvLike = process.env,
): NextResponse | null {
  if (isLegacySimulationWritesEnabled(env)) return null
  return NextResponse.json(
    {
      error: LEGACY_SIM_WRITES_DISABLED_MESSAGE,
      code: LEGACY_SIM_WRITES_DISABLED_CODE,
    },
    { status: 410 },
  )
}

/** Engine / script fail-closed before any client construction or DB write. */
export function assertLegacySimulationWritesAllowed(
  env: EnvLike = process.env,
): void {
  if (!isLegacySimulationWritesEnabled(env)) {
    throw new LegacySimulationWritesDisabledError()
  }
}
