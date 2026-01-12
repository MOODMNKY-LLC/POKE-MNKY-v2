/**
 * Diagnostic script to find Draft Results table location
 * Searches the Draft Board sheet for "Draft Results" text and team names
 */

import { GoogleSpreadsheet } from "google-spreadsheet"
import { getGoogleServiceAccountCredentials } from "../lib/utils/google-sheets"

async function findDraftResults() {
  const spreadsheetId = process.argv[2] || "1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0"
  const sheetName = process.argv[3] || "Draft Board"

  console.log("=".repeat(70))
  console.log("🔍 Finding Draft Results Table Location")
  console.log("=".repeat(70))
  console.log(`📊 Spreadsheet ID: ${spreadsheetId}`)
  console.log(`📋 Sheet: ${sheetName}\n`)

  try {
    // Load environment variables
    require("dotenv").config({ path: ".env.local" })
    
    const credentials = getGoogleServiceAccountCredentials()
    if (!credentials) {
      throw new Error("Google Sheets credentials not configured. Check GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY in .env.local")
    }

    const doc = new GoogleSpreadsheet(spreadsheetId)
    await doc.useServiceAccountAuth({
      client_email: credentials.email,
      private_key: credentials.privateKey,
    })

    await doc.loadInfo()
    const sheet = doc.sheetsByTitle[sheetName]

    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found`)
    }

    console.log(`✅ Sheet loaded: ${sheet.rowCount} rows, ${sheet.columnCount} columns\n`)

    // Use raw API to read entire sheet
    const { google } = await import("googleapis")
    const { JWT } = await import("google-auth-library")
    const serviceAccountAuth = new JWT({
      email: credentials.email,
      key: credentials.privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    })

    const sheets = google.sheets({ version: "v4", auth: serviceAccountAuth })

    // Read entire sheet in chunks
    const maxRows = Math.min(sheet.rowCount, 500)
    const chunkSize = 100

    console.log(`📖 Reading rows 1-${maxRows}...\n`)

    const allRows: Array<{ row: number; data: any[] }> = []

    for (let startRow = 0; startRow < maxRows; startRow += chunkSize) {
      const endRow = Math.min(startRow + chunkSize, maxRows)
      const range = `${sheetName}!A${startRow + 1}:Z${endRow}`

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      })

      const values = response.data.values || []
      for (let i = 0; i < values.length; i++) {
        allRows.push({
          row: startRow + i + 1,
          data: values[i] || [],
        })
      }
    }

    console.log(`✅ Read ${allRows.length} rows\n`)

    // Search for "Draft Results" text
    console.log("🔍 Searching for 'Draft Results' text...")
    const draftResultsRows: Array<{ row: number; cell: string; col: number }> = []

    for (const rowData of allRows) {
      for (let col = 0; col < rowData.data.length; col++) {
        const cellValue = String(rowData.data[col] || "").toLowerCase()
        if (cellValue.includes("draft results") || (cellValue.includes("round") && col === 0)) {
          draftResultsRows.push({
            row: rowData.row,
            cell: String(rowData.data[col] || ""),
            col: col + 1, // 1-indexed
          })
        }
      }
    }

    if (draftResultsRows.length > 0) {
      console.log(`\n✅ Found ${draftResultsRows.length} potential header rows:\n`)
      for (const found of draftResultsRows) {
        console.log(`  Row ${found.row}, Column ${found.col}: "${found.cell}"`)
      }
    } else {
      console.log("\n❌ No 'Draft Results' text found")
    }

    // Search for team names (common team name patterns)
    console.log("\n🔍 Searching for team names...")
    const teamNamePatterns = [
      /arkansas/i,
      /leicester/i,
      /miami/i,
      /daycare/i,
      /grand rapids/i,
      /boise/i,
      /tonebone/i,
      /tegucigalpa/i,
      /south bend/i,
      /kalamazoo/i,
    ]

    const teamNameRows: Array<{ row: number; names: string[] }> = []

    for (const rowData of allRows) {
      const names: string[] = []
      for (let col = 0; col < rowData.data.length; col++) {
        const cellValue = String(rowData.data[col] || "").trim()
        if (cellValue.length > 3 && cellValue.length < 50) {
          // Check if it matches any team name pattern
          for (const pattern of teamNamePatterns) {
            if (pattern.test(cellValue)) {
              names.push(cellValue)
              break
            }
          }
        }
      }
      if (names.length >= 3) {
        // Row with at least 3 team names
        teamNameRows.push({
          row: rowData.row,
          names,
        })
      }
    }

    if (teamNameRows.length > 0) {
      console.log(`\n✅ Found ${teamNameRows.length} rows with team names:\n`)
      for (const found of teamNameRows.slice(0, 5)) {
        console.log(`  Row ${found.row}: ${found.names.slice(0, 5).join(", ")}...`)
      }
    } else {
      console.log("\n❌ No team name rows found")
    }

    // Show sample data around potential Draft Results location (row 92)
    console.log("\n📊 Sample data around row 92 (expected Draft Results location):\n")
    const sampleRows = allRows.filter((r) => r.row >= 90 && r.row <= 100)
    for (const rowData of sampleRows) {
      const nonEmptyCells = rowData.data
        .map((cell, idx) => ({ col: idx + 1, value: String(cell || "").trim() }))
        .filter((c) => c.value.length > 0)
        .slice(0, 10) // First 10 non-empty cells

      if (nonEmptyCells.length > 0) {
        console.log(`  Row ${rowData.row}: ${nonEmptyCells.map((c) => `${c.value}`).join(" | ")}`)
      }
    }

    console.log("\n" + "=".repeat(70))
    console.log("✅ Diagnostic complete")
    console.log("=".repeat(70))
  } catch (error) {
    console.error("❌ Error:", error)
    process.exit(1)
  }
}

findDraftResults()
