/**
 * Pure planning for copying a draft pool into the current season.
 * Copied board rows are always available. Pick fields are cleared.
 * Names already drafted on the target season are left unchanged.
 */

const POINT_MIN = 1
const POINT_MAX = 20

export type DraftPoolCopySourceKind = "previous_season" | "archived_pool"

export type DraftPoolCopySourceRow = {
  pokemon_name: string
  point_value: number | null
  pokemon_id?: number | null
  generation?: number | null
  is_tera_banned?: boolean | null
}

export type ExistingDraftPoolRow = {
  pokemon_name: string
  status: string | null
}

export type DraftPoolCopyWrite = {
  season_id: string
  pokemon_name: string
  point_value: number
  pokemon_id: number | null
  generation?: number | null
  status: "available"
  draft_pick_number: null
  draft_round: null
  drafted_at: null
  drafted_by_team_id: null
  banned_reason: null
  is_tera_banned?: boolean
  updated_at: string
}

export type SeasonDraftPoolCopySourceRow = {
  pokemon_id: string
  is_included: boolean | null
  assigned_points: number | null
}

export type SeasonDraftPoolCopyWrite = {
  season_id: string
  pokemon_id: string
  is_included: boolean
  assigned_points: number | null
}

export type SeasonCandidate = {
  id: string
  name: string
  start_date: string | null
  created_at?: string | null
}

export type DraftPoolCopySeasonSummary = {
  id: string
  name: string
  draft_pool_count: number
  season_draft_pool_count: number
}

export type ArchivedPoolCopySummary = {
  id: string
  name: string
  season_id: string | null
  season_name: string | null
  created_at: string | null
  included_count: number
}

export type DraftPoolCopySources = {
  current_season: { id: string; name: string } | null
  previous_season: DraftPoolCopySeasonSummary | null
  archived_pools: ArchivedPoolCopySummary[]
}

export function clampCopiedPointValue(value: number | null | undefined): number {
  if (value == null || Number.isNaN(Number(value))) return 12
  const rounded = Math.round(Number(value))
  return Math.min(POINT_MAX, Math.max(POINT_MIN, rounded))
}

function nameKey(name: string): string {
  return name.trim().toLowerCase()
}

export function planDraftPoolCopy(args: {
  targetSeasonId: string
  sourceRows: DraftPoolCopySourceRow[]
  existingRows: ExistingDraftPoolRow[]
  now?: string
  includeGeneration?: boolean
}): { writes: DraftPoolCopyWrite[]; skippedDrafted: string[] } {
  const now = args.now ?? new Date().toISOString()
  const includeGeneration = args.includeGeneration !== false

  const existingByName = new Map<string, ExistingDraftPoolRow>()
  for (const row of args.existingRows) {
    const key = nameKey(row.pokemon_name)
    if (!key) continue
    const current = existingByName.get(key)
    if (!current || row.status === "drafted") {
      existingByName.set(key, row)
    }
  }

  const chosen = new Map<string, DraftPoolCopySourceRow>()
  for (const row of args.sourceRows) {
    const key = nameKey(row.pokemon_name)
    if (!key || chosen.has(key)) continue
    chosen.set(key, row)
  }

  const writes: DraftPoolCopyWrite[] = []
  const skippedDrafted: string[] = []

  for (const [key, source] of chosen) {
    const existing = existingByName.get(key)
    if (existing?.status === "drafted") {
      skippedDrafted.push(existing.pokemon_name)
      continue
    }

    const write: DraftPoolCopyWrite = {
      season_id: args.targetSeasonId,
      pokemon_name: (existing?.pokemon_name ?? source.pokemon_name).trim(),
      point_value: clampCopiedPointValue(source.point_value),
      pokemon_id: source.pokemon_id ?? null,
      status: "available",
      draft_pick_number: null,
      draft_round: null,
      drafted_at: null,
      drafted_by_team_id: null,
      banned_reason: null,
      updated_at: now,
    }
    if (includeGeneration) {
      write.generation = source.generation ?? null
    }
    if (typeof source.is_tera_banned === "boolean") {
      write.is_tera_banned = source.is_tera_banned
    }
    writes.push(write)
  }

  return { writes, skippedDrafted }
}

export function planSeasonDraftPoolCopy(
  targetSeasonId: string,
  rows: SeasonDraftPoolCopySourceRow[]
): SeasonDraftPoolCopyWrite[] {
  const byId = new Map<string, SeasonDraftPoolCopyWrite>()
  for (const row of rows) {
    const pokemonId = row.pokemon_id?.trim()
    if (!pokemonId || byId.has(pokemonId)) continue
    byId.set(pokemonId, {
      season_id: targetSeasonId,
      pokemon_id: pokemonId,
      is_included: row.is_included ?? true,
      assigned_points: row.assigned_points ?? null,
    })
  }
  return [...byId.values()]
}

/**
 * The season that started most recently before the current season.
 * A later season is not treated as previous.
 */
export function findPreviousSeason(
  seasons: SeasonCandidate[],
  currentSeasonId: string
): SeasonCandidate | null {
  const current = seasons.find((season) => season.id === currentSeasonId)
  const others = seasons.filter((season) => season.id !== currentSeasonId)
  if (!current || others.length === 0) return null

  const currentStart = current.start_date
  const datedBefore = currentStart
    ? others.filter((season) => season.start_date != null && season.start_date < currentStart)
    : others.filter((season) => season.start_date != null)
  const pool =
    datedBefore.length > 0 ? datedBefore : others.filter((season) => season.start_date == null)
  if (pool.length === 0) return null

  return [...pool].sort((a, b) => {
    const aKey = a.start_date ?? a.created_at ?? ""
    const bKey = b.start_date ?? b.created_at ?? ""
    if (aKey !== bKey) return aKey < bKey ? 1 : -1
    return a.name < b.name ? 1 : -1
  })[0] ?? null
}

export function draftPoolCopyConfirmMessage(input: {
  targetSeasonName: string
  sourceLabel: string
  draftPoolCount: number
  seasonDraftPoolCount: number
}): string {
  return [
    `Copy ${input.sourceLabel} into ${input.targetSeasonName}?`,
    `This writes ${input.draftPoolCount} draft board rows and ${input.seasonDraftPoolCount} season pool rows.`,
    "Every copied Pokémon is marked available. Draft picks, rounds, and team assignments are not copied.",
    `Pokémon already drafted in ${input.targetSeasonName} are left unchanged.`,
    "Running this again updates the same rows and does not duplicate them.",
  ].join("\n\n")
}
