import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { cell, coerceGrid, num, type SheetGrid } from "@/lib/sheet-sync/grid"
import { canon, type DexEntry } from "@/lib/sheet-sync/names"

export type LineupEntry = { raw: string; kills: number; cell: string }
export type MoveCell = { row: number; add: string | null; drop: string | null; cell: string }
export type RosterSlot = { row: number; label: string; name: string; pts: number | null; round: number | null; pick: number | null }
export type ScheduleSlot = {
  week: number
  label: string
  opp: string
  result: string
  kills: number | null
  deaths: number | null
  cell: string
}

export type ParsedTeam = {
  teamNumber: number
  name: string
  coach: string
  conference: string
  division: string
  isBye: boolean
  roster: RosterSlot[]
  slots: RosterSlot[]
  moves: MoveCell[]
  tera: string[]
  schedule: ScheduleSlot[]
  lineups: Record<number, LineupEntry[]>
}

export type StandingsRow = { rank: string; team: string; coach: string; record: string; streak: string }

const REG_WEEK_COLS = ["A", "C", "E", "G", "I", "K", "M", "O"]
const REG_KILL_COLS = ["B", "D", "F", "H", "J", "L", "N", "P"]
const PO_COLS: Array<[string, string, number]> = [
  ["A", "B", 9],
  ["C", "D", 10],
  ["E", "F", 11],
  ["G", "H", 12],
]

export type SnapshotTabs = Record<string, SheetGrid>

export function loadSnapshotDir(dir: string): SnapshotTabs {
  const tabs: SnapshotTabs = {}
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".json")) continue
    const raw = JSON.parse(readFileSync(join(dir, name), "utf8")) as unknown
    tabs[name.replace(/\.json$/, "")] = coerceGrid(raw)
  }
  return tabs
}

function slotLabel(label: string): { round: number | null; pick: number | null } {
  const match = /Round\s*(\d+)\s*\(Pick\s*(\d+)\)/.exec(label)
  if (!match) return { round: null, pick: null }
  return { round: Number(match[1]), pick: Number(match[2]) }
}

export function parseTeam(grid: SheetGrid, teamNumber: number): ParsedTeam {
  const name = cell(grid, "A", 2).trim()
  const slots: RosterSlot[] = []
  for (let row = 2; row <= 11; row += 1) {
    const label = cell(grid, "C", row).trim()
    const parsed = slotLabel(label)
    slots.push({
      row,
      label,
      name: cell(grid, "D", row).trim(),
      pts: num(cell(grid, "E", row)),
      round: parsed.round,
      pick: parsed.pick,
    })
  }
  const moves: MoveCell[] = []
  for (let row = 2; row <= 11; row += 1) {
    const add = cell(grid, "F", row).trim()
    const drop = cell(grid, "G", row).trim().replace(/^Dropping:\s*/i, "").trim()
    if (add || drop) moves.push({ row, add: add || null, drop: drop || null, cell: `F${row}:G${row}` })
  }
  const schedule: ScheduleSlot[] = []
  for (let index = 0; index < 12; index += 1) {
    const row = index + 2
    schedule.push({
      week: index + 1,
      label: cell(grid, "H", row).trim(),
      opp: cell(grid, "I", row).trim(),
      result: cell(grid, "J", row).trim(),
      kills: num(cell(grid, "K", row)),
      deaths: num(cell(grid, "L", row)),
      cell: `H${row}:L${row}`,
    })
  }
  const lineups: Record<number, LineupEntry[]> = {}
  REG_WEEK_COLS.forEach((nameCol, index) => {
    const week = index + 1
    const killsCol = REG_KILL_COLS[index] ?? "B"
    const entries: LineupEntry[] = []
    for (let row = 23; row <= 28; row += 1) {
      const raw = cell(grid, nameCol, row)
      if (!raw.trim()) continue
      entries.push({ raw, kills: num(cell(grid, killsCol, row)) ?? 0, cell: `${nameCol}${row}` })
    }
    lineups[week] = entries
  })
  for (const [nameCol, killsCol, week] of PO_COLS) {
    const entries: LineupEntry[] = []
    for (let row = 33; row <= 38; row += 1) {
      const raw = cell(grid, nameCol, row)
      if (!raw.trim()) continue
      entries.push({ raw, kills: num(cell(grid, killsCol, row)) ?? 0, cell: `${nameCol}${row}` })
    }
    lineups[week] = entries
  }
  return {
    teamNumber,
    name,
    coach: cell(grid, "A", 4).trim(),
    conference: cell(grid, "A", 6).trim(),
    division: cell(grid, "A", 8).trim(),
    isBye: name.startsWith("Bye"),
    roster: slots.filter((slot) => slot.name),
    slots,
    moves,
    tera: [15, 16, 17].map((row) => cell(grid, "D", row).trim()).filter(Boolean),
    schedule,
    lineups,
  }
}

export function parsePokedex(grid: SheetGrid): Map<string, DexEntry> {
  const dex = new Map<string, DexEntry>()
  for (let row = 3; row <= grid.rows.length; row += 1) {
    const name = cell(grid, "H", row).trim()
    if (!name || name === "-") continue
    dex.set(name.toLowerCase(), { name, pts: num(cell(grid, "K", row)) })
  }
  return dex
}

export function parseStandingsForPlayoffs(grid: SheetGrid): StandingsRow[] {
  const rows: StandingsRow[] = []
  for (let row = 5; row <= 16; row += 1) {
    rows.push({
      rank: cell(grid, "C", row).trim(),
      team: cell(grid, "E", row).trim(),
      coach: cell(grid, "F", row).trim(),
      record: cell(grid, "G", row).trim(),
      streak: cell(grid, "P", row).trim(),
    })
  }
  return rows
}

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
}

/** Rules cell that states Week 1 begins Monday, August 24th, with the season year nearby. */
export function parseWeek1Date(grid: SheetGrid): string | null {
  const chunks: string[] = []
  for (const row of grid.rows) {
    for (const value of row) {
      if (value && /week 1/i.test(value)) chunks.push(value)
    }
  }
  const text = chunks.join("\n")
  const week = /week 1 battles will begin[\s\S]{0,80}?([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?/i.exec(text)
  const year = /(20\d{2})/.exec(text)
  if (!week || !year) return null
  const month = MONTHS[week[1]!.toLowerCase()]
  if (!month) return null
  const day = week[2]!.padStart(2, "0")
  return `${year[1]}-${String(month).padStart(2, "0")}-${day}`
}

export function parseSnapshot(tabs: SnapshotTabs): {
  teams: ParsedTeam[]
  dex: Map<string, DexEntry>
  standings: StandingsRow[]
  week1: string | null
} {
  const teams: ParsedTeam[] = []
  for (let n = 1; n <= 12; n += 1) {
    const grid = tabs[`Team_${n}`]
    if (!grid) throw new Error(`snapshot is missing Team_${n}`)
    teams.push(parseTeam(grid, n))
  }
  return {
    teams,
    dex: parsePokedex(tabs.Pok_dex ?? { rows: [] }),
    standings: parseStandingsForPlayoffs(tabs.Standings_For_Playoffs ?? { rows: [] }),
    week1: tabs.Rules ? parseWeek1Date(tabs.Rules) : null,
  }
}

export function canonicalName(raw: string | null | undefined, dex: Map<string, DexEntry>): string | null {
  return canon(raw, dex)
}
