/**
 * Analyze Master Data Sheet Draft Structure
 * Understanding how draft picks are stored and how free agency updates them
 */

import * as dotenv from "dotenv"
import * as path from "path"
import { GoogleSpreadsheet } from "google-spreadsheet"
import { JWT } from "google-auth-library"
import { google } from "googleapis"
import { getGoogleServiceAccountCredentials } from "../lib/utils/google-sheets"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || "1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0"

async function analyzeDraftStructure() {
  console.log("=".repeat(70))
  console.log("🔍 Analyzing Master Data Sheet Draft Structure")
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
    const masterSheet = doc.sheetsByIndex.find(s => 
      s.title.toLowerCase().includes("master") && 
      s.title.toLowerCase().includes("data")
    )

    if (!masterSheet) {
      console.log("❌ Master Data Sheet not found")
      return
    }

    // Read rows 550-570 to understand draft structure
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${masterSheet.title}!A550:Z570`,
    })

    const values = response.data.values || []
    
    console.log("\n📊 DRAFT STRUCTURE ANALYSIS")
    console.log("=".repeat(70))

    // Row 551: Coach names
    if (values[0]) {
      console.log("\nRow 551 (Coaches):")
      values[0].forEach((val, idx) => {
        if (val && String(val).trim() !== '') {
          const colLetter = idx < 26 ? String.fromCharCode(65 + idx) : 
                          String.fromCharCode(65 + Math.floor(idx/26) - 1) + String.fromCharCode(65 + (idx % 26))
          console.log(`   ${colLetter}551: "${val}"`)
        }
      })
    }

    // Row 552: Team names (HEADERS)
    if (values[1]) {
      console.log("\nRow 552 (Team Names - HEADERS):")
      const teamMapping: { [key: string]: string } = {}
      values[1].forEach((val, idx) => {
        if (val && String(val).trim() !== '') {
          const colLetter = idx < 26 ? String.fromCharCode(65 + idx) : 
                          String.fromCharCode(65 + Math.floor(idx/26) - 1) + String.fromCharCode(65 + (idx % 26))
          const teamName = String(val).trim()
          teamMapping[colLetter] = teamName
          console.log(`   ${colLetter}552: "${teamName}"`)
        }
      })
      
      // Store team mapping for later use
      console.log("\n📋 Team Column Mapping:")
      Object.entries(teamMapping).forEach(([col, team]) => {
        console.log(`   Column ${col} = ${team}`)
      })
    }

    // Rows 553+: Draft picks
    console.log("\n📝 Draft Picks (Rows 553+):")
    console.log("   Each row = Draft round")
    console.log("   Each column = Team's pick for that round\n")

    for (let i = 2; i < Math.min(12, values.length); i++) {
      const row = values[i] || []
      const rowNum = i + 550
      
      // Show first Pokemon in each team's column
      const picks: Array<{ col: string; pokemon: string }> = []
      for (let j = 0; j < Math.min(15, row.length); j++) {
        const pokemon = String(row[j] || '').trim()
        if (pokemon && pokemon.length > 2) {
          const colLetter = j < 26 ? String.fromCharCode(65 + j) : 
                          String.fromCharCode(65 + Math.floor(j/26) - 1) + String.fromCharCode(65 + (j % 26))
          picks.push({ col: colLetter, pokemon })
        }
      }
      
      if (picks.length > 0) {
        console.log(`Row ${rowNum + 1} (Round ${i - 1}):`)
        picks.forEach(({ col, pokemon }) => {
          console.log(`   ${col}${rowNum + 1}: "${pokemon}"`)
        })
        console.log("")
      }
    }

    // Analyze: How to find Pokemon and update team assignment
    console.log("\n" + "=".repeat(70))
    console.log("💡 FREE AGENCY UPDATE LOGIC")
    console.log("=".repeat(70))
    console.log(`
Structure Understanding:
- Row 552: Team names (Column A = Team 1, Column B = Team 2, etc.)
- Rows 553+: Draft picks (each row = round, each column = team)

For Free Agency Transactions:

1. FIND DROPPED POKEMON:
   - Search rows 553+ for Pokemon name
   - Identify which column (team) it's in
   - That column = team assignment

2. UPDATE DROPPED POKEMON:
   - Clear the cell where Pokemon is found
   - OR mark as available (depends on implementation)

3. FIND ADDED POKEMON LOCATION:
   - Determine which team is adding Pokemon
   - Find empty cell in that team's column (rows 553+)
   - Add Pokemon name to that cell

4. UPDATE ADDED POKEMON:
   - Place Pokemon in appropriate team column
   - Ensure it's in correct position (may need to shift)

Key Questions:
- When Pokemon is dropped, do we clear the cell or mark it differently?
- When Pokemon is added, where exactly in the column does it go?
- Do we need to maintain draft order or can we add to any empty cell?
    `)

    // Test: Find a specific Pokemon and its team
    console.log("\n" + "=".repeat(70))
    console.log("🔍 TEST: Finding Pokemon Team Assignment")
    console.log("=".repeat(70))
    
    const testPokemon = "Ting-Lu"
    console.log(`\nSearching for "${testPokemon}"...`)
    
    for (let i = 2; i < values.length; i++) {
      const row = values[i] || []
      for (let j = 0; j < row.length; j++) {
        const cell = String(row[j] || '').trim()
        if (cell.toLowerCase() === testPokemon.toLowerCase()) {
          const rowNum = i + 550 + 1
          const colLetter = j < 26 ? String.fromCharCode(65 + j) : 
                          String.fromCharCode(65 + Math.floor(j/26) - 1) + String.fromCharCode(65 + (j % 26))
          const teamName = values[1] && values[1][j] ? String(values[1][j]).trim() : "Unknown"
          console.log(`✅ Found "${testPokemon}" at ${colLetter}${rowNum}`)
          console.log(`   Team: ${teamName} (Column ${colLetter})`)
          console.log(`   Round: Row ${rowNum} (Round ${i - 1})`)
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

analyzeDraftStructure()
  .then(() => {
    console.log("\n✅ Analysis complete!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Failed:", error)
    process.exit(1)
  })
