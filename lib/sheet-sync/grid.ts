export type SheetGrid = { rows: string[][] }

export function columnIndex(label: string): number {
  let n = 0
  for (const ch of label) n = n * 26 + ch.charCodeAt(0) - 64
  return n - 1
}

export function cell(grid: SheetGrid, col: string, row: number): string {
  const r = row - 1
  const c = columnIndex(col)
  const value = grid.rows[r]?.[c]
  if (value == null) return ""
  return String(value)
}

export function num(value: string | null | undefined): number | null {
  const text = (value ?? "").trim()
  if (!text) return null
  const asInt = Number(text)
  if (Number.isInteger(asInt) && /^-?\d+$/.test(text)) return asInt
  const percent = text.endsWith("%")
  const parsed = Number(percent ? text.slice(0, -1) : text)
  if (!Number.isFinite(parsed)) return null
  return percent ? parsed / 100 : parsed
}

export function coerceGrid(value: unknown): SheetGrid {
  const rows = (value as { rows?: unknown } | null)?.rows
  if (!Array.isArray(rows)) return { rows: [] }
  return {
    rows: rows.map((row) => (Array.isArray(row) ? row.map((cell) => (cell == null ? "" : String(cell))) : [])),
  }
}
