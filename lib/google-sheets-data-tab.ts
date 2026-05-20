/**
 * Column layout for the league "Data" tab (matches scripts/sync-data-sheet-to-notion.ts).
 * The sheet has duplicate header labels; index-based reads are required.
 */

export const DATA_TAB_COL = {
  teamId: 1,
  coachName: 2,
  teamName: 3,
  logo: 4,
  division: 5,
  conference: 6,
  gp: 28,
  wins: 29,
  losses: 30,
  differential: 31,
  strengthOfSchedule: 56,
} as const

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

  return {
    name,
    coach_name: coach,
    division,
    conference,
    wins: Math.max(0, Math.min(wins, 9999)),
    losses: Math.max(0, Math.min(losses, 9999)),
    differential: Math.max(-9999, Math.min(differential, 9999)),
    strength_of_schedule: clampStrengthOfSchedule(sosRaw),
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

/** Sync teams from the wide "Data" tab using fixed column indices. */
export async function syncTeamsFromDataTab(
  rows: Array<{ _rawData?: unknown[]; get?: (key: string) => unknown }>,
  headerValues: string[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
): Promise<DataTabSyncResult> {
  const errors: string[] = []
  let processed = 0

  console.log(
    `[Sync] syncTeams: Using Data tab index parser (${rows.length} sheet rows)`
  )

  for (let i = 0; i < rows.length; i++) {
    const rawData = rowToRawData(rows[i], headerValues)
    const team = parseDataTabTeamRow(rawData)
    if (!team) continue

    const { error } = await supabase.from("teams").upsert(team, { onConflict: "name" })
    if (error) {
      errors.push(`Team ${team.name}: ${error.message}`)
      if (processed === 0 && errors.length <= 3) {
        console.error(`[Sync] syncTeams: Error upserting "${team.name}":`, error.message)
      }
    } else {
      processed++
      if (processed <= 3) {
        console.log(`[Sync] syncTeams: Synced "${team.name}" (${team.division} / ${team.conference})`)
      }
    }
  }

  console.log(`[Sync] syncTeams: Data tab parser finished — ${processed} teams, ${errors.length} errors`)
  return { success: errors.length === 0, recordsProcessed: processed, errors }
}
