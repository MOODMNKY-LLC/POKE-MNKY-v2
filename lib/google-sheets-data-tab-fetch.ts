/**
 * Node/Sheets API only — import from server routes or scripts, never from client components.
 */
import { google } from "googleapis"
import { JWT } from "google-auth-library"
import { DATA_TAB_TEAM_VALUE_RANGE } from "@/lib/google-sheets-data-tab"
import { getGoogleServiceAccountCredentials } from "@/lib/utils/google-sheets"

/** Load full Data-tab rows via Sheets API (reliable for wide sheets). Server-only. */
export async function fetchDataTabValueRows(
  spreadsheetId: string,
  sheetTitle = "Data"
): Promise<unknown[][]> {
  const credentials = getGoogleServiceAccountCredentials()
  if (!credentials) {
    throw new Error(
      "Google Sheets credentials not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY."
    )
  }

  const auth = new JWT({
    email: credentials.email,
    key: credentials.privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  })

  const sheets = google.sheets({ version: "v4", auth })
  const range = `${sheetTitle}!${DATA_TAB_TEAM_VALUE_RANGE}`
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
    valueRenderOption: "UNFORMATTED_VALUE",
  })

  return (res.data.values ?? []) as unknown[][]
}
