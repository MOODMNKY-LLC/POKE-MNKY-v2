/** Shared types for the Season 8+ versioned draft-pool builder (phase 1). */

export type PoolEntryStatus = "draftable" | "banned"

export type RestrictionKind = "move" | "ability" | "combo"

export type SheetPoints = number | "-" | string

export interface SheetPokedexRow {
  /** Showdown / GitHub slug from column L. */
  slug: string
  /** Exact sheet display name after trim (column P). */
  displayName: string
  /** Parsed Pts.: 1–20, 99, or '-'. */
  points: SheetPoints
  source: "sheet" | "override" | string
  note?: string
  mattOverride?: boolean
}

export interface MattOverrideEntry {
  display_name: string
  slug: string
  points: number | string
  pool_status?: string
  source?: string
  note?: string
}

export interface MattOverridesFile {
  notes?: string
  entries: MattOverrideEntry[]
}

export interface AliasMapEntry {
  sheet_name: string
  sheet_slug: string
  catalog_id?: string | null
  catalog_slug?: string | null
  draft_pool_name?: string | null
  match_kind?: string | null
  source?: string | null
}

export interface AliasMapFile {
  season?: string
  rules?: string
  entries: AliasMapEntry[]
  unresolved?: unknown[]
}

export interface CatalogRow {
  /** Integer pokepedia / national-dex id when known. */
  pokemonId: number | null
  name: string
  slug: string
  /** Optional pokemon_master UUID from phase-0 snapshots. */
  masterId?: string | null
}

export interface ClassifiedPoolEntry {
  displayName: string
  slug: string
  points: number
  status: PoolEntryStatus
  teraBanned: boolean
  isEffectiveTeraBan: boolean
  pokemonId: number | null
  matchKind: string | null
  source: string
  sortOrder: number
}

export interface CatalogOnlyRegional {
  displayName: string
  slug: string
  pokemonId: number | null
  reason: string
}

export interface RestrictionSeed {
  kind: RestrictionKind
  name: string
  sheetName: string | null
  note: string
}

export interface ImportBucketCounts {
  draftable: number
  banned: number
  excluded: number
  catalogOnlyRegionals: number
  unresolved: number
  fakemonExcluded: number
  oricorioStylesSkipped: number
  teraListHits: number
  effectiveTeraBans: number
  restrictions: number
  aliasHits: number
}

export interface ImportPlan {
  entries: ClassifiedPoolEntry[]
  catalogOnlyRegionals: CatalogOnlyRegional[]
  unresolved: Array<{ displayName: string; slug: string; points: SheetPoints; reason: string }>
  restrictions: RestrictionSeed[]
  counts: ImportBucketCounts
  notes: string[]
}
