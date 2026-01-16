/**
 * Detailed Master Data Sheet Analysis
 * Find where Pokemon data actually starts and understand structure
 */

import * as dotenv from "dotenv"
import * as path from "path"
import { GoogleSpreadsheet } from "google-spreadsheet"
import { JWT } from "google-auth-library"
import { google } from "googleapis"
import { getGoogleServiceAccountCredentials } from "../lib/utils/google-sheets"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || "1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0"

async function analyzeMasterDataDetailed() {
  console.log("=".repeat(70))
  console.log("🔍 Detailed Master Data Sheet Analysis")
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
    const masterDataSheet = doc.sheetsByIndex.find(s => 
      s.title.toLowerCase().includes("master") && 
      s.title.toLowerCase().includes("data")
    )

    if (!masterDataSheet) {
      console.log("❌ Master Data Sheet not found")
      return
    }

    console.log(`✅ Found: "${masterDataSheet.title}"`)
    console.log(`   Dimensions: ${masterDataSheet.rowCount} rows × ${masterDataSheet.columnCount} columns\n`)

    // Try reading larger range to find data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${masterDataSheet.title}!A1:AP200`, // Read more columns and rows
    })

    const values = response.data.values || []
    
    // Find first row with substantial data
    let dataStartRow = -1
    for (let i = 0; i < values.length; i++) {
      const row = values[i] || []
      const nonEmptyCells = row.filter(cell => cell && String(cell).trim() !== '').length
      if (nonEmptyCells >= 3) { // At least 3 cells with data
        dataStartRow = i
        break
      }
    }

    if (dataStartRow >= 0) {
      console.log(`📊 Data starts at Row ${dataStartRow + 1}\n`)
      
      // Show header row (if exists, or first data row)
      const headerRow = dataStartRow > 0 ? values[dataStartRow - 1] : values[dataStartRow]
      if (headerRow) {
        console.log("=".repeat(70))
        console.log("📋 HEADER ROW ANALYSIS")
        console.log("=".repeat(70))
        console.log(`Row ${dataStartRow}:`)
        headerRow.forEach((val, idx) => {
          if (val && String(val).trim() !== '') {
            const colLetter = idx < 26 ? String.fromCharCode(65 + idx) : 
                            String.fromCharCode(65 + Math.floor(idx/26) - 1) + String.fromCharCode(65 + (idx % 26))
            console.log(`   ${colLetter}${dataStartRow}: "${val}"`)
          }
        })
      }

      // Show first 10 data rows
      console.log("\n" + "=".repeat(70))
      console.log("📄 FIRST 10 DATA ROWS")
      console.log("=".repeat(70))
      
      for (let i = dataStartRow; i < Math.min(dataStartRow + 10, values.length); i++) {
        const row = values[i] || []
        const rowNum = i + 1
        const rowData: Array<{ col: string; value: string }> = []
        
        for (let colIdx = 0; colIdx < Math.min(20, row.length); colIdx++) {
          const val = String(row[colIdx] || '').trim()
          if (val) {
            const colLetter = colIdx < 26 ? String.fromCharCode(65 + colIdx) : 
                            String.fromCharCode(65 + Math.floor(colIdx/26) - 1) + String.fromCharCode(65 + (colIdx % 26))
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

      // Try to identify key columns
      console.log("\n" + "=".repeat(70))
      console.log("🔍 COLUMN IDENTIFICATION")
      console.log("=".repeat(70))
      
      const headerRowValues = headerRow || values[dataStartRow] || []
      const pokemonCols: number[] = []
      const teamCols: number[] = []
      const pointCols: number[] = []
      
      headerRowValues.forEach((val, idx) => {
        const valStr = String(val || '').toLowerCase()
        if (valStr.includes('pokemon') || valStr.includes('name') || valStr.includes('mon')) {
          pokemonCols.push(idx)
        }
        if (valStr.includes('team') || valStr.includes('assigned') || valStr.includes('owner')) {
          teamCols.push(idx)
        }
        if (valStr.includes('point') || valStr.includes('value') || valStr.includes('cost')) {
          pointCols.push(idx)
        }
      })

      if (pokemonCols.length > 0) {
        console.log(`\nPokemon Name Columns:`)
        pokemonCols.forEach(colIdx => {
          const colLetter = colIdx < 26 ? String.fromCharCode(65 + colIdx) : 
                          String.fromCharCode(65 + Math.floor(colIdx/26) - 1) + String.fromCharCode(65 + (colIdx % 26))
          console.log(`   Column ${colLetter}: "${headerRowValues[colIdx]}"`)
        })
      }

      if (teamCols.length > 0) {
        console.log(`\nTeam Assignment Columns:`)
        teamCols.forEach(colIdx => {
          const colLetter = colIdx < 26 ? String.fromCharCode(65 + colIdx) : 
                          String.fromCharCode(65 + Math.floor(colIdx/26) - 1) + String.fromCharCode(65 + (colIdx % 26))
          console.log(`   Column ${colLetter}: "${headerRowValues[colIdx]}"`)
        })
      }

      if (pointCols.length > 0) {
        console.log(`\nPoint Value Columns:`)
        pointCols.forEach(colIdx => {
          const colLetter = colIdx < 26 ? String.fromCharCode(65 + colIdx) : 
                          String.fromCharCode(65 + Math.floor(colIdx/26) - 1) + String.fromCharCode(65 + (colIdx % 26))
          console.log(`   Column ${colLetter}: "${headerRowValues[colIdx]}"`)
        })
      }

      // Show example Pokemon entries with team assignments
      if (pokemonCols.length > 0 && teamCols.length > 0) {
        console.log("\n" + "=".repeat(70))
        console.log("📝 SAMPLE POKEMON ENTRIES")
        console.log("=".repeat(70))
        
        const pokemonCol = pokemonCols[0]
        const teamCol = teamCols[0]
        
        for (let i = dataStartRow; i < Math.min(dataStartRow + 5, values.length); i++) {
          const row = values[i] || []
          const pokemon = String(row[pokemonCol] || '').trim()
          const team = String(row[teamCol] || '').trim()
          
          if (pokemon) {
            const rowNum = i + 1
            const pokemonColLetter = pokemonCol < 26 ? String.fromCharCode(65 + pokemonCol) : 
                                   String.fromCharCode(65 + Math.floor(pokemonCol/26) - 1) + String.fromCharCode(65 + (pokemonCol % 26))
            const teamColLetter = teamCol < 26 ? String.fromCharCode(65 + teamCol) : 
                                String.fromCharCode(65 + Math.floor(teamCol/26) - 1) + String.fromCharCode(65 + (teamCol % 26))
            console.log(`Row ${rowNum}: ${pokemonColLetter}${rowNum}="${pokemon}" | ${teamColLetter}${rowNum}="${team}"`)
          }
        }
      }

    } else {
      console.log("⚠️  Could not find data start row. Trying alternative approach...")
      
      // Try reading specific ranges
      const ranges = [
        'A1:Z50',
        'A50:Z100',
        'A100:Z150',
        'A1:AP50'
      ]
      
      for (const range of ranges) {
        try {
          const testResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${masterDataSheet.title}!${range}`,
          })
          
          const testValues = testResponse.data.values || []
          const hasData = testValues.some(row => row && row.some(cell => cell && String(cell).trim() !== ''))
          
          if (hasData) {
            console.log(`\n✅ Found data in range: ${range}`)
            console.log(`   Rows with data: ${testValues.length}`)
            break
          }
        } catch (error) {
          // Continue to next range
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

analyzeMasterDataDetailed()
  .then(() => {
    console.log("\n✅ Analysis complete!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Failed:", error)
    process.exit(1)
  })
