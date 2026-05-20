/**
 * Sync per-team sheet tabs ("Team 1" … "Team 12") into draft_picks for the current season.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import { google } from "googleapis"
import { JWT } from "google-auth-library"
import { fetchDataTabValueRows } from "@/lib/google-sheets-data-tab-fetch"
import { DATA_TAB_COL, dedupeDataTabTeams, parseDataTabTeamRow } from "@/lib/google-sheets-data-tab"
import { getCurrentSeasonIdWithFallback } from "@/lib/seasons"
import { resolveOrCreatePokemonId } from "@/lib/pokemon-resolve"
import { getGoogleServiceAccountCredentials } from "@/lib/utils/google-sheets"

export type TeamPageRosterSyncResult = {
  success: boolean
  teamsProcessed: number
  picksWritten: number
  errors: string[]
}

const TEAM_SHEET_PATTERN = /^Team\s+(\d+)$/i

export type TeamSheetPick = {
  pokemon: string
  pointValue: number
  round: number
}

/** Map Data-tab team ID (1–12) → league team name. */
export async function buildSheetTeamIdToNameMap(
  spreadsheetId: string
): Promise<Map<number, string>> {
  const rows = await fetchDataTabValueRows(spreadsheetId)
  const parsed = rows
    .map((raw) => parseDataTabTeamRow(raw))
    .filter((t): t is NonNullable<typeof t> => t != null)
  const teams = dedupeDataTabTeams(parsed)
  const map = new Map<number, string>()
  for (const raw of rows) {
    const teamId = Number(raw[DATA_TAB_COL.teamId])
    const name = String(raw[DATA_TAB_COL.teamName] ?? "").trim()
    if (teamId >= 1 && teamId <= 99 && name) {
      map.set(teamId, name)
    }
  }
  for (const t of teams) {
    const row = rows.find((r) => String(r[DATA_TAB_COL.teamName] ?? "").trim() === t.name)
    const teamId = row ? Number(row[DATA_TAB_COL.teamId]) : NaN
    if (teamId >= 1 && teamId <= 99) map.set(teamId, t.name)
  }
  return map
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

/** Read draft picks from `Team N` sheet columns C–E rows 2–11. */
export async function fetchTeamSheetPicks(
  spreadsheetId: string,
  sheetTitle: string
): Promise<TeamSheetPick[]> {
  const sheets = await sheetsClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetTitle}!C1:E11`,
    valueRenderOption: "UNFORMATTED_VALUE",
  })
  const values = (res.data.values ?? []) as unknown[][]
  const picks: TeamSheetPick[] = []

  for (let rowIdx = 1; rowIdx < values.length && rowIdx <= 10; rowIdx++) {
    const row = values[rowIdx] ?? []
    const pokemon = String(row[1] ?? "").trim()
    const pointRaw = row[2]
    const pointValue =
      typeof pointRaw === "number"
        ? Math.trunc(pointRaw)
        : Number.parseInt(String(pointRaw ?? "").trim(), 10)
    if (!pokemon || Number.isNaN(pointValue)) continue
    picks.push({ pokemon, pointValue, round: rowIdx })
  }

  return picks
}

export async function syncTeamPageRosters(
  supabase: SupabaseClient,
  spreadsheetId: string,
  sheetTitles: string[]
): Promise<TeamPageRosterSyncResult> {
  const errors: string[] = []
  let teamsProcessed = 0
  let picksWritten = 0

  const seasonId = await getCurrentSeasonIdWithFallback(supabase)
  if (!seasonId) {
    return {
      success: false,
      teamsProcessed: 0,
      picksWritten: 0,
      errors: ["No current season configured (is_current on seasons)."],
    }
  }

  const idToName = await buildSheetTeamIdToNameMap(spreadsheetId)
  const { data: teams } = await supabase.from("teams").select("id, name").eq("season_id", seasonId)
  const nameToId = new Map((teams ?? []).map((t) => [t.name, t.id]))

  const teamSheets = sheetTitles.filter((t) => TEAM_SHEET_PATTERN.test(t.trim()))

  for (const sheetTitle of teamSheets) {
    const match = sheetTitle.trim().match(TEAM_SHEET_PATTERN)
    const sheetNum = match ? Number.parseInt(match[1], 10) : NaN
    const teamName = idToName.get(sheetNum)
    if (!teamName) {
      errors.push(`Sheet "${sheetTitle}": no team name for Data tab ID ${sheetNum}`)
      continue
    }

    const teamId = nameToId.get(teamName)
    if (!teamId) {
      errors.push(`Sheet "${sheetTitle}": team "${teamName}" not in DB for current season — sync Data tab first`)
      continue
    }

    let picks: TeamSheetPick[] = []
    try {
      picks = await fetchTeamSheetPicks(spreadsheetId, sheetTitle)
    } catch (e) {
      errors.push(
        `Sheet "${sheetTitle}": ${e instanceof Error ? e.message : "failed to read picks"}`
      )
      continue
    }

    if (picks.length === 0) {
      errors.push(`Sheet "${sheetTitle}": no Pokémon picks found in C2:E11`)
      continue
    }

    const { error: clearError } = await supabase
      .from("draft_picks")
      .delete()
      .eq("team_id", teamId)
      .eq("season_id", seasonId)

    if (clearError) {
      errors.push(`Team "${teamName}": could not clear draft_picks — ${clearError.message}`)
      continue
    }

    let pickNum = 0
    for (const pick of picks) {
      const pokemon = await resolveOrCreatePokemonId(supabase, pick.pokemon)
      if (!pokemon) {
        errors.push(`Team "${teamName}": could not resolve Pokémon "${pick.pokemon}"`)
        continue
      }

      pickNum += 1
      const { error: insertError } = await supabase.from("draft_picks").insert({
        season_id: seasonId,
        team_id: teamId,
        pokemon_id: pokemon.id,
        acquisition: "draft",
        draft_round: pick.round,
        pick_number: pickNum,
        status: "active",
        points_snapshot: pick.pointValue,
      })

      if (insertError) {
        errors.push(`Team "${teamName}" / ${pick.pokemon}: ${insertError.message}`)
      } else {
        picksWritten += 1
      }
    }

    teamsProcessed += 1
    console.log(
      `[syncTeamPageRosters] ${teamName} (${sheetTitle}): ${pickNum} picks`
    )
  }

  return {
    success: errors.length === 0 || picksWritten > 0,
    teamsProcessed,
    picksWritten,
    errors,
  }
}
