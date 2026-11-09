/**
 * POST /api/admin/simulation/reset
 *
 * Permanently retired: the Mock Draft Demo path reset by season *name*, which
 * is unsafe for sandbox isolation. Prefer cancelling a foundation run by id.
 * A future scoped purge must require explicit run/season UUIDs and must also
 * cover sim_draft_pool / sim_draft_budgets / sim_draft_picks (FK ON DELETE
 * CASCADE from simulation_runs already wires cascade when a UUID purge is able
 * to delete runs; append-only events/steps currently block casual deletes).
 */

import { legacyNameBasedResetDeniedResponse } from "@/lib/season-sim/legacy-gate"

export async function POST() {
  return legacyNameBasedResetDeniedResponse()
}
