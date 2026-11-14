import { baseSlug, keysFor, norm } from "@/lib/draft-pool-builder/normalize"
import type {
  AliasMapEntry,
  AliasMapFile,
  CatalogRow,
} from "@/lib/draft-pool-builder/types"

export interface AliasResolution {
  pokemonId: number | null
  matchKind: string | null
  catalogSlug: string | null
  catalogName: string | null
}

export function parseAliasMapJson(raw: string): AliasMapEntry[] {
  const data = JSON.parse(raw) as AliasMapFile | AliasMapEntry[]
  if (Array.isArray(data)) return data
  return data.entries ?? []
}

/** Index phase-0 alias map by normalized sheet name and slug. */
export function indexAliasMap(entries: AliasMapEntry[]): Map<string, AliasMapEntry> {
  const idx = new Map<string, AliasMapEntry>()
  for (const e of entries) {
    for (const k of keysFor(e.sheet_slug, e.sheet_name)) {
      if (!idx.has(k)) idx.set(k, e)
    }
    idx.set(norm(e.sheet_name), e)
    idx.set(norm(e.sheet_slug), e)
  }
  return idx
}

/**
 * Build a catalog lookup from pokepedia / pokemon_master style rows.
 * Prefer integer pokemonId (pokepedia / national_dex). Never invent ids.
 */
export function indexCatalog(rows: CatalogRow[]): Map<string, CatalogRow> {
  const idx = new Map<string, CatalogRow>()
  for (const row of rows) {
    for (const k of keysFor(row.slug, row.name)) {
      if (!idx.has(k)) idx.set(k, row)
    }
    idx.set(norm(row.name), row)
    idx.set(norm(row.slug), row)
    idx.set(baseSlug(row.slug), row)
  }
  return idx
}

export function parsePokemonMasterCsv(csvText: string): CatalogRow[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.length > 0)
  if (lines.length < 2) return []
  const header = splitSimpleCsv(lines[0]!)
  const idCol = header.indexOf("id")
  const dexCol = header.indexOf("national_dex")
  const nameCol = header.indexOf("name")
  const slugCol = header.indexOf("slug")
  const rows: CatalogRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = splitSimpleCsv(lines[i]!)
    const name = (cells[nameCol] ?? "").trim()
    const slug = (cells[slugCol] ?? "").trim()
    if (!name && !slug) continue
    const dexRaw = (cells[dexCol] ?? "").trim()
    const dex = dexRaw ? Number.parseInt(dexRaw, 10) : NaN
    rows.push({
      pokemonId: Number.isFinite(dex) ? dex : null,
      name,
      slug,
      masterId: (cells[idCol] ?? "").trim() || null,
    })
  }
  return rows
}

/**
 * Resolve a sheet row to a catalog pokemon_id.
 * Order: alias map (if it carries a resolvable slug/name) → catalog index.
 * Does not guess: returns null when no match.
 */
export function resolveCatalogId(
  sheetName: string,
  sheetSlug: string,
  aliasIdx: Map<string, AliasMapEntry>,
  catalogIdx: Map<string, CatalogRow>,
): AliasResolution {
  const keys = keysFor(sheetSlug, sheetName)
  keys.add(norm(sheetName))
  keys.add(norm(sheetSlug))

  let aliasHit: AliasMapEntry | undefined
  for (const k of keys) {
    const hit = aliasIdx.get(k)
    if (hit) {
      aliasHit = hit
      break
    }
  }

  // Prefer catalog match via alias catalog_slug / sheet tokens
  const searchKeys = new Set(keys)
  if (aliasHit?.catalog_slug) searchKeys.add(norm(aliasHit.catalog_slug))
  if (aliasHit?.catalog_slug) searchKeys.add(baseSlug(aliasHit.catalog_slug))
  if (aliasHit?.sheet_slug) {
    for (const k of keysFor(aliasHit.sheet_slug, aliasHit.sheet_name)) {
      searchKeys.add(k)
    }
  }

  for (const k of searchKeys) {
    const cat = catalogIdx.get(k)
    if (cat && cat.pokemonId != null) {
      return {
        pokemonId: cat.pokemonId,
        matchKind: aliasHit?.match_kind ?? "catalog",
        catalogSlug: cat.slug,
        catalogName: cat.name,
      }
    }
  }

  if (aliasHit) {
    return {
      pokemonId: null,
      matchKind: aliasHit.match_kind ?? "alias_unresolved_catalog",
      catalogSlug: aliasHit.catalog_slug ?? null,
      catalogName: null,
    }
  }

  return {
    pokemonId: null,
    matchKind: null,
    catalogSlug: null,
    catalogName: null,
  }
}

function splitSimpleCsv(line: string): string[] {
  // pokemon_master / alias CSVs in fixtures have no embedded commas in quoted names
  return line.split(",").map((c) => c.trim())
}
