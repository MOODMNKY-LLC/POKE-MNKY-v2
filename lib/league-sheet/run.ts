/**
 * Plan a sheet sync and, unless dry-run, describe the log row the caller stores.
 * Applying to Supabase lives in supabase-store.ts. Tests use the in-memory plan.
 */

import { planLeagueSheet } from "@/lib/league-sheet/plan"
import type { LeagueDb, LeagueSheet, SyncLogRow, SyncPlan } from "@/lib/league-sheet/types"

export type SheetSyncResult = {
  plan: SyncPlan
  log: SyncLogRow
}

export function runSheetSync(sheet: LeagueSheet, db: LeagueDb, dryRun: boolean): SheetSyncResult {
  const plan = planLeagueSheet(sheet, db)
  const byTable: Record<string, number> = {}
  for (const change of plan.changes) {
    byTable[change.table] = (byTable[change.table] ?? 0) + 1
  }
  return {
    plan,
    log: {
      status: dryRun ? "dry_run" : "applied",
      seasonKey: sheet.seasonKey,
      dryRun,
      changesPlanned: plan.changes.length,
      changesApplied: dryRun ? 0 : plan.changes.length,
      summary: { byTable },
      error: null,
    },
  }
}

export function authorizeCron(authorization: string | null, secret: string | undefined): boolean {
  const expected = secret?.trim()
  if (!expected) return false
  return authorization === `Bearer ${expected}`
}

export function parseSyncCliArgs(argv: string[]): { dryRun: boolean; fixture: string | null } {
  let dryRun = false
  let fixture: string | null = null
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--dry-run") dryRun = true
    else if (arg === "--fixture") {
      fixture = argv[index + 1] ?? null
      index += 1
    }
  }
  return { dryRun, fixture }
}
