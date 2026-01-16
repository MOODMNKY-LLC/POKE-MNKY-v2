/**
 * Analyze Draft Board and Free Agency Structure
 * Understanding how drafting and free agency transactions work
 */

import * as dotenv from "dotenv"
import * as path from "path"
import { GoogleSpreadsheet } from "google-spreadsheet"
import { JWT } from "google-auth-library"
import { google } from "googleapis"
import { getGoogleServiceAccountCredentials } from "../lib/utils/google-sheets"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || "1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0"

async function analyzeDraftAndFreeAgency() {
  console.log("=".repeat(70))
  console.log("🔍 Analyzing Draft Board & Free Agency Structure")
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

    // 1. Analyze Draft Board
    console.log("\n" + "=".repeat(70))
    console.log("📊 DRAFT BOARD ANALYSIS")
    console.log("=".repeat(70))

    const draftBoardSheet = doc.sheetsByIndex.find(s => s.title === "Draft Board")
    if (draftBoardSheet) {
      console.log(`✅ Found Draft Board sheet: "${draftBoardSheet.title}"`)
      
      // Read first 20 rows to understand structure
      const draftResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `Draft Board!A1:Z20`,
      })

      const draftValues = draftResponse.data.values || []
      console.log(`\nDraft Board Structure (first 20 rows):`)
      console.log(`Total rows: ${draftValues.length}`)
      
      // Look for point value headers (Row 3)
      if (draftValues[2]) {
        console.log(`\nRow 3 (Point Headers):`)
        draftValues[2].forEach((val, idx) => {
          if (val && String(val).trim() !== '') {
            const colLetter = String.fromCharCode(65 + idx)
            console.log(`   ${colLetter}3: "${val}"`)
          }
        })
      }

      // Look for Pokemon rows (starting around Row 5)
      if (draftValues[4]) {
        console.log(`\nRow 5 (Sample Pokemon Row):`)
        draftValues[4].forEach((val, idx) => {
          if (val && String(val).trim() !== '') {
            const colLetter = String.fromCharCode(65 + idx)
            console.log(`   ${colLetter}5: "${val}"`)
          }
        })
      }
    }

    // 2. Analyze Team 1 Free Agency Columns (F & G)
    console.log("\n" + "=".repeat(70))
    console.log("🔄 FREE AGENCY ANALYSIS (Team 1)")
    console.log("=".repeat(70))

    const team1Sheet = doc.sheetsByIndex.find(s => s.title === "Team 1")
    if (team1Sheet) {
      console.log(`✅ Found Team 1 sheet`)
      
      // Read F2:G11 (Free Agency columns)
      const teamResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `Team 1!F2:G11`,
      })

      const teamValues = teamResponse.data.values || []
      console.log(`\nF2:G11 Structure:`)
      console.log(`F Column (Additions): G Column (Drops):`)
      
      teamValues.forEach((row, idx) => {
        const rowNum = idx + 2
        const fValue = String(row[0] || '').trim()
        const gValue = String(row[1] || '').trim()
        
        if (fValue || gValue) {
          console.log(`Row ${rowNum}: F="${fValue}" | G="${gValue}"`)
        }
      })

      // Also check D2:E11 (Draft picks) to understand relationship
      const draftPicksResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `Team 1!D2:E11`,
      })

      const draftPicks = draftPicksResponse.data.values || []
      console.log(`\nD2:E11 Structure (Draft Picks):`)
      console.log(`D Column (Pokemon): E Column (Points):`)
      
      draftPicks.forEach((row, idx) => {
        const rowNum = idx + 2
        const pokemon = String(row[0] || '').trim()
        const points = String(row[1] || '').trim()
        
        if (pokemon) {
          console.log(`Row ${rowNum}: "${pokemon}" (${points} pts)`)
        }
      })
    }

    // 3. Analyze Rules for Free Agency constraints
    console.log("\n" + "=".repeat(70))
    console.log("📋 FREE AGENCY RULES SUMMARY")
    console.log("=".repeat(70))
    console.log(`
Key Rules:
- Up to 10 Free Agency transactions through Week 8
- Pokemon point values must stay within 120pt cap
- Transactions take effect Monday 12:00AM EST
- Teams must have 8-10 Pokemon
- Coach-to-coach trading counts toward 10 transaction limit
    `)

    // 4. Generate workflow logic summary
    console.log("\n" + "=".repeat(70))
    console.log("💡 WORKFLOW LOGIC REQUIREMENTS")
    console.log("=".repeat(70))
    console.log(`
For each team page (Team 1, Team 2, etc.):

1. MONITOR F2:F11 (Additions Column)
   - When F cell has text = Pokemon being added
   - Need to check: Does Pokemon exist in draft pool?
   - Need to check: Does team have budget/space?

2. MONITOR G2:G11 (Drops Column)  
   - When G cell has "Dropping: [Pokemon]" = Pokemon being dropped
   - Extract Pokemon name from "Dropping: [Name]" format
   - Need to: Remove from team roster
   - Need to: Free up point budget

3. PROCESS TRANSACTION
   - If F has Pokemon AND G has drop:
     → Replace dropped Pokemon with new Pokemon
     → Update point budget
   - If F has Pokemon AND G is blank:
     → Add Pokemon (if budget allows)
   - If F is blank AND G has drop:
     → Just drop Pokemon (free up budget)

4. VALIDATION CHECKS
   - Point budget: Total must stay ≤ 120pts
   - Roster size: Must stay 8-10 Pokemon
   - Transaction limit: Max 10 F/A moves through Week 8
   - Pokemon availability: Must exist in draft pool

5. UPDATE LOCATIONS
   - Update team roster (D2:E11)
   - Update draft board (mark as drafted/available)
   - Update transaction log
    `)

  } catch (error: any) {
    console.error("\n❌ Analysis failed:", error.message)
    process.exit(1)
  }
}

analyzeDraftAndFreeAgency()
  .then(() => {
    console.log("\n✅ Analysis complete!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Failed:", error)
    process.exit(1)
  })
