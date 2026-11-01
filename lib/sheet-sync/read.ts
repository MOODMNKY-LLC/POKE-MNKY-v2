import { google } from "googleapis"
import { JWT } from "google-auth-library"
import { getGoogleServiceAccountCredentials } from "@/lib/utils/google-sheets"
import type { SheetGrid } from "@/lib/sheet-sync/grid"

export const SHEET_SYNC_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets.readonly",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
] as const

export const SHEET_SYNC_RANGES = [
  ...Array.from({ length: 12 }, (_, index) => `'Team ${index + 1}'!A1:BO60`),
  "Data!A1:CR260",
  "'Standings For Playoffs'!A1:R21",
  "'MVP Race'!A1:AL174",
  "'Playoff Bracket'!A1:AN17",
  "'Master Data Sheet'!A1:AP545",
  "Divisions!A1:CJ87",
  "'Pokédex'!A1:P1264",
  "Rules!A1:AB102",
]

const RANGE_KEYS = [
  ...Array.from({ length: 12 }, (_, index) => `Team_${index + 1}`),
  "Data",
  "Standings_For_Playoffs",
  "MVP_Race",
  "Playoff_Bracket",
  "Master_Data_Sheet",
  "Divisions",
  "Pok_dex",
  "Rules",
]

export type GoogleSheetBundle = {
  tabs: Record<string, SheetGrid>
  version: string | null
  modifiedTime: string | null
  spreadsheetId: string
}

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

export async function loadSheetBundleFromGoogle(): Promise<GoogleSheetBundle> {
  const { email, privateKey, sheetId } = requireSheetConfig()
  const auth = new JWT({
    email,
    key: privateKey.replace(/\\n/g, "\n"),
    scopes: [...SHEET_SYNC_SCOPES],
  })
  const drive = google.drive({ version: "v3", auth })
  const meta = await drive.files.get({ fileId: sheetId, fields: "modifiedTime,version" })
  const sheets = google.sheets({ version: "v4", auth })
  const response = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: sheetId,
    ranges: SHEET_SYNC_RANGES,
    valueRenderOption: "FORMATTED_VALUE",
  })
  const tabs: Record<string, SheetGrid> = {}
  ;(response.data.valueRanges ?? []).forEach((range, index) => {
    const key = RANGE_KEYS[index]
    if (!key) return
    tabs[key] = {
      rows: (range.values ?? []).map((row) => row.map((cell) => (cell == null ? "" : String(cell)))),
    }
  })
  return {
    tabs,
    version: meta.data.version ?? null,
    modifiedTime: meta.data.modifiedTime ?? null,
    spreadsheetId: sheetId,
  }
}
