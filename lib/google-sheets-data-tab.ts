/**
 * Column layout for the league "Data" tab (matches scripts/sync-data-sheet-to-notion.ts).
 * The sheet has duplicate header labels; index-based reads are required.
 *
 * Stats columns (0-based): GP col AB = 27, wins AC = 28, losses AD = 29, diff AE = 30, SOS BE = 56.
 *
 * Sheets API fetching lives in `google-sheets-data-tab-fetch.ts` (server-only).
 */

export const DATA_TAB_COL = {
  teamId: 1,
  coachName: 2,
  teamName: 3,
  logo: 4,
  division: 5,
  conference: 6,
  gp: 27,
  wins: 28,
  losses: 29,
  differential: 30,
  strengthOfSchedule: 56,
} as const

/** Wide range so wins/SOS columns are included (getRows() often truncates). */
export const DATA_TAB_TEAM_VALUE_RANGE = "A2:BE1000"

const SKIP_TEAM_NAME_PATTERN =
  /^(bye|eliminated|budget|tera budget|season stats per team)/i

export type DataTabTeamRow = {
  name: string
  coach_name: string
  division: string
  conference: string
  wins: number
  losses: number
  differential: number
  strength_of_schedule: number
  logo_url?: string | null
}

function cell(row: unknown[], index: number): string {
  const v = row[index]
  if (v === null || v === undefined) return ""
  return String(v).trim()
}

function toInt(val: unknown): number | null {
  if (val === null || val === undefined) return null
  const s = String(val).trim()
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? Math.trunc(n) : null
}

function toNumber(val: unknown): number | null {
  if (val === null || val === undefined) return null
  const s = String(val).trim().replace(/%/g, "")
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/** DECIMAL(4,3) on teams.strength_of_schedule — max magnitude 9.999 */
export function clampStrengthOfSchedule(raw: number | null | undefined): number {
  if (raw === null || raw === undefined || !Number.isFinite(raw)) return 0
  let n = raw
  if (n > 1 && n <= 100) n = n / 100
  if (n > 9.999) n = 9.999
  if (n < -9.999) n = -9.999
  return Math.round(n * 1000) / 1000
}

export function isAabDataTabLayout(headerValues: string[] | undefined): boolean {
  if (!headerValues?.length) return false
  const id = headerValues[DATA_TAB_COL.teamId]
  const team = headerValues[DATA_TAB_COL.teamName]
  return (
    (id === "ID." || id?.toLowerCase() === "id.") &&
    typeof team === "string" &&
    team.toLowerCase().includes("team name")
  )
}

export function shouldUseDataTabTeamParser(
  sheetName: string,
  headerValues: string[] | undefined
): boolean {
  if (sheetName === "Data" || sheetName.toLowerCase() === "data") return true
  return isAabDataTabLayout(headerValues)
}

/**
 * Parse one raw row from the Data tab into a team upsert payload, or null if not a team row.
 */
export function parseDataTabTeamRow(rawData: unknown[]): DataTabTeamRow | null {
  const teamId = toInt(rawData[DATA_TAB_COL.teamId])
  const name = cell(rawData, DATA_TAB_COL.teamName)
  if (!teamId || teamId < 1 || teamId > 99 || !name) return null
  if (SKIP_TEAM_NAME_PATTERN.test(name)) return null

  const division = cell(rawData, DATA_TAB_COL.division) || "TBD"
  const conference = cell(rawData, DATA_TAB_COL.conference) || "TBD"
  const coach = cell(rawData, DATA_TAB_COL.coachName) || "Unknown Coach"

  const wins = toInt(rawData[DATA_TAB_COL.wins]) ?? 0
  const losses = toInt(rawData[DATA_TAB_COL.losses]) ?? 0
  const differential = toInt(rawData[DATA_TAB_COL.differential]) ?? 0
  const sosRaw = toNumber(rawData[DATA_TAB_COL.strengthOfSchedule])
  const logoRaw = cell(rawData, DATA_TAB_COL.logo)
  const logo_url =
    logoRaw && /^https?:\/\//i.test(logoRaw) ? logoRaw : logoRaw ? logoRaw : null

  return {
    name,
    coach_name: coach,
    division,
    conference,
    wins: Math.max(0, Math.min(wins, 9999)),
    losses: Math.max(0, Math.min(losses, 9999)),
    differential: Math.max(-9999, Math.min(differential, 9999)),
    strength_of_schedule: clampStrengthOfSchedule(sosRaw),
    logo_url,
  }
}

export function rowToRawData(row: {
  _rawData?: unknown[]
  get?: (key: string) => unknown
}, headerValues: string[]): unknown[] {
  if (row._rawData && row._rawData.length > 0) return row._rawData
  if (headerValues.length > 0 && row.get) {
    return headerValues.map((h) => {
      try {
        return row.get!(h) ?? ""
      } catch {
        return ""
      }
    })
  }
  return []
}

export type DataTabSyncResult = {
  success: boolean
  recordsProcessed: number
  errors: string[]
}

/** Prefer rows with real division/stats when the Data tab repeats team names. */
export function dataTabTeamRowScore(row: DataTabTeamRow): number {
  let score = 0
  if (row.division && row.division !== "TBD") score += 20
  if (row.conference && row.conference !== "TBD") score += 10
  if (row.wins + row.losses > 0) score += 15
  if (row.differential !== 0) score += 5
  if (row.strength_of_schedule > 0) score += 3
  if (row.logo_url) score += 2
  return score
}

export function dedupeDataTabTeams(rows: DataTabTeamRow[]): DataTabTeamRow[] {
  const byName = new Map<string, DataTabTeamRow>()
  for (const row of rows) {
    const prev = byName.get(row.name)
    if (!prev || dataTabTeamRowScore(row) >= dataTabTeamRowScore(prev)) {
      byName.set(row.name, row)
    }
  }
  return [...byName.values()]
}

/** Sync teams from the wide "Data" tab using fixed column indices. */
export async function syncTeamsFromDataTab(
  rows: Array<{ _rawData?: unknown[]; get?: (key: string) => unknown }> | unknown[][],
  headerValues: string[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  seasonId: string
): Promise<DataTabSyncResult> {
  const errors: string[] = []
  let processed = 0

  const sheetRows = Array.isArray(rows[0])
    ? (rows as unknown[][]).map((raw) => ({ _rawData: raw }))
    : (rows as Array<{ _rawData?: unknown[]; get?: (key: string) => unknown }>)

  const parsed: DataTabTeamRow[] = []
  for (let i = 0; i < sheetRows.length; i++) {
    const rawData = rowToRawData(sheetRows[i], headerValues)
    const team = parseDataTabTeamRow(rawData)
    if (team) parsed.push(team)
  }

  const teamsToSync = dedupeDataTabTeams(parsed)
  console.log(
    `[Sync] syncTeams: Using Data tab index parser (${sheetRows.length} sheet rows → ${teamsToSync.length} teams after dedupe)`
  )

  for (const team of teamsToSync) {
    const { error } = await supabase.from("teams").upsert(
      { ...team, season_id: seasonId },
      { onConflict: "name" }
    )
    if (error) {
      errors.push(`Team ${team.name}: ${error.message}`)
      if (processed === 0 && errors.length <= 3) {
        console.error(`[Sync] syncTeams: Error upserting "${team.name}":`, error.message)
      }
    } else {
      processed++
      if (processed <= 3) {
        console.log(`[Sync] syncTeams: Synced "${team.name}" (${team.division} / ${team.conference}, ${team.wins}-${team.losses})`)
      }
    }
  }

  console.log(`[Sync] syncTeams: Data tab parser finished — ${processed} teams, ${errors.length} errors`)
  return { success: errors.length === 0, recordsProcessed: processed, errors }
}
