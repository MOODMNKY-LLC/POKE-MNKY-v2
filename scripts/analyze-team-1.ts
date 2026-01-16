/**
 * Analyze Team 1 page structure
 * Fetches and displays the structure of Team 1 sheet for formula creation
 */

import * as dotenv from "dotenv"
import * as path from "path"
import { GoogleSpreadsheet } from "google-spreadsheet"
import { JWT } from "google-auth-library"
import { google } from "googleapis"
import { getGoogleServiceAccountCredentials } from "../lib/utils/google-sheets"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || "1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0"

async function analyzeTeam1() {
  console.log("=".repeat(70))
  console.log("🔍 Analyzing Team 1 Page Structure")
  console.log("=".repeat(70))
  console.log(`📊 Spreadsheet ID: ${SPREADSHEET_ID}\n`)

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

    console.log(`📊 Spreadsheet: "${doc.title}"`)
    console.log(`📋 Total Sheets: ${doc.sheetCount}\n`)

    // Find Team 1 sheet (could be named "Team 1", "Team1", "Team 1 Roster", etc.)
    const team1Sheet = doc.sheetsByIndex.find(
      (sheet) =>
        sheet.title.toLowerCase().includes("team") &&
        (sheet.title.includes("1") || sheet.title.toLowerCase().includes("one"))
    )

    if (!team1Sheet) {
      console.log("❌ Team 1 sheet not found. Available sheets:")
      doc.sheetsByIndex.forEach((sheet, idx) => {
        console.log(`   ${idx + 1}. "${sheet.title}"`)
      })
      return
    }

    console.log(`✅ Found Team 1 sheet: "${team1Sheet.title}"\n`)

    // Load sheet info
    await team1Sheet.loadHeaderRow().catch(() => {
      console.log("⚠️  No header row detected")
    })

    const sheets = google.sheets({ version: "v4", auth: serviceAccountAuth })

    // Get full sheet data (first 50 rows, columns A-Z)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${team1Sheet.title}!A1:Z50`,
    })

    const values = response.data.values || []

    console.log("=".repeat(70))
    console.log("📋 Sheet Structure Analysis")
    console.log("=".repeat(70))
    console.log(`Total rows fetched: ${values.length}`)
    console.log(`Max columns: ${Math.max(...values.map((row) => row.length), 0)}\n`)

    // Display first 30 rows with cell references
    console.log("=".repeat(70))
    console.log("📄 First 30 Rows (with cell references)")
    console.log("=".repeat(70))

    for (let rowIdx = 0; rowIdx < Math.min(30, values.length); rowIdx++) {
      const row = values[rowIdx] || []
      const rowNum = rowIdx + 1
      console.log(`\nRow ${rowNum}:`)
      
      for (let colIdx = 0; colIdx < Math.min(10, row.length); colIdx++) {
        const cellValue = String(row[colIdx] || "").trim()
        if (cellValue) {
          const colLetter = String.fromCharCode(65 + colIdx) // A=65, B=66, etc.
          const cellRef = `${colLetter}${rowNum}`
          console.log(`   ${cellRef}: "${cellValue}"`)
        }
      }
    }

    // Analyze structure
    console.log("\n" + "=".repeat(70))
    console.log("🔍 Structure Analysis")
    console.log("=".repeat(70))

    // Check for structured format (A2:B2 = Team name, A4:B4 = Coach)
    if (values[1] && (values[1][0] || values[1][1])) {
      const teamName = String(values[1][0] || values[1][1] || "").trim()
      console.log(`\n✅ Team Name (A2:B2): "${teamName}"`)
      console.log(`   Formula: =A2 or =B2 or =IF(A2<>"",A2,B2)`)
    }

    if (values[3] && (values[3][0] || values[3][1])) {
      const coachName = String(values[3][0] || values[3][1] || "").trim()
      console.log(`\n✅ Coach Name (A4:B4): "${coachName}"`)
      console.log(`   Formula: =A4 or =B4 or =IF(A4<>"",A4,B4)`)
    }

    // Check for draft picks (Columns C-E, rows 1-11)
    console.log(`\n📝 Draft Picks (Columns C-E, Rows 1-11):`)
    const draftPicks: Array<{ row: number; pokemon: string; points: string }> = []
    
    for (let rowIdx = 1; rowIdx < Math.min(11, values.length); rowIdx++) {
      const row = values[rowIdx] || []
      const pokemon = String(row[3] || "").trim() // Column D (index 3 in range A:Z)
      const points = String(row[4] || "").trim() // Column E (index 4 in range A:Z)
      
      if (pokemon) {
        const rowNum = rowIdx + 1
        draftPicks.push({ row: rowNum, pokemon, points })
        console.log(`   Row ${rowNum}: ${pokemon} (${points} pts) - Formula: =D${rowNum}, =E${rowNum}`)
      }
    }

    // Look for other sections
    console.log(`\n📊 Other Sections:`)
    
    // Check for roster section (look for "Pokemon" or "Roster" headers)
    for (let rowIdx = 0; rowIdx < Math.min(20, values.length); rowIdx++) {
      const row = values[rowIdx] || []
      const firstCell = String(row[0] || "").toLowerCase()
      
      if (firstCell.includes("roster") || firstCell.includes("pokemon")) {
        console.log(`   ✅ Roster section starts at Row ${rowIdx + 1}`)
        console.log(`      Formula to get range: =INDIRECT("A${rowIdx + 1}:Z${rowIdx + 10}")`)
        break
      }
    }

    // Check for stats section
    for (let rowIdx = 0; rowIdx < Math.min(30, values.length); rowIdx++) {
      const row = values[rowIdx] || []
      const firstCell = String(row[0] || "").toLowerCase()
      
      if (firstCell.includes("win") || firstCell.includes("loss") || firstCell.includes("record")) {
        console.log(`   ✅ Stats section at Row ${rowIdx + 1}`)
        console.log(`      Cell: A${rowIdx + 1} = "${row[0]}"`)
        if (row[1]) {
          console.log(`      Value: B${rowIdx + 1} = "${row[1]}"`)
          console.log(`      Formula: =B${rowIdx + 1}`)
        }
        break
      }
    }

    // Generate formula suggestions
    console.log("\n" + "=".repeat(70))
    console.log("💡 Formula Suggestions")
    console.log("=".repeat(70))

    console.log(`
📌 Common Extraction Formulas:

1. Team Name:
   =IF(A2<>"",A2,IF(B2<>"",B2,""))
   =TRIM(CONCATENATE(A2,B2))

2. Coach Name:
   =IF(A4<>"",A4,IF(B4<>"",B4,""))
   =TRIM(CONCATENATE(A4,B4))

3. Draft Picks (Array):
   =D2:D11  (Pokemon names)
   =E2:E11  (Point values)
   =FILTER(D2:E11,D2:D11<>"")  (Non-empty picks only)

4. Specific Draft Pick (e.g., Round 1):
   =INDEX(D2:D11,1)  (First pick)
   =INDEX(D2:D11,2)  (Second pick)

5. Total Draft Points:
   =SUM(E2:E11)
   =SUMPRODUCT((D2:D11<>"")*E2:E11)

6. Count of Drafted Pokemon:
   =COUNTA(D2:D11)
   =COUNTIF(D2:D11,"<>")

7. Extract from specific cell:
   =INDIRECT("A2")  (Team name)
   =INDIRECT("D5")  (5th draft pick)
`)

    // Save detailed analysis
    const analysis = {
      sheet_name: team1Sheet.title,
      total_rows: values.length,
      structure: {
        team_name: values[1] ? { cell: "A2:B2", value: values[1][0] || values[1][1] } : null,
        coach_name: values[3] ? { cell: "A4:B4", value: values[3][0] || values[3][1] } : null,
        draft_picks: draftPicks,
      },
      all_data: values.slice(0, 30), // First 30 rows
    }

    const fs = await import("fs")
    const outputPath = path.join(process.cwd(), "team-1-analysis.json")
    fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2))
    console.log(`\n💾 Detailed analysis saved to: ${outputPath}`)

  } catch (error: any) {
    console.error("\n❌ Analysis failed:", error.message)
    if (error.stack) {
      console.error("Stack:", error.stack)
    }
    process.exit(1)
  }
}

analyzeTeam1()
  .then(() => {
    console.log("\n✅ Analysis complete!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Failed:", error)
    process.exit(1)
  })
