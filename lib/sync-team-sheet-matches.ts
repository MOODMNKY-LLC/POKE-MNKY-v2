/**
 * Sync match history from per-team sheets ("Team 1" … "Team 12") schedule columns H–J.
 * See docs/TEAM-1-FORMULA-REFERENCE.md (Schedule: week, opponent, W/L).
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import { google } from "googleapis"
import { JWT } from "google-auth-library"
import { fetchDataTabValueRows } from "@/lib/google-sheets-data-tab-fetch"
import { buildSheetTeamIdToNameMap } from "@/lib/sync-team-page-rosters"
import { getCurrentSeasonIdWithFallback } from "@/lib/seasons"
import { getGoogleServiceAccountCredentials } from "@/lib/utils/google-sheets"

export type TeamSheetMatchSyncResult = {
  success: boolean
  teamsProcessed: number
  matchesWritten: number
  errors: string[]
}

const TEAM_SHEET_PATTERN = /^Team\s+(\d+)$/i

export type TeamSheetScheduleRow = {
  week: number
  opponentName: string
  result: "W" | "L" | null
  /** This team's KO total (column K). */
  selfScore: number | null
  /** Opponent KO total (column L). */
  oppScore: number | null
}

function parseWeekLabel(label: string): number | null {
  const m = label.match(/week\s*(\d+)/i)
  if (!m) return null
  const n = Number.parseInt(m[1], 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

function normalizeTeamPair(idA: string, idB: string): [string, string] {
  return idA < idB ? [idA, idB] : [idB, idA]
}

function winnerFromResult(
  selfId: string,
  oppId: string,
  result: "W" | "L" | null
): string | null {
  if (result === "W") return selfId
  if (result === "L") return oppId
  return null
}

async function sheetsClient() {
  const credentials = getGoogleServiceAccountCredentials()
  if (!credentials) {
    throw new Error("Google Sheets credentials not configured")
  }
  const auth = new JWT({
    email: credentials.email,
    key: credentials.privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  })
  return google.sheets({ version: "v4", auth })
}

function parseKoScore(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null
  const n = typeof val === "number" ? val : Number.parseInt(String(val).trim(), 10)
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : null
}

/** Read schedule from `Team N` sheet columns H–L rows 2–16 (week, opponent, W/L, self KOs, opp KOs). */
export async function fetchTeamSheetSchedule(
  spreadsheetId: string,
  sheetTitle: string
): Promise<TeamSheetScheduleRow[]> {
  const sheets = await sheetsClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetTitle}!H2:L16`,
    valueRenderOption: "UNFORMATTED_VALUE",
  })
  const values = (res.data.values ?? []) as unknown[][]
  const rows: TeamSheetScheduleRow[] = []

  for (const row of values) {
    const weekLabel = String(row[0] ?? "").trim()
    const opponentName = String(row[1] ?? "").trim()
    const resultRaw = String(row[2] ?? "").trim().toUpperCase()
    const week = parseWeekLabel(weekLabel)
    if (!week || !opponentName) continue
    if (/^eliminated$/i.test(opponentName)) continue
    const result =
      resultRaw === "W" ? "W" : resultRaw === "L" ? "L" : null
    rows.push({
      week,
      opponentName,
      result,
      selfScore: parseKoScore(row[3]),
      oppScore: parseKoScore(row[4]),
    })
  }

  return rows
}

type MatchDraft = {
  week: number
  team1Id: string
  team2Id: string
  winnerId: string | null
  team1Score: number | null
  team2Score: number | null
}

/**
 * Optional score enrichment from Data tab current-week snapshot (cols J–V).
 */
async function loadDataTabCurrentWeekScores(
  spreadsheetId: string,
  nameToId: Map<string, string>
): Promise<Map<string, { team1Score: number; team2Score: number; winnerId: string | null }>> {
  const out = new Map<
    string,
    { team1Score: number; team2Score: number; winnerId: string | null }
  >()
  const rows = await fetchDataTabValueRows(spreadsheetId)
  const idToName = await buildSheetTeamIdToNameMap(spreadsheetId)

  for (const row of rows) {
    const selfTeamId = Number(row[1])
    const week = Number(row[9])
    const oppTeamId = Number(row[19])
    const selfScore = Number(row[14])
    const oppScore = Number(row[16])
    const selfResult = String(row[13] ?? "").trim().toUpperCase()
    if (!week || !oppTeamId || !selfTeamId) continue

    const selfName = idToName.get(selfTeamId)
    const oppName = idToName.get(oppTeamId)
    if (!selfName || !oppName) continue

    const selfUuid = nameToId.get(selfName)
    const oppUuid = nameToId.get(oppName)
    if (!selfUuid || !oppUuid) continue

    const [team1Id, team2Id] = normalizeTeamPair(selfUuid, oppUuid)
    const selfIsTeam1 = selfUuid === team1Id
    const team1Score = selfIsTeam1 ? selfScore : oppScore
    const team2Score = selfIsTeam1 ? oppScore : selfScore
    const winnerId = winnerFromResult(
      selfUuid,
      oppUuid,
      selfResult === "W" ? "W" : selfResult === "L" ? "L" : null
    )
    const key = `${week}:${team1Id}:${team2Id}`
    out.set(key, {
      team1Score: Number.isFinite(team1Score) ? Math.trunc(team1Score) : 0,
      team2Score: Number.isFinite(team2Score) ? Math.trunc(team2Score) : 0,
      winnerId,
    })
  }

  return out
}

export async function syncTeamSheetMatches(
  supabase: SupabaseClient,
  spreadsheetId: string,
  sheetTitles: string[]
): Promise<TeamSheetMatchSyncResult> {
  const errors: string[] = []
  let teamsProcessed = 0
  let matchesWritten = 0

  const seasonId = await getCurrentSeasonIdWithFallback(supabase)
  if (!seasonId) {
    return {
      success: false,
      teamsProcessed: 0,
      matchesWritten: 0,
      errors: ["No current season configured (is_current on seasons)."],
    }
  }

  const idToName = await buildSheetTeamIdToNameMap(spreadsheetId)
  const { data: teams } = await supabase
    .from("teams")
    .select("id, name")
    .eq("season_id", seasonId)

  const nameToId = new Map((teams ?? []).map((t) => [t.name, t.id]))
  const scoreByPair = await loadDataTabCurrentWeekScores(spreadsheetId, nameToId)

  const draftByKey = new Map<string, MatchDraft>()
  const teamSheets = sheetTitles.filter((t) => TEAM_SHEET_PATTERN.test(t.trim()))

  for (const sheetTitle of teamSheets) {
    const match = sheetTitle.trim().match(TEAM_SHEET_PATTERN)
    const sheetNum = match ? Number.parseInt(match[1], 10) : NaN
    const teamName = idToName.get(sheetNum)
    if (!teamName) {
      errors.push(`Sheet "${sheetTitle}": no team name for Data tab ID ${sheetNum}`)
      continue
    }

    const selfId = nameToId.get(teamName)
    if (!selfId) {
      errors.push(`Sheet "${sheetTitle}": team "${teamName}" not in DB — sync Data tab first`)
      continue
    }

    let schedule: TeamSheetScheduleRow[] = []
    try {
      schedule = await fetchTeamSheetSchedule(spreadsheetId, sheetTitle)
    } catch (e) {
      errors.push(
        `Sheet "${sheetTitle}": ${e instanceof Error ? e.message : "failed to read schedule"}`
      )
      continue
    }

    if (schedule.length === 0) {
      errors.push(`Sheet "${sheetTitle}": no schedule rows in H2:L16`)
      continue
    }

    teamsProcessed += 1

    for (const row of schedule) {
      const oppId = nameToId.get(row.opponentName)
      if (!oppId) {
        errors.push(
          `Sheet "${sheetTitle}" week ${row.week}: opponent "${row.opponentName}" not found in DB`
        )
        continue
      }

      const [team1Id, team2Id] = normalizeTeamPair(selfId, oppId)
      const key = `${row.week}:${team1Id}:${team2Id}`
      const winnerId = winnerFromResult(selfId, oppId, row.result)
      const enriched = scoreByPair.get(key)
      const selfIsTeam1 = selfId === team1Id
      const fromSchedule = {
        team1Score: selfIsTeam1 ? row.selfScore : row.oppScore,
        team2Score: selfIsTeam1 ? row.oppScore : row.selfScore,
      }
      const team1Score =
        fromSchedule.team1Score ?? enriched?.team1Score ?? null
      const team2Score =
        fromSchedule.team2Score ?? enriched?.team2Score ?? null

      const existing = draftByKey.get(key)
      if (existing) {
        if (!existing.winnerId && winnerId) existing.winnerId = winnerId
        if (team1Score != null && existing.team1Score == null) {
          existing.team1Score = team1Score
        }
        if (team2Score != null && existing.team2Score == null) {
          existing.team2Score = team2Score
        }
        if (enriched?.winnerId) existing.winnerId = enriched.winnerId
        continue
      }

      draftByKey.set(key, {
        week: row.week,
        team1Id,
        team2Id,
        winnerId: enriched?.winnerId ?? winnerId,
        team1Score,
        team2Score,
      })
    }
  }

  if (draftByKey.size === 0) {
    return { success: false, teamsProcessed, matchesWritten: 0, errors }
  }

  const { error: clearError } = await supabase
    .from("matches")
    .delete()
    .eq("season_id", seasonId)

  if (clearError) {
    errors.push(`Could not clear season matches: ${clearError.message}`)
    return { success: false, teamsProcessed, matchesWritten: 0, errors }
  }

  for (const draft of draftByKey.values()) {
    if (draft.team1Score == null || draft.team2Score == null) {
      errors.push(
        `Week ${draft.week}: missing KO scores for ${draft.team1Id}/${draft.team2Id}`
      )
      continue
    }
    const differential = Math.abs(draft.team1Score - draft.team2Score)
    const { error: insertError } = await supabase.from("matches").insert({
      season_id: seasonId,
      week: draft.week,
      team1_id: draft.team1Id,
      team2_id: draft.team2Id,
      winner_id: draft.winnerId,
      team1_score: draft.team1Score,
      team2_score: draft.team2Score,
      differential,
      status: draft.winnerId ? "completed" : "scheduled",
    })

    if (insertError) {
      errors.push(`Week ${draft.week} ${draft.team1Id}/${draft.team2Id}: ${insertError.message}`)
    } else {
      matchesWritten += 1
    }
  }

  console.log(
    `[syncTeamSheetMatches] ${matchesWritten} matches from ${teamsProcessed} team sheets`
  )

  return {
    success: errors.length === 0 || matchesWritten > 0,
    teamsProcessed,
    matchesWritten,
    errors,
  }
}
