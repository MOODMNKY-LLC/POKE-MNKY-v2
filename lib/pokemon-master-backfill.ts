/**
 * Populate pokemon_master from draft_pool + pokemon_unified / showdown / cache metadata.
 * Used by admin Generate (auto) and POST /api/admin/pokemon-master/backfill.
 */

import { createServiceRoleClient } from "@/lib/supabase/service"

const GEN9_PARADOX_NAMES = new Set(
  [
    "Great Tusk",
    "Scream Tail",
    "Brute Bonnet",
    "Flutter Mane",
    "Slither Wing",
    "Sandy Shocks",
    "Iron Treads",
    "Iron Bundle",
    "Iron Hands",
    "Iron Jugulis",
    "Iron Moth",
    "Iron Thorns",
    "Roaring Moon",
    "Iron Valiant",
    "Walking Wake",
    "Iron Leaves",
    "Gouging Fire",
    "Raging Bolt",
    "Iron Boulder",
    "Iron Crown",
  ].map((n) => n.toLowerCase())
)

const GEN9_BOX_LEGENDARIES = new Set(
  ["Koraidon", "Miraidon", "Wo-Chien", "Chien-Pao", "Ting-Lu", "Chi-Yu", "Ogerpon", "Terapagos"].map(
    (n) => n.toLowerCase()
  )
)

const GEN9_MYTHICAL = new Set(["Pecharunt", "Meltan", "Melmetal"].map((n) => n.toLowerCase()))

function slugify(name: string, generation: number): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return `${base}-g${generation}`
}

/** Match SQL migration / Showdown ids: remove spaces only */
function showdownIdFromName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, "")
}

function normalizeLookupKey(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]/g, "")
}

export type BackfillPokemonMasterResult = {
  before_count: number
  after_count: number
  upserted: number
  skipped_no_dex: number
  source_entries: number
  draft_pool_rows_scanned: number
  generation_inferred: number
  dry_run: boolean
  warning?: string
}

export async function getPokemonMasterCount(): Promise<number> {
  const service = createServiceRoleClient()
  const { count, error } = await service.from("pokemon_master").select("id", { count: "exact", head: true })
  if (error) throw new Error(error.message)
  return count ?? 0
}

export type BackfillPokemonMasterOptions = {
  dry_run?: boolean
  /** Limit draft_pool scan to one season (recommended: current season board) */
  season_id?: string
  /** Used when draft_pool.generation and reference tables lack generation */
  default_generation?: number
}

export async function backfillPokemonMasterFromDraftPool(
  options?: BackfillPokemonMasterOptions
): Promise<BackfillPokemonMasterResult> {
  const dry_run = options?.dry_run ?? false
  const default_generation = options?.default_generation ?? 9
  const service = createServiceRoleClient()

  const before_count = await getPokemonMasterCount()

  async function fetchPoolRows(seasonId?: string) {
    let q = service.from("draft_pool").select("pokemon_name, generation, point_value")
    if (seasonId) q = q.eq("season_id", seasonId)
    const { data, error } = await q
    if (error) throw new Error(`draft_pool fetch failed: ${error.message}`)
    return data ?? []
  }

  let poolRows = await fetchPoolRows(options?.season_id)
  let usedSeasonScope = options?.season_id

  if (poolRows.length === 0 && options?.season_id) {
    const allRows = await fetchPoolRows()
    if (allRows.length > 0) {
      poolRows = allRows
      usedSeasonScope = undefined
    }
  }

  const draft_pool_rows_scanned = poolRows.length

  const byKey = new Map<string, { name: string; generation: number; points: number | null }>()
  let generation_inferred = 0

  const { data: unified } = await service
    .from("pokemon_unified")
    .select("name, dex_num, generation, type_primary, type_secondary")

  const unifiedByName = new Map<string, { dex: number; gen: number | null; t1: string | null; t2: string | null }>()
  const unifiedByNorm = new Map<string, (typeof unifiedByName extends Map<string, infer V> ? V : never)>()
  for (const u of unified ?? []) {
    const displayName = (u.name as string)?.trim()
    if (!displayName) continue
    const key = displayName.toLowerCase()
    const entry = {
      dex: Number(u.dex_num) || 0,
      gen: u.generation != null ? Number(u.generation) : null,
      t1: (u.type_primary as string | null) ?? null,
      t2: (u.type_secondary as string | null) ?? null,
    }
    unifiedByName.set(key, entry)
    unifiedByNorm.set(normalizeLookupKey(displayName), entry)
  }

  const { data: cacheRows } = await service
    .from("pokemon_cache")
    .select("pokemon_id, name, generation, types")

  const cacheByName = new Map<string, { dex: number; gen: number | null }>()
  const cacheByNorm = new Map<string, { dex: number; gen: number | null }>()
  for (const c of cacheRows ?? []) {
    const displayName = (c.name as string)?.trim()
    if (!displayName) continue
    const entry = {
      dex: Number(c.pokemon_id) || 0,
      gen: c.generation != null ? Number(c.generation) : null,
    }
    cacheByName.set(displayName.toLowerCase(), entry)
    cacheByNorm.set(normalizeLookupKey(displayName), entry)
  }

  const { data: types } = await service.from("pokemon_showdown_types").select("showdown_id, slot, type")

  const typesByShowdown = new Map<string, { t1?: string; t2?: string }>()
  for (const t of types ?? []) {
    const sid = t.showdown_id as string
    const slot = Number(t.slot)
    const typeName = (t.type as string)?.toLowerCase()
    if (!sid || !typeName) continue
    const entry = typesByShowdown.get(sid) ?? {}
    if (slot === 1) entry.t1 = typeName
    if (slot === 2) entry.t2 = typeName
    typesByShowdown.set(sid, entry)
  }

  const { data: showdown } = await service.from("pokemon_showdown").select("showdown_id, tier, dex_num, name")

  const tierByShowdown = new Map<string, string>()
  const dexByShowdown = new Map<string, number>()
  const showdownByNorm = new Map<string, { sid: string; dex: number; tier: string }>()
  for (const s of showdown ?? []) {
    const sid = s.showdown_id as string
    if (!sid) continue
    tierByShowdown.set(sid, (s.tier as string) ?? "")
    if (s.dex_num != null) dexByShowdown.set(sid, Number(s.dex_num))
    const norm = normalizeLookupKey((s.name as string) || sid)
    showdownByNorm.set(norm, { sid, dex: Number(s.dex_num) || 0, tier: (s.tier as string) ?? "" })
  }

  function resolveReference(name: string) {
    const nameKey = name.toLowerCase()
    const norm = normalizeLookupKey(name)
    const sid = showdownIdFromName(name)
    const uni = unifiedByName.get(nameKey) ?? unifiedByNorm.get(norm)
    const cache = cacheByName.get(nameKey) ?? cacheByNorm.get(norm)
    const sd = showdownByNorm.get(norm)
    const st = typesByShowdown.get(sid) ?? (sd ? typesByShowdown.get(sd.sid) : undefined)
    const tier = tierByShowdown.get(sid) ?? sd?.tier ?? ""
    const nationalDex = uni?.dex || cache?.dex || dexByShowdown.get(sid) || sd?.dex || 0
    const primaryType = (uni?.t1 || st?.t1 || "normal").toLowerCase()
    const secondaryType = uni?.t2 || st?.t2 || null
    return { nationalDex, primaryType, secondaryType, tier, uni, cache }
  }

  for (const row of poolRows) {
    const name = (row.pokemon_name as string)?.trim()
    if (!name) continue

    let gen = row.generation != null ? Number(row.generation) : null
    if (gen != null && (gen < 1 || gen > 9)) gen = null

    if (gen == null) {
      const nameKey = name.toLowerCase()
      const norm = normalizeLookupKey(name)
      const fromUni = unifiedByName.get(nameKey) ?? unifiedByNorm.get(norm)
      const fromCache = cacheByName.get(nameKey) ?? cacheByNorm.get(norm)
      gen = fromUni?.gen ?? fromCache?.gen ?? null
      if (gen != null) generation_inferred++
    }

    if (gen == null) {
      gen = default_generation
      generation_inferred++
    }

    const key = `${name.toLowerCase()}|${gen}`
    const pts = row.point_value as number | null
    const prev = byKey.get(key)
    if (!prev || (pts != null && (prev.points == null || pts > prev.points))) {
      byKey.set(key, { name, generation: gen, points: pts })
    }
  }

  const records: Array<Record<string, unknown>> = []
  let skipped_no_dex = 0

  for (const { name, generation, points } of byKey.values()) {
    const nameKey = name.toLowerCase()
    const { nationalDex, primaryType, secondaryType, tier } = resolveReference(name)
    const isParadox = GEN9_PARADOX_NAMES.has(nameKey) && generation === 9
    const isLegendary =
      GEN9_BOX_LEGENDARIES.has(nameKey) ||
      (tier === "Uber" && generation === 9 && !isParadox && !nameKey.includes("ogerpon"))
    const isMythical = GEN9_MYTHICAL.has(nameKey)

    if (nationalDex <= 0) {
      skipped_no_dex++
      continue
    }

    records.push({
      national_dex: nationalDex,
      name,
      slug: slugify(name, generation),
      generation,
      primary_type: primaryType,
      secondary_type: secondaryType,
      default_draft_points: points,
      is_legendary: isLegendary,
      is_mythical: isMythical,
      is_paradox: isParadox,
    })
  }

  if (dry_run) {
    return buildResult({
      before_count,
      after_count: before_count,
      upserted: 0,
      skipped_no_dex,
      source_entries: byKey.size,
      draft_pool_rows_scanned,
      generation_inferred,
      dry_run: true,
      default_generation,
      used_all_seasons_fallback: Boolean(options?.season_id && !usedSeasonScope),
    })
  }

  const BATCH = 100
  let upserted = 0
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH)
    const { error } = await service.from("pokemon_master").upsert(batch, { onConflict: "slug" })
    if (error) throw new Error(`pokemon_master upsert failed: ${error.message}`)
    upserted += batch.length
  }

  const after_count = await getPokemonMasterCount()

  return buildResult({
    before_count,
    after_count,
    upserted,
    skipped_no_dex,
    source_entries: byKey.size,
    draft_pool_rows_scanned,
    generation_inferred,
    dry_run: false,
    default_generation,
    used_all_seasons_fallback: Boolean(options?.season_id && !usedSeasonScope),
  })
}

/** Mirrors SQL `map_tier_to_point_value` for catalog seeding */
export function mapTierToPointValue(tier: string | null | undefined): number | null {
  if (!tier) return 5
  switch (tier) {
    case "Uber":
    case "AG":
      return 20
    case "OU":
      return 19
    case "UUBL":
    case "OUBL":
      return 18
    case "UU":
      return 17
    case "RUBL":
      return 16
    case "RU":
      return 15
    case "NUBL":
      return 14
    case "NU":
      return 13
    case "PUBL":
      return 12
    case "PU":
      return 11
    case "ZUBL":
      return 10
    case "ZU":
      return 9
    case "LC":
      return 8
    case "NFE":
      return 7
    case "Untiered":
      return 6
    case "Illegal":
    case "Unreleased":
    case "CAP":
      return null
    default:
      return 5
  }
}

export type SeedPokemonMasterFromCatalogOptions = {
  generation?: number
  dry_run?: boolean
}

/** Populate pokemon_master directly from pokemon_unified (no draft_pool required). */
export async function seedPokemonMasterFromCatalog(
  options?: SeedPokemonMasterFromCatalogOptions
): Promise<BackfillPokemonMasterResult> {
  const generation = options?.generation ?? 9
  const dry_run = options?.dry_run ?? false
  const service = createServiceRoleClient()
  const before_count = await getPokemonMasterCount()

  const { data: rows, error } = await service
    .from("pokemon_unified")
    .select("name, dex_num, generation, type_primary, type_secondary, showdown_tier")
    .eq("generation", generation)
    .not("dex_num", "is", null)

  if (error) throw new Error(`pokemon_unified fetch failed: ${error.message}`)

  const records: Array<Record<string, unknown>> = []
  let skipped_no_dex = 0
  const seen = new Set<string>()

  for (const row of rows ?? []) {
    const name = (row.name as string)?.trim()
    if (!name) continue
    const nationalDex = Number(row.dex_num) || 0
    if (nationalDex <= 0) {
      skipped_no_dex++
      continue
    }

    const gen = row.generation != null ? Number(row.generation) : generation
    const key = `${name.toLowerCase()}|${gen}`
    if (seen.has(key)) continue
    seen.add(key)

    const nameKey = name.toLowerCase()
    const tier = (row.showdown_tier as string) ?? ""
    const points = mapTierToPointValue(tier)
    const isParadox = GEN9_PARADOX_NAMES.has(nameKey) && gen === 9
    const isLegendary =
      GEN9_BOX_LEGENDARIES.has(nameKey) ||
      (tier === "Uber" && gen === 9 && !isParadox && !nameKey.includes("ogerpon"))
    const isMythical = GEN9_MYTHICAL.has(nameKey)

    records.push({
      national_dex: nationalDex,
      name,
      slug: slugify(name, gen),
      generation: gen,
      primary_type: ((row.type_primary as string) || "normal").toLowerCase(),
      secondary_type: (row.type_secondary as string | null) ?? null,
      default_draft_points: points,
      is_legendary: isLegendary,
      is_mythical: isMythical,
      is_paradox: isParadox,
    })
  }

  if (dry_run) {
    return buildResult({
      before_count,
      after_count: before_count,
      upserted: 0,
      skipped_no_dex,
      source_entries: seen.size,
      draft_pool_rows_scanned: 0,
      generation_inferred: 0,
      dry_run: true,
      default_generation: generation,
    })
  }

  const BATCH = 100
  let upserted = 0
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH)
    const { error: upsertErr } = await service.from("pokemon_master").upsert(batch, { onConflict: "slug" })
    if (upsertErr) throw new Error(`pokemon_master upsert failed: ${upsertErr.message}`)
    upserted += batch.length
  }

  const after_count = await getPokemonMasterCount()
  let warning: string | undefined
  if ((rows?.length ?? 0) === 0) {
    warning =
      "pokemon_unified has no rows for this generation. Sync Showdown/Poképedia (Admin → Pokémon) first."
  } else if (upserted === 0) {
    warning = "No species could be written to pokemon_master."
  }

  return {
    before_count,
    after_count,
    upserted,
    skipped_no_dex,
    source_entries: seen.size,
    draft_pool_rows_scanned: 0,
    generation_inferred: 0,
    dry_run: false,
    warning,
  }
}

function buildResult(args: {
  before_count: number
  after_count: number
  upserted: number
  skipped_no_dex: number
  source_entries: number
  draft_pool_rows_scanned: number
  generation_inferred: number
  dry_run: boolean
  default_generation: number
  used_all_seasons_fallback?: boolean
}): BackfillPokemonMasterResult {
  let warning: string | undefined

  if (args.used_all_seasons_fallback) {
    warning =
      "Current season draft board was empty; used all draft_pool rows across seasons."
  }

  if (args.draft_pool_rows_scanned === 0) {
    warning =
      "No rows in draft_pool. Publish a pool to the draft board (step 2), seed from Admin → Pokémon / Showdown tiers, or import board data, then try again."
  } else if (args.source_entries === 0) {
    warning = "draft_pool rows had no usable Pokémon names."
  } else if (args.upserted === 0 && args.skipped_no_dex > 0) {
    warning = `${args.skipped_no_dex} entries could not be matched to a national dex (check pokemon_cache / pokemon_unified / showdown data).`
  } else if (args.generation_inferred > 0 && !warning) {
    warning = `Inferred generation for ${args.generation_inferred} row(s) from reference data or default Gen ${args.default_generation}.`
  }

  return {
    before_count: args.before_count,
    after_count: args.after_count,
    upserted: args.upserted,
    skipped_no_dex: args.skipped_no_dex,
    source_entries: args.source_entries,
    draft_pool_rows_scanned: args.draft_pool_rows_scanned,
    generation_inferred: args.generation_inferred,
    dry_run: args.dry_run,
    warning,
  }
}
