import {
  indexAliasMap,
  indexCatalog,
  resolveCatalogId,
  type AliasResolution,
} from "@/lib/draft-pool-builder/aliases"
import { norm, isFakemonName, isOricorioStyleSlug, isRegionalSlug } from "@/lib/draft-pool-builder/normalize"
import {
  isBannedPoints,
  isDraftablePoints,
  isExcludedPoints,
} from "@/lib/draft-pool-builder/parse-pokedex"
import { SEASON_RESTRICTION_SEEDS } from "@/lib/draft-pool-builder/restrictions"
import type {
  AliasMapEntry,
  CatalogOnlyRegional,
  CatalogRow,
  ClassifiedPoolEntry,
  ImportPlan,
  SheetPokedexRow,
} from "@/lib/draft-pool-builder/types"

export interface ClassifyOptions {
  sheetRows: SheetPokedexRow[]
  teraNames: string[]
  aliasEntries: AliasMapEntry[]
  catalogRows: CatalogRow[]
}

/**
 * Build the phase-1 import plan from sheet rows + aliases + catalog.
 * Excluded ('-') and fakemon are omitted from pool entries.
 * Catalog-only regionals (excluded + regional slug) are listed separately.
 */
export function buildImportPlan(opts: ClassifyOptions): ImportPlan {
  const aliasIdx = indexAliasMap(opts.aliasEntries)
  const catalogIdx = indexCatalog(opts.catalogRows)
  const teraKeys = new Set(opts.teraNames.map((n) => norm(n)))

  const entries: ClassifiedPoolEntry[] = []
  const catalogOnlyRegionals: CatalogOnlyRegional[] = []
  const unresolved: ImportPlan["unresolved"] = []
  const notes: string[] = []

  let excluded = 0
  let fakemonExcluded = 0
  let oricorioStylesSkipped = 0
  let aliasHits = 0
  let sortOrder = 0

  for (const row of opts.sheetRows) {
    if (isOricorioStyleSlug(row.slug)) {
      oricorioStylesSkipped++
      continue
    }

    if (isFakemonName(row.displayName)) {
      fakemonExcluded++
      continue
    }

    if (isExcludedPoints(row.points)) {
      excluded++
      if (isRegionalSlug(row.slug)) {
        const resolved = resolveCatalogId(
          row.displayName,
          row.slug,
          aliasIdx,
          catalogIdx,
        )
        catalogOnlyRegionals.push({
          displayName: row.displayName,
          slug: row.slug,
          pokemonId: resolved.pokemonId,
          reason: "regional_form_pts_dash_catalog_only",
        })
      }
      continue
    }

    if (!isDraftablePoints(row.points) && !isBannedPoints(row.points)) {
      notes.push(
        `Skipping ${row.displayName} (${row.slug}): unexpected Pts. value ${JSON.stringify(row.points)}`,
      )
      continue
    }

    const points = row.points as number
    const status = isBannedPoints(points) ? "banned" : "draftable"
    const resolved = resolveCatalogId(
      row.displayName,
      row.slug,
      aliasIdx,
      catalogIdx,
    )
    if (resolved.matchKind) aliasHits++

    const teraBanned = teraKeys.has(norm(row.displayName)) || teraKeys.has(norm(row.slug))
    const isEffectiveTeraBan = teraBanned && points <= 10

    if (resolved.pokemonId == null) {
      unresolved.push({
        displayName: row.displayName,
        slug: row.slug,
        points,
        reason:
          "no match in alias map → catalog (pokepedia/national_dex); left pokemon_id null",
      })
    }

    entries.push({
      displayName: row.displayName,
      slug: row.slug,
      points,
      status,
      teraBanned,
      isEffectiveTeraBan,
      pokemonId: resolved.pokemonId,
      matchKind: resolved.matchKind,
      source: row.source,
      sortOrder: sortOrder++,
    })
  }

  const restrictions = SEASON_RESTRICTION_SEEDS.map((r) => ({ ...r }))

  const draftable = entries.filter((e) => e.status === "draftable").length
  const banned = entries.filter((e) => e.status === "banned").length
  const teraListHits = entries.filter((e) => e.teraBanned).length
  const effectiveTeraBans = entries.filter((e) => e.isEffectiveTeraBan).length

  return {
    entries,
    catalogOnlyRegionals,
    unresolved,
    restrictions,
    counts: {
      draftable,
      banned,
      excluded,
      catalogOnlyRegionals: catalogOnlyRegionals.length,
      unresolved: unresolved.length,
      fakemonExcluded,
      oricorioStylesSkipped,
      teraListHits,
      effectiveTeraBans,
      restrictions: restrictions.length,
      aliasHits,
    },
    notes,
  }
}

export function formatDryRunSummary(plan: ImportPlan): string {
  const c = plan.counts
  const lines = [
    "Draft pool import dry-run",
    "------------------------",
    `draftable:              ${c.draftable}`,
    `banned (99):            ${c.banned}`,
    `excluded ('-'):         ${c.excluded}`,
    `catalog-only regionals: ${c.catalogOnlyRegionals}`,
    `unresolved catalog ids: ${c.unresolved}`,
    `fakemon excluded:       ${c.fakemonExcluded}`,
    `oricorio styles skip:   ${c.oricorioStylesSkipped}`,
    `tera list hits:         ${c.teraListHits}`,
    `effective tera bans:    ${c.effectiveTeraBans}`,
    `restrictions seeded:    ${c.restrictions}`,
    `alias map hits:         ${c.aliasHits}`,
  ]
  if (plan.notes.length) {
    lines.push("", "notes:")
    for (const n of plan.notes.slice(0, 20)) lines.push(`  - ${n}`)
  }
  if (plan.unresolved.length) {
    lines.push("", `unresolved (first 15 of ${plan.unresolved.length}):`)
    for (const u of plan.unresolved.slice(0, 15)) {
      lines.push(`  - ${u.displayName} (${u.slug}) pts=${u.points}`)
    }
  }
  return lines.join("\n")
}

export type { AliasResolution }
