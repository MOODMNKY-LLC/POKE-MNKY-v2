/**
 * POST /api/admin/simulation/reset
 *
 * Permanently retired: the Mock Draft Demo path reset by season *name*, which
 * is unsafe for sandbox isolation. Prefer cancelling a foundation run by id.
 * A future scoped purge must require explicit run/season UUIDs.
 */

import { legacyNameBasedResetDeniedResponse } from "@/lib/season-sim/legacy-gate"

export async function POST() {
  return legacyNameBasedResetDeniedResponse()
}
