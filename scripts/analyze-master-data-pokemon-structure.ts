/**
 * Analyze Master Data Sheet Pokemon Structure
 * Find how Pokemon and team assignments are tracked
 */

import * as dotenv from "dotenv"
import * as path from "path"
import { GoogleSpreadsheet } from "google-spreadsheet"
import { JWT } from "google-auth-library"
import { google } from "googleapis"
import { getGoogleServiceAccountCredentials } from "../lib/utils/google-sheets"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || "1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0"

async function analyzePokemonStructure() {
  console.log("=".repeat(70))
  console.log("🔍 Analyzing Master Data Sheet Pokemon Structure")
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

    // Read rows 90-110 (where we found Pokemon)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${masterSheet.title}!A90:AP110`,
    })

    const values = response.data.values || []
    
    console.log(`\n📊 Analyzing Rows 90-110 (Pokemon Draft Section)\n`)

    // Analyze header row if exists
    let headerRow = null
    for (let i = 89; i >= 85; i--) {
      if (values[i - 90]) {
        const row = values[i - 90] || []
        const hasHeaders = row.some(cell => {
          const str = String(cell || '').toLowerCase()
          return str.includes('pokemon') || str.includes('team') || str.includes('name') || 
                 str.includes('draft') || str.includes('point')
        })
        if (hasHeaders) {
          headerRow = { rowNum: i + 1, values: row }
          break
        }
      }
    }

    if (headerRow) {
      console.log(`📋 Header Row ${headerRow.rowNum}:`)
      headerRow.values.forEach((val, idx) => {
        if (val && String(val).trim() !== '') {
          const colLetter = idx < 26 ? String.fromCharCode(65 + idx) : 
                          String.fromCharCode(65 + Math.floor(idx/26) - 1) + String.fromCharCode(65 + (idx % 26))
          console.log(`   ${colLetter}${headerRow.rowNum}: "${val}"`)
        }
      })
    }

    // Analyze Pokemon rows (94-102)
    console.log("\n" + "=".repeat(70))
    console.log("📝 POKEMON DRAFT ENTRIES (Rows 94-102)")
    console.log("=".repeat(70))

    const pokemonRows = []
    for (let i = 93; i < 103; i++) {
      const rowIdx = i - 90
      if (values[rowIdx]) {
        const row = values[rowIdx] || []
        const pokemon = String(row[1] || '').trim() // Column B
        const teamNum = String(row[0] || '').trim() // Column A
        
        if (pokemon && pokemon.length > 2) {
          pokemonRows.push({
            row: i + 1,
            teamNum: teamNum,
            pokemon: pokemon,
            fullRow: row.slice(0, 15) // First 15 columns
          })
        }
      }
    }

    pokemonRows.forEach(({ row, teamNum, pokemon, fullRow }) => {
      console.log(`\nRow ${row}:`)
      console.log(`   A${row} (Team/Order): "${teamNum}"`)
      console.log(`   B${row} (Pokemon): "${pokemon}"`)
      console.log(`   Full row (first 15 cols):`, fullRow.map((v, idx) => {
        const colLetter = idx < 26 ? String.fromCharCode(65 + idx) : 
                        String.fromCharCode(65 + Math.floor(idx/26) - 1) + String.fromCharCode(65 + (idx % 26))
        return `${colLetter}${row}="${String(v || '').substring(0, 20)}"`
      }).filter(v => v.includes('=') && !v.endsWith('="')).join(', '))
    })

    // Also check rows 200-220 (where we found team assignments)
    console.log("\n" + "=".repeat(70))
    console.log("📝 TEAM ASSIGNMENT ENTRIES (Rows 200-220)")
    console.log("=".repeat(70))

    const teamResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${masterSheet.title}!A200:AP220`,
    })

    const teamValues = teamResponse.data.values || []

    for (let i = 200; i < 220; i++) {
      const rowIdx = i - 200
      if (teamValues[rowIdx]) {
        const row = teamValues[rowIdx] || []
        const hasTeamAndPokemon = row.some(cell => {
          const str = String(cell || '').toLowerCase()
          return str.includes('arkansas') || str.includes('team') || str.includes('ting-lu') || str.includes('iron valiant')
        })
        
        if (hasTeamAndPokemon) {
          console.log(`\nRow ${i + 1}:`)
          row.slice(0, 15).forEach((val, idx) => {
            if (val && String(val).trim() !== '') {
              const colLetter = idx < 26 ? String.fromCharCode(65 + idx) : 
                              String.fromCharCode(65 + Math.floor(idx/26) - 1) + String.fromCharCode(65 + (idx % 26))
              console.log(`   ${colLetter}${i + 1}: "${String(val).substring(0, 30)}"`)
            }
          })
        }
      }
    }

    // Generate structure hypothesis
    console.log("\n" + "=".repeat(70))
    console.log("💡 STRUCTURE HYPOTHESIS")
    console.log("=".repeat(70))
    console.log(`
Based on analysis:

1. DRAFT SECTION (Rows ~94-102):
   - Column A: Team number or draft order
   - Column B: Pokemon name (primary Pokemon)
   - Columns C-L: Other Pokemon in that team's roster?
   - Column L: Team number again?

2. TEAM ASSIGNMENT SECTION (Rows ~200+):
   - Contains team names and Pokemon assignments
   - May have different structure for tracking current rosters

3. FOR FREE AGENCY TRANSACTIONS:
   - Need to find Pokemon row in Master Data Sheet
   - Update team assignment column
   - For replacement: Clear dropped Pokemon's team, set new Pokemon's team
    `)

  } catch (error: any) {
    console.error("\n❌ Analysis failed:", error.message)
    if (error.stack) {
      console.error("Stack:", error.stack)
    }
    process.exit(1)
  }
}

analyzePokemonStructure()
  .then(() => {
    console.log("\n✅ Analysis complete!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Failed:", error)
    process.exit(1)
  })
