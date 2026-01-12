/**
 * Test Google Sheets access to verify permissions and sheet structure
 * Tests Master Data Sheet, Rules, and Draft Board tabs
 */

import * as dotenv from "dotenv"
import * as path from "path"
import { GoogleSpreadsheet } from "google-spreadsheet"
import { JWT } from "google-auth-library"
import { getGoogleServiceAccountCredentials } from "../lib/utils/google-sheets"
import { google } from "googleapis"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

const SPREADSHEET_ID = "1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0"
const SHEETS_TO_TEST = ["Master Data Sheet", "Rules", "Draft Board"]

async function testGoogleSheetsAccess() {
  console.log("=".repeat(70))
  console.log("🔍 Testing Google Sheets Access")
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

    console.log(`✅ Spreadsheet loaded: "${doc.title}"`)
    console.log(`📋 Total sheets: ${doc.sheetCount}\n`)

    // Test each sheet
    for (const sheetName of SHEETS_TO_TEST) {
      console.log("-".repeat(70))
      console.log(`📄 Testing: ${sheetName}`)
      console.log("-".repeat(70))

      const sheet = doc.sheetsByTitle[sheetName]
      if (!sheet) {
        console.log(`❌ Sheet "${sheetName}" not found`)
        console.log(`Available sheets: ${Object.keys(doc.sheetsByTitle).join(", ")}\n`)
        continue
      }

      console.log(`✅ Sheet found: ${sheet.rowCount} rows, ${sheet.columnCount} columns`)

      // Read row 3 to check for point value headers (Draft Board)
      if (sheetName === "Draft Board") {
        const sheets = google.sheets({ version: "v4", auth: serviceAccountAuth })
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `${sheetName}!A3:ZZ3`,
        })

        const rowData = response.data.values?.[0] || []
        console.log(`📊 Row 3 has ${rowData.length} columns`)

        // Find all point value headers
        const pointValues: Array<{ col: number; value: number; letter: string }> = []
        for (let col = 0; col < rowData.length; col++) {
          const value = String(rowData[col] || "").trim()
          const match = value.match(/(\d+)\s*points?/i)
          if (match) {
            const pointValue = parseInt(match[1], 10)
            if (pointValue >= 2 && pointValue <= 20) {
              const letter = getColumnLetter(col)
              pointValues.push({ col, value: pointValue, letter })
            }
          }
        }

        console.log(`\n🎯 Found ${pointValues.length} point value columns:`)
        pointValues.sort((a, b) => b.value - a.value)
        pointValues.forEach((pv) => {
          console.log(`  ${pv.letter}3 = ${pv.value}pts (column ${pv.col})`)
        })

        // Check column pattern
        if (pointValues.length > 0) {
          const firstCol = pointValues[0].col
          const secondCol = pointValues.length > 1 ? pointValues[1].col : null
          if (secondCol) {
            const diff = secondCol - firstCol
            console.log(`\n📐 Column spacing: ${diff} columns between headers`)
          }
        }
      }

      // Read first few rows for other sheets using raw API
      if (sheetName !== "Draft Board") {
        const sheets = google.sheets({ version: "v4", auth: serviceAccountAuth })
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `${sheetName}!A1:E5`,
        })

        const rows = response.data.values || []
        console.log(`\n📖 Sample rows (first ${Math.min(rows.length, 5)}):`)
        rows.slice(0, 5).forEach((row, idx) => {
          const values = row.slice(0, 10).map((v: any) => String(v || "").substring(0, 20)).join(" | ")
          console.log(`  Row ${idx + 1}: ${values}`)
        })
      }

      console.log()
    }

    console.log("=".repeat(70))
    console.log("✅ Access Test Complete")
    console.log("=".repeat(70))
  } catch (error: any) {
    console.error("\n❌ Error:", error.message)
    if (error.response) {
      console.error("Response:", JSON.stringify(error.response.data, null, 2))
    }
    process.exit(1)
  }
}

function getColumnLetter(index: number): string {
  let result = ""
  let num = index
  while (num >= 0) {
    result = String.fromCharCode(65 + (num % 26)) + result
    num = Math.floor(num / 26) - 1
  }
  return result
}

testGoogleSheetsAccess()
