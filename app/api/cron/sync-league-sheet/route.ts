/**
 * Recurring league-sheet sync. Vercel cron sends Authorization: Bearer CRON_SECRET.
 * ?dry_run=1 plans the sync and writes a log row without changing league tables.
 *
 * Schedule in vercel.json is daily (`15 6 * * *`) so a Hobby project can deploy it.
 * Pro can run the same route more often; Hobby rejects expressions that fire more than once a day.
 */

import { NextResponse } from "next/server"
import { loadLeagueSheetFromGoogle } from "@/lib/league-sheet/google-source"
import { authorizeCron, runSheetSync } from "@/lib/league-sheet/run"
import { applyLeaguePlan, loadLeagueDb, writeSyncLog } from "@/lib/league-sheet/supabase-store"
import { createServiceRoleClient } from "@/lib/supabase/service"

export const revalidate = 0
export const maxDuration = 120

export async function GET(request: Request) {
  if (!authorizeCron(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const dryRun = new URL(request.url).searchParams.get("dry_run") === "1"
  try {
    const supabase = createServiceRoleClient()
    const sheet = await loadLeagueSheetFromGoogle()
    const db = await loadLeagueDb(supabase, sheet.seasonKey)
    const result = runSheetSync(sheet, db, dryRun)
    if (!dryRun) await applyLeaguePlan(supabase, sheet, result.plan, db)
    await writeSyncLog(supabase, result.log)
    return NextResponse.json({ success: true, ...result.log })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sheet sync failed"
    console.error("[sync-league-sheet]", message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
