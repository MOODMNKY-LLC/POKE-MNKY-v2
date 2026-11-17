/**
 * Pure prune guard for the Notion -> draft_pool full sync.
 *
 * Decides whether rows missing from Notion may be deleted, and which ones. Drafted
 * rows are never pruned.
 */

export const MIN_INCOMING_RATIO_NUM = 4
export const MIN_INCOMING_RATIO_DEN = 5 // 80%
export const PRUNE_ABSOLUTE_FLOOR = 25
export const PRUNE_FRACTION = 0.1

export type PruneRefusalReason =
  | "notion_returned_zero_rows"
  | "incoming_below_80_percent_of_existing"
  | "prune_set_too_large"
  | "upsert_failures"

export interface PruneExistingRow {
  id: string
  pokemon_name: string | null
  status?: string | null
}

export interface DraftBoardPruneReport {
  refused: boolean
  bypassed_with_allow_large_prune: boolean
  reasons: PruneRefusalReason[]
  existing_count: number
  incoming_count: number
  prune_limit: number
  pruned: Array<{ id: string; name: string }>
}

export interface DraftBoardPruneDecision extends DraftBoardPruneReport {
  allowed: boolean
  messages: string[]
}

/** Case-insensitive, trimmed key used for every name comparison in the draft board sync. */
export function normalizePoolName(name: string | null | undefined): string {
  return (name ?? "").toLowerCase().trim()
}

export function planDraftBoardPrune(
  existing: PruneExistingRow[],
  incomingNames: string[],
  opts: { allowLargePrune?: boolean; failedCount?: number } = {},
): DraftBoardPruneDecision {
  const incoming = new Set(incomingNames.map(normalizePoolName).filter(Boolean))
  const existingCount = existing.length
  const incomingCount = incoming.size

  const pruned = existing
    .filter((row) => row.status !== "drafted" && !incoming.has(normalizePoolName(row.pokemon_name)))
    .map((row) => ({ id: row.id, name: row.pokemon_name ?? "" }))

  const pruneLimit = Math.max(PRUNE_ABSOLUTE_FLOOR, PRUNE_FRACTION * existingCount)

  const reasons: PruneRefusalReason[] = []
  const messages: string[] = []

  if (incomingCount === 0 && existingCount > 0) {
    reasons.push("notion_returned_zero_rows")
    messages.push(
      `Refused to prune: Notion returned 0 draft board rows but ${existingCount} exist for this season.`,
    )
  }
  if (
    existingCount > 0 &&
    incomingCount * MIN_INCOMING_RATIO_DEN < existingCount * MIN_INCOMING_RATIO_NUM
  ) {
    reasons.push("incoming_below_80_percent_of_existing")
    messages.push(
      `Refused to prune: Notion returned ${incomingCount} rows, below 80% of the ${existingCount} existing rows.`,
    )
  }
  if (pruned.length > pruneLimit) {
    reasons.push("prune_set_too_large")
    messages.push(
      `Refused to prune: ${pruned.length} rows would be removed (limit ${pruneLimit}).`,
    )
  }

  // Failed rows mean the incoming set is incomplete; never delete on that basis, even with allowLargePrune.
  const failedCount = opts.failedCount ?? 0
  const hasFailures = failedCount > 0 && pruned.length > 0
  if (hasFailures) {
    reasons.push("upsert_failures")
    messages.push(
      `Refused to prune: ${failedCount} row(s) failed to sync, so ${pruned.length} stale row(s) were left in place.`,
    )
  }

  const wouldRefuse = reasons.length > 0
  const bypassed = wouldRefuse && !hasFailures && opts.allowLargePrune === true
  const allowed = !wouldRefuse || bypassed

  return {
    allowed,
    refused: !allowed,
    bypassed_with_allow_large_prune: bypassed,
    reasons,
    messages,
    existing_count: existingCount,
    incoming_count: incomingCount,
    prune_limit: pruneLimit,
    pruned,
  }
}

export function toPruneReport(decision: DraftBoardPruneDecision): DraftBoardPruneReport {
  const { allowed: _allowed, messages: _messages, ...report } = decision
  return report
}

export interface DraftedState {
  status: "drafted"
  drafted_by_team_id: string | null
  drafted_at: string | null
}

export interface ExistingPoolRow extends PruneExistingRow {
  drafted_by_team_id?: string | null
  drafted_at?: string | null
}

/** Existing rows keyed by normalized name (NOT name+points, so a point change keeps draft state). */
export function indexExistingByName<T extends PruneExistingRow>(rows: T[]): Map<string, T> {
  const map = new Map<string, T>()
  for (const row of rows) map.set(normalizePoolName(row.pokemon_name), row)
  return map
}

/** Draft state that Supabase keeps winning over Notion, or null when not drafted. */
export function resolveDraftedState(
  existingByName: Map<string, ExistingPoolRow>,
  name: string,
): DraftedState | null {
  const existing = existingByName.get(normalizePoolName(name))
  if (existing?.status !== "drafted") return null
  return {
    status: "drafted",
    drafted_by_team_id: existing.drafted_by_team_id ?? null,
    drafted_at: existing.drafted_at ?? null,
  }
}
