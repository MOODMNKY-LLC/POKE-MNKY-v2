/**
 * Read-only Google Sheets access. Credentials come from the environment.
 * This module does not embed secrets.
 */

import { google } from "googleapis"
import { JWT } from "google-auth-library"
import { parseTeamTabs, type TeamTabGrid } from "@/lib/league-sheet/parse-tabs"
import type { LeagueSheet } from "@/lib/league-sheet/types"
import { getGoogleServiceAccountCredentials } from "@/lib/utils/google-sheets"

export const LEAGUE_SHEET_SEASON_KEY = "AABPBL-Season-7-2027"

function requireSheetConfig(): { email: string; privateKey: string; sheetId: string } {
  const credentials = getGoogleServiceAccountCredentials()
  const sheetId = process.env.GOOGLE_SHEET_ID?.trim()
  if (!credentials || !sheetId) {
    throw new Error(
      "Google sheet sync needs GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, and GOOGLE_SHEET_ID",
    )
  }
  return { ...credentials, sheetId }
}

export async function loadLeagueSheetFromGoogle(): Promise<LeagueSheet> {
  const { email, privateKey, sheetId } = requireSheetConfig()
  const auth = new JWT({
    email,
    key: privateKey.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  })
  const sheets = google.sheets({ version: "v4", auth })
  const ranges = Array.from({ length: 12 }, (_, index) => `Team ${index + 1}!A1:L16`)
  const response = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: sheetId,
    ranges,
    valueRenderOption: "UNFORMATTED_VALUE",
  })
  const tabs: TeamTabGrid[] = (response.data.valueRanges ?? []).map((range, index) => ({
    teamNumber: index + 1,
    values: ((range.values ?? []) as unknown[][]).map((row) => row.map((cell) => String(cell ?? ""))),
  }))
  return parseTeamTabs(tabs, { seasonKey: LEAGUE_SHEET_SEASON_KEY, seasonName: "Season 7" })
}
