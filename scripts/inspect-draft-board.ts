/**
 * Diagnostic script to inspect Draft Board sheet structure
 * Helps understand why picks aren't being extracted
 */

import * as dotenv from "dotenv"
import * as path from "path"
import { GoogleSpreadsheet } from "google-spreadsheet"
import { JWT } from "google-auth-library"
import { getGoogleServiceAccountCredentials } from "../lib/utils/google-sheets"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || "1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0"
const SHEET_NAME = "Draft Board"

async function inspectDraftBoard() {
  console.log("=".repeat(70))
  console.log("🔍 Draft Board Structure Inspection")
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

    console.log(`\n📊 Sheet: "${sheet.title}"`)
    console.log(`   Dimensions: ${sheet.rowCount} rows × ${sheet.columnCount} columns`)

    // Load first 20 rows and columns to see structure
    const { google } = await import("googleapis")
    const sheets = google.sheets({ version: "v4", auth: serviceAccountAuth })
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1:Z20`,
    })

    const values = response.data.values || []
    console.log(`\n📋 First ${values.length} rows preview:\n`)

    // Display grid
    for (let rowIdx = 0; rowIdx < Math.min(values.length, 20); rowIdx++) {
      const row = values[rowIdx] || []
      const rowDisplay = row
        .slice(0, 15)
        .map((cell: any, colIdx: number) => {
          const val = String(cell || "").trim()
          return val.length > 15 ? val.substring(0, 12) + "..." : val.padEnd(15)
        })
        .join(" | ")
      console.log(`Row ${(rowIdx + 1).toString().padStart(2)}: ${rowDisplay}`)
    }

    // Analyze structure
    console.log(`\n🔍 Structure Analysis:\n`)

    // Check first column for round indicators
    let roundIndicators = 0
    const firstColValues: string[] = []
    for (let row = 0; row < Math.min(values.length, 50); row++) {
      const val = String((values[row] || [])[0] || "").trim()
      firstColValues.push(val)
      if (val.match(/^(round|r)\s*\d+$/i) || (val.match(/^\d+$/) && parseInt(val) > 0 && parseInt(val) < 50)) {
        roundIndicators++
      }
    }
    console.log(`   First column round indicators: ${roundIndicators}`)
    console.log(`   First column sample values: ${firstColValues.slice(0, 10).join(", ")}`)

    // Check first row for team names
    let teamNames = 0
    const firstRowValues: string[] = []
    if (values[0]) {
      for (let col = 0; col < Math.min(values[0].length, 30); col++) {
        const val = String(values[0][col] || "").trim()
        firstRowValues.push(val)
        if (val && !val.match(/^\d+$/) && val.length > 1 && val.length < 50) {
          teamNames++
        }
      }
    }
    console.log(`   First row potential team names: ${teamNames}`)
    console.log(`   First row sample values: ${firstRowValues.slice(0, 10).join(", ")}`)

    // Find first non-empty row
    let firstDataRow = -1
    for (let row = 0; row < values.length; row++) {
      const rowData = values[row] || []
      if (rowData.some((cell: any) => cell && String(cell).trim().length > 0)) {
        firstDataRow = row
        break
      }
    }
    console.log(`   First non-empty row: ${firstDataRow + 1}`)

    // Count non-empty cells per row (to find data density)
    console.log(`\n📈 Data Density Analysis:\n`)
    for (let row = 0; row < Math.min(values.length, 10); row++) {
      const rowData = values[row] || []
      const nonEmpty = rowData.filter((cell: any) => cell && String(cell).trim().length > 0).length
      console.log(`   Row ${(row + 1).toString().padStart(2)}: ${nonEmpty} non-empty cells`)
    }

    // Look for Pokemon names (common patterns)
    console.log(`\n🔎 Pokemon Name Detection:\n`)
    let pokemonFound = 0
    const pokemonSamples: string[] = []
    for (let row = 0; row < Math.min(values.length, 50); row++) {
      const rowData = values[row] || []
      for (let col = 0; col < Math.min(rowData.length, 30); col++) {
        const val = String(rowData[col] || "").trim()
        // Common Pokemon name patterns: capitalized, 3-15 chars, not numbers
        if (
          val &&
          val.length >= 3 &&
          val.length <= 15 &&
          !val.match(/^\d+$/) &&
          val[0] === val[0].toUpperCase() &&
          pokemonSamples.length < 10
        ) {
          pokemonSamples.push(val)
          pokemonFound++
        }
      }
    }
    console.log(`   Potential Pokemon names found: ${pokemonFound}`)
    console.log(`   Samples: ${pokemonSamples.join(", ")}`)

    console.log(`\n✅ Inspection complete\n`)
  } catch (error: any) {
    console.error("\n❌ Inspection failed:", error.message)
    if (error.stack) {
      console.error(error.stack)
    }
    process.exit(1)
  }
}

inspectDraftBoard()
