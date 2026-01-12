/**
 * Inspect specific team columns to see Pokemon data
 */

import * as dotenv from "dotenv"
import * as path from "path"
import { GoogleSpreadsheet } from "google-spreadsheet"
import { JWT } from "google-auth-library"
import { getGoogleServiceAccountCredentials } from "../lib/utils/google-sheets"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || "1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0"
const SHEET_NAME = "Draft Board"

async function inspectTeamColumns() {
  console.log("=".repeat(70))
  console.log("🔍 Inspecting Team Columns (Point Value Columns)")
  console.log("=".repeat(70))

  try {
    const credentials = getGoogleServiceAccountCredentials()
    if (!credentials) {
      throw new Error("Google Sheets credentials not configured")
    }

    const serviceAccountAuth = new JWT({
      email: credentials.email,
      key: credentials.privateKey,
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets.readonly",
        "https://www.googleapis.com/auth/drive.readonly",
      ],
    })

    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth)
    await doc.loadInfo()

    const sheet = doc.sheetsByTitle[SHEET_NAME]
    if (!sheet) {
      throw new Error(`Sheet "${SHEET_NAME}" not found`)
    }

    // Team columns detected: 9, 12, 15, 18, 21, 24, 27, 30 (0-indexed)
    // Which are columns: I, L, O, R, U, X, AA, AD (1-indexed)
    const teamColumns = [9, 12, 15, 18, 21, 24, 27, 30]
    const pointValues = [20, 19, 18, 17, 16, 15, 14, 13]

    const { google } = await import("googleapis")
    const sheets = google.sheets({ version: "v4", auth: serviceAccountAuth })
    
    // Get column letters
    function getColumnLetter(col: number): string {
      let result = ""
      while (col >= 0) {
        result = String.fromCharCode(65 + (col % 26)) + result
        col = Math.floor(col / 26) - 1
      }
      return result
    }

    console.log(`\n📊 Inspecting ${teamColumns.length} team columns (rows 3-20):\n`)

    for (let i = 0; i < teamColumns.length; i++) {
      const col = teamColumns[i]
      const pointValue = pointValues[i]
      const colLetter = getColumnLetter(col)
      
      console.log(`\n${colLetter}${col + 1} (${pointValue} Points) - Column ${col + 1} (index ${col}):`)
      
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!${colLetter}3:${colLetter}20`,
      })

      const values = response.data.values || []
      for (let rowIdx = 0; rowIdx < values.length; rowIdx++) {
        const val = String(values[rowIdx]?.[0] || "").trim()
        if (val) {
          console.log(`  Row ${rowIdx + 3}: "${val}"`)
        }
      }
    }

    console.log(`\n✅ Inspection complete\n`)
  } catch (error: any) {
    console.error("\n❌ Inspection failed:", error.message)
    if (error.stack) {
      console.error(error.stack)
    }
    process.exit(1)
  }
}

inspectTeamColumns()
