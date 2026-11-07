/**
 * Feature flags for season-sim P0–P1 foundation.
 * All default OFF — fail closed when unset/empty.
 */

type EnvLike = Record<string, string | undefined>

function truthy(raw: string | undefined): boolean {
  const v = raw?.trim().toLowerCase()
  return v === "true" || v === "1" || v === "yes" || v === "on"
}

/** Enables create/progress/advance/pause/resume/cancel APIs. */
export function isSimSandboxV2Enabled(
  env: EnvLike = process.env,
): boolean {
  return truthy(env.SIM_SANDBOX_V2)
}

/** Enables worker tick HTTP + CLI initiator (still requires worker auth). */
export function isSimWorkerTickEnabled(
  env: EnvLike = process.env,
): boolean {
  return truthy(env.SIM_WORKER_TICK_ENABLED)
}

/**
 * Re-enables legacy /api/admin/simulation/{seed,draft,...} mutation routes.
 * Default off — those paths bypass sandbox v2 isolation.
 */
export function isLegacySimulationWritesEnabled(
  env: EnvLike = process.env,
): boolean {
  return truthy(env.SIM_LEGACY_SIMULATION_WRITES)
}

export const SIM_V2_DISABLED_MESSAGE =
  "Season simulator v2 is disabled. Set SIM_SANDBOX_V2=true to enable foundation APIs."

export const SIM_WORKER_DISABLED_MESSAGE =
  "Simulation worker tick is disabled. Set SIM_WORKER_TICK_ENABLED=true to allow ticks."

export const LEGACY_SIM_WRITES_DISABLED_MESSAGE =
  "Legacy /admin/simulation mutation routes are disabled. Use /api/admin/simulation/runs (SIM_SANDBOX_V2). Set SIM_LEGACY_SIMULATION_WRITES=true only for emergency compatibility."
