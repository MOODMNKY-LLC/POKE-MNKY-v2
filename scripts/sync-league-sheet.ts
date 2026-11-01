/**
 * League sheet sync CLI.
 *
 * Dry-run a fixture without a database:
 *   pnpm tsx scripts/sync-league-sheet.ts --dry-run --fixture fixtures/league-sheet/season7.json
 *
 * Sync the live sheet (needs Google + Supabase service role env vars):
 *   pnpm tsx scripts/sync-league-sheet.ts
 *   pnpm tsx scripts/sync-league-sheet.ts --dry-run
 */

import path from "node:path"
import { loadLeagueSheetFixture } from "@/lib/league-sheet/load-fixture"
import { loadLeagueSheetFromGoogle } from "@/lib/league-sheet/google-source"
import { emptyLeagueDb } from "@/lib/league-sheet/plan"
import { parseSyncCliArgs, runSheetSync } from "@/lib/league-sheet/run"
import { applyLeaguePlan, loadLeagueDb, writeSyncLog } from "@/lib/league-sheet/supabase-store"
import { createServiceRoleClient } from "@/lib/supabase/service"

async function main() {
  const args = parseSyncCliArgs(process.argv.slice(2))
  if (args.fixture) {
    const sheet = loadLeagueSheetFixture(path.resolve(args.fixture))
    const result = runSheetSync(sheet, emptyLeagueDb(), true)
    console.log(JSON.stringify({
      dryRun: true,
      fixture: args.fixture,
      changesPlanned: result.plan.changes.length,
      summary: result.log.summary,
      note: args.dryRun
        ? "Fixture dry-run plans against an empty database and does not write."
        : "Pass --dry-run with --fixture. A fixture is not applied to Supabase by this CLI.",
    }, null, 2))
    return
  }

  const sheet = await loadLeagueSheetFromGoogle()
  const supabase = createServiceRoleClient()
  const db = await loadLeagueDb(supabase, sheet.seasonKey)
  const result = runSheetSync(sheet, db, args.dryRun)
  if (!args.dryRun) await applyLeaguePlan(supabase, sheet, result.plan, db)
  await writeSyncLog(supabase, result.log)
  console.log(JSON.stringify(result.log, null, 2))
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
