import { keysFor, norm } from "@/lib/draft-pool-builder/normalize"
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
 * Build a catalog lookup from pokepedia-style rows (form-specific integer ids).
 * Never invent ids. Ambiguous keys (multiple distinct pokemonIds) are omitted
 * so callers leave pokemon_id null rather than picking a species id.
 */
export function indexCatalog(rows: CatalogRow[]): Map<string, CatalogRow> {
  const buckets = new Map<string, CatalogRow[]>()
  for (const row of rows) {
    const keys = new Set<string>([
      ...keysFor(row.slug, row.name),
      norm(row.name),
      norm(row.slug),
    ])
    // Do NOT index under bare baseSlug alone — that collapses Rotom Fan → Rotom.
    for (const k of keys) {
      if (!k) continue
      const list = buckets.get(k) ?? []
      list.push(row)
      buckets.set(k, list)
    }
  }

  const idx = new Map<string, CatalogRow>()
  for (const [k, list] of buckets) {
    const ids = new Set(
      list.map((r) => r.pokemonId).filter((id): id is number => id != null),
    )
    if (ids.size === 1) {
      // Prefer a row that actually carries the unique id
      idx.set(k, list.find((r) => r.pokemonId != null) ?? list[0]!)
    } else if (ids.size === 0 && list.length === 1) {
      idx.set(k, list[0]!)
    }
    // ids.size > 1 → ambiguous; leave unresolved
  }
  return idx
}

/**
 * Parse pokemon_master fixture CSV for name/slug aliasing only.
 * national_dex is the species id, NOT the form-specific pokepedia_pokemon.id
 * (e.g. all Rotom forms share 479). Never promote national_dex to pokemonId.
 */
export function parsePokemonMasterCsv(csvText: string): CatalogRow[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.length > 0)
  if (lines.length < 2) return []
  const header = splitSimpleCsv(lines[0]!)
  const idCol = header.indexOf("id")
  const nameCol = header.indexOf("name")
  const slugCol = header.indexOf("slug")
  const rows: CatalogRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = splitSimpleCsv(lines[i]!)
    const name = (cells[nameCol] ?? "").trim()
    const slug = (cells[slugCol] ?? "").trim()
    if (!name && !slug) continue
    rows.push({
      pokemonId: null,
      name,
      slug,
      masterId: (cells[idCol] ?? "").trim() || null,
    })
  }
  return rows
}

/** Parse a pokepedia_pokemon dump / live query (id = form-specific resource id). */
export function parsePokepediaCatalogRows(
  rows: Array<{ id: number; name: string; slug?: string | null }>,
): CatalogRow[] {
  return rows.map((r) => ({
    pokemonId: r.id,
    name: r.name,
    slug: (r.slug ?? r.name).trim(),
  }))
}

/**
 * Resolve a sheet row to a form-specific pokepedia pokemon_id.
 * Match by sheet/alias name tokens against the catalog index only.
 * Does not guess and does not fall back to species national_dex.
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

  const searchKeys = new Set(keys)
  if (aliasHit?.catalog_slug) {
    searchKeys.add(norm(aliasHit.catalog_slug))
    // Prefer full catalog slug over baseSlug so forms stay distinct
  }
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

  // Name/slug alias hit without a form-specific id → leave null (never invent)
  if (aliasHit) {
    const nameOnly = catalogIdx.get(norm(aliasHit.sheet_name))
    return {
      pokemonId: null,
      matchKind: aliasHit.match_kind ?? "alias_unresolved_catalog",
      catalogSlug: aliasHit.catalog_slug ?? nameOnly?.slug ?? null,
      catalogName: nameOnly?.name ?? null,
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
