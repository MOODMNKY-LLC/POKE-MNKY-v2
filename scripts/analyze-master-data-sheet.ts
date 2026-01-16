/**
 * Analyze Master Data Sheet Structure
 * Understanding how drafting and free agency transactions update Master Data Sheet
 */

import * as dotenv from "dotenv"
import * as path from "path"
import { GoogleSpreadsheet } from "google-spreadsheet"
import { JWT } from "google-auth-library"
import { google } from "googleapis"
import { getGoogleServiceAccountCredentials } from "../lib/utils/google-sheets"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || "1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0"

async function analyzeMasterDataSheet() {
  console.log("=".repeat(70))
  console.log("🔍 Analyzing Master Data Sheet Structure")
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

    const sheets = google.sheets({ version: "v4", auth: serviceAccountAuth })

    // Find Master Data Sheet
    const masterDataSheet = doc.sheetsByIndex.find(s => 
      s.title.toLowerCase().includes("master") && 
      s.title.toLowerCase().includes("data")
    )

    if (!masterDataSheet) {
      console.log("❌ Master Data Sheet not found. Available sheets:")
      doc.sheetsByIndex.forEach((sheet, idx) => {
        console.log(`   ${idx + 1}. "${sheet.title}"`)
      })
      return
    }

    console.log(`✅ Found Master Data Sheet: "${masterDataSheet.title}"`)
    console.log(`   Rows: ${masterDataSheet.rowCount}, Columns: ${masterDataSheet.columnCount}\n`)

    // Read first 50 rows to understand structure
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${masterDataSheet.title}!A1:Z50`,
    })

    const values = response.data.values || []
    
    console.log("=".repeat(70))
    console.log("📊 MASTER DATA SHEET STRUCTURE")
    console.log("=".repeat(70))
    console.log(`Total rows fetched: ${values.length}\n`)

    // Analyze headers (Row 1)
    if (values[0]) {
      console.log("📋 Row 1 (Headers):")
      values[0].forEach((val, idx) => {
        if (val && String(val).trim() !== '') {
          const colLetter = String.fromCharCode(65 + idx)
          console.log(`   ${colLetter}1: "${val}"`)
        }
      })
    }

    // Analyze first few data rows
    console.log("\n📄 Sample Data Rows (2-10):")
    for (let rowIdx = 1; rowIdx < Math.min(10, values.length); rowIdx++) {
      const row = values[rowIdx] || []
      const rowNum = rowIdx + 1
      
      // Find columns that have data
      const rowData: Array<{ col: string; value: string }> = []
      for (let colIdx = 0; colIdx < Math.min(15, row.length); colIdx++) {
        const val = String(row[colIdx] || '').trim()
        if (val) {
          const colLetter = String.fromCharCode(65 + colIdx)
          rowData.push({ col: colLetter, value: val })
        }
      }
      
      if (rowData.length > 0) {
        console.log(`\nRow ${rowNum}:`)
        rowData.forEach(({ col, value }) => {
          console.log(`   ${col}${rowNum}: "${value}"`)
        })
      }
    }

    // Look for Pokemon name column and team assignment column
    console.log("\n" + "=".repeat(70))
    console.log("🔍 COLUMN ANALYSIS")
    console.log("=".repeat(70))

    const headers = values[0] || []
    const pokemonColumn = headers.findIndex(h => 
      String(h || '').toLowerCase().includes('pokemon') || 
      String(h || '').toLowerCase().includes('name')
    )
    const teamColumn = headers.findIndex(h => 
      String(h || '').toLowerCase().includes('team') ||
      String(h || '').toLowerCase().includes('assigned')
    )
    const pointColumn = headers.findIndex(h => 
      String(h || '').toLowerCase().includes('point') ||
      String(h || '').toLowerCase().includes('value')
    )

    console.log(`\nKey Column Positions:`)
    if (pokemonColumn >= 0) {
      const colLetter = String.fromCharCode(65 + pokemonColumn)
      console.log(`   Pokemon Name: Column ${colLetter} (${pokemonColumn + 1}) - "${headers[pokemonColumn]}"`)
    }
    if (teamColumn >= 0) {
      const colLetter = String.fromCharCode(65 + teamColumn)
      console.log(`   Team Assignment: Column ${colLetter} (${teamColumn + 1}) - "${headers[teamColumn]}"`)
    }
    if (pointColumn >= 0) {
      const colLetter = String.fromCharCode(65 + pointColumn)
      console.log(`   Point Value: Column ${colLetter} (${pointColumn + 1}) - "${headers[pointColumn]}"`)
    }

    // Analyze how transactions would update Master Data Sheet
    console.log("\n" + "=".repeat(70))
    console.log("💡 TRANSACTION UPDATE LOGIC")
    console.log("=".repeat(70))
    console.log(`
For Replacement Transaction (Type 1):
1. Find dropped Pokemon in Master Data Sheet
2. Update that Pokemon's row:
   - Clear team assignment (set to blank or "Free Agency")
   - Optionally: Update status/availability
3. Find new Pokemon in Master Data Sheet
4. Update that Pokemon's row:
   - Set team assignment to current team
   - Update status to "Drafted" or team name
    `)

    // Show example of how to find and update Pokemon
    if (pokemonColumn >= 0 && teamColumn >= 0) {
      console.log(`\nExample Update Pattern:`)
      console.log(`   Find Pokemon: Search Column ${String.fromCharCode(65 + pokemonColumn)} for Pokemon name`)
      console.log(`   Update Team: Set Column ${String.fromCharCode(65 + teamColumn)} to new team or clear it`)
      
      // Show a few Pokemon entries
      console.log(`\nSample Pokemon Entries:`)
      for (let rowIdx = 1; rowIdx < Math.min(6, values.length); rowIdx++) {
        const row = values[rowIdx] || []
        const pokemon = String(row[pokemonColumn] || '').trim()
        const team = String(row[teamColumn] || '').trim()
        
        if (pokemon) {
          const rowNum = rowIdx + 1
          const pokemonCol = String.fromCharCode(65 + pokemonColumn)
          const teamCol = String.fromCharCode(65 + teamColumn)
          console.log(`   Row ${rowNum}: ${pokemonCol}${rowNum}="${pokemon}" | ${teamCol}${rowNum}="${team}"`)
        }
      }
    }

  } catch (error: any) {
    console.error("\n❌ Analysis failed:", error.message)
    if (error.stack) {
      console.error("Stack:", error.stack)
    }
    process.exit(1)
  }
}

analyzeMasterDataSheet()
  .then(() => {
    console.log("\n✅ Analysis complete!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Failed:", error)
    process.exit(1)
  })
