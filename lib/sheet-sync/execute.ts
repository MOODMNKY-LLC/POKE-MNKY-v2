import type { SupabaseClient } from "@supabase/supabase-js"
import { buildDesired, standingsMatchSheet } from "@/lib/sheet-sync/desired"
import { diffLeague, gateChanges } from "@/lib/sheet-sync/diff"
import { parseSnapshot, type SnapshotTabs } from "@/lib/sheet-sync/parse"
import type { NormalizedLeague, SyncChange } from "@/lib/sheet-sync/types"

export type SheetSyncExecution = {
  status: "unchanged" | "no_changes" | "applied" | "blocked" | "failed" | "dry_run"
  changes: SyncChange[]
  reason: string | null
  counts: Record<string, number>
  expected: Array<{ team: string; wins: number; losses: number; diff: number; streak: string }>
}

function recordParts(record: string): { wins: number; losses: number; diff: number } | null {
  const match = /^(\d+)-(\d+)\s+\(([^)]+)\)$/.exec(record)
  if (!match) return null
  const raw = match[3] === "+/-0" ? "0" : match[3]!.replace("+", "")
  return { wins: Number(match[1]), losses: Number(match[2]), diff: Number(raw) }
}

export function planSheetSync(tabs: SnapshotTabs, current: NormalizedLeague): SheetSyncExecution {
  const parsed = parseSnapshot(tabs)
  const desired = buildDesired(parsed.teams, parsed.dex, parsed.week1 ?? current.season.startDate)
  const sheetProblems = standingsMatchSheet(desired.standingsCheck, parsed.standings)
  if (sheetProblems.length > 0) {
    return {
      status: "failed",
      changes: [],
      reason: sheetProblems.join("; "),
      counts: {},
      expected: [],
    }
  }
  const changes = diffLeague(desired, current)
  const gated = gateChanges({
    changes,
    blockers: desired.blockers,
    sheetTeamNames: desired.teams.map((team) => team.name),
    dbTeamNames: current.teams.map((team) => team.name),
    sheetWeek1: parsed.week1,
    dbWeek1: current.season.startDate,
  })
  const counts: Record<string, number> = {}
  for (const change of gated.changes) counts[`${change.table}:${change.op}`] = (counts[`${change.table}:${change.op}`] ?? 0) + 1
  const expected = desired.standingsCheck.flatMap((row) => {
    const parts = recordParts(row.record)
    if (!parts) return []
    return [{ team: row.team, ...parts, streak: row.streak }]
  })
  return { status: gated.status, changes: gated.changes, reason: gated.reason, counts, expected }
}

export async function applySheetSync(
  supabase: SupabaseClient,
  seasonId: string,
  plan: SheetSyncExecution,
  dryRun: boolean,
): Promise<{ status: string }> {
  if (plan.status === "blocked" || plan.status === "failed" || plan.status === "no_changes") {
    return { status: plan.status }
  }
  const { data, error } = await supabase.rpc("sheet_sync_apply", {
    p_season: seasonId,
    p_changes: plan.changes,
    p_expected: plan.expected,
    p_dry_run: dryRun,
  })
  if (error) throw new Error(error.message)
  const status = (data as { status?: string } | null)?.status
  if (status === "dry_run") return { status: "dry_run" }
  if (dryRun) return { status: "dry_run" }
  return { status: "applied" }
}
