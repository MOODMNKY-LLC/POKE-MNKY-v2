import type {
  MattOverrideEntry,
  MattOverridesFile,
  SheetPoints,
  SheetPokedexRow,
} from "@/lib/draft-pool-builder/types"
import { norm } from "@/lib/draft-pool-builder/normalize"

export function parsePoints(raw: string | number | null | undefined): SheetPoints {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.trunc(raw)
  }
  const s = String(raw ?? "").trim()
  if (s === "" || s === "-") return "-"
  const n = Number.parseInt(s, 10)
  if (!Number.isFinite(n) || String(n) !== s.replace(/\.0+$/, "")) {
    // Accept "5.0" style sheet cells
    const f = Number.parseFloat(s)
    if (Number.isFinite(f) && Number.isInteger(f)) return Math.trunc(f)
    return s
  }
  return n
}

export function isDraftablePoints(points: SheetPoints): points is number {
  return typeof points === "number" && points >= 1 && points <= 20
}

export function isBannedPoints(points: SheetPoints): points is 99 {
  return points === 99
}

export function isExcludedPoints(points: SheetPoints): boolean {
  return points === "-"
}

/**
 * Parse Pokédex L:P CSV rows (GitHub Name, Pts., Spr., D.Spr., Pokémon).
 * Display names are whitespace-trimmed only (Matt: copy sheet names exactly after trim).
 */
export function parsePokedexCsv(csvText: string): SheetPokedexRow[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.length > 0)
  if (lines.length === 0) return []

  const header = parseCsvLine(lines[0]!)
  const col = {
    slug: findCol(header, ["GitHub Name", "slug", "github_name"]),
    pts: findCol(header, ["Pts.", "points", "Pts", "pts"]),
    name: findCol(header, ["Pokémon", "Pokemon", "display", "name"]),
  }

  const rows: SheetPokedexRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]!)
    const slug = (cells[col.slug] ?? "").trim()
    const displayName = (cells[col.name] ?? "").trim()
    const points = parsePoints(cells[col.pts])
    if (!slug && !displayName) continue
    if (slug === "-" && (!displayName || displayName === "-")) continue
    rows.push({
      slug,
      displayName,
      points,
      source: "sheet",
    })
  }
  return rows
}

/** Parse a Google Sheets values grid for Pokédex columns L:P (0-based L=11 … P=15). */
export function parsePokedexGridLp(rows: string[][]): SheetPokedexRow[] {
  const out: SheetPokedexRow[] = []
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] ?? []
    // Skip header-ish first row when it looks like labels
    if (i === 0) {
      const maybeHeader = (row[0] ?? "").toLowerCase()
      if (maybeHeader.includes("github") || maybeHeader.includes("name")) continue
    }
    const slug = String(row[0] ?? "").trim()
    const points = parsePoints(row[1])
    const displayName = String(row[4] ?? "").trim()
    if (!slug && !displayName) continue
    if (slug === "-" && (!displayName || displayName === "-")) continue
    out.push({ slug, displayName, points, source: "sheet" })
  }
  return out
}

export function parseMattOverridesJson(raw: string): MattOverrideEntry[] {
  const data = JSON.parse(raw) as MattOverridesFile | MattOverrideEntry[]
  if (Array.isArray(data)) return data
  return data.entries ?? []
}

export function parseTeraList(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
}

/**
 * Apply Matt overrides. Inserts missing included rows (e.g. Basculin White-Striped).
 * Does not change points for existing sheet rows that already match by slug/name.
 */
export function applyMattOverrides(
  sheetRows: SheetPokedexRow[],
  overrides: MattOverrideEntry[],
): SheetPokedexRow[] {
  const bySlug = new Map(sheetRows.map((r) => [norm(r.slug), r]))
  const byName = new Map(sheetRows.map((r) => [norm(r.displayName), r]))
  const next = [...sheetRows]

  for (const ov of overrides) {
    const slug = (ov.slug || "").trim()
    const name = (ov.display_name || "").trim()
    const existing = bySlug.get(norm(slug)) ?? byName.get(norm(name))
    if (existing) {
      existing.note = ov.note ?? existing.note
      existing.mattOverride = true
      continue
    }
    const pts = parsePoints(ov.points)
    if (ov.pool_status === "included" || isDraftablePoints(pts) || pts === 99) {
      const row: SheetPokedexRow = {
        slug,
        displayName: name,
        points: typeof pts === "number" ? pts : Number.parseInt(String(ov.points), 10),
        source: ov.source ?? "override",
        note: ov.note,
        mattOverride: true,
      }
      next.push(row)
      bySlug.set(norm(slug), row)
      byName.set(norm(name), row)
    }
  }
  return next
}

function findCol(header: string[], names: string[]): number {
  for (const n of names) {
    const i = header.findIndex((h) => h.trim() === n)
    if (i >= 0) return i
  }
  // Fallback positional: L=0, Pts=1, P=4 in an L:P extract
  if (names[0] === "GitHub Name") return 0
  if (names[0] === "Pts.") return 1
  if (names[0] === "Pokémon") return 4
  return 0
}

/** Minimal CSV line parser supporting quoted fields. */
export function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ",") {
      out.push(cur)
      cur = ""
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out
}
