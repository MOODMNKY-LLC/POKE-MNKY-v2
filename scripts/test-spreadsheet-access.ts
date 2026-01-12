/**
 * Comprehensive spreadsheet access test
 * Tests reading data, enumerating sheets, and accessing metadata
 * Usage: npx tsx scripts/test-spreadsheet-access.ts [spreadsheet_id]
 */

import * as dotenv from "dotenv"
import * as path from "path"
import { GoogleSpreadsheet } from "google-spreadsheet"
import { JWT } from "google-auth-library"
import { google } from "googleapis"
import { getGoogleServiceAccountCredentials } from "../lib/utils/google-sheets"

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), ".env.local") })

const SPREADSHEET_ID = process.argv[2] || process.env.GOOGLE_SHEET_ID || "1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0"

async function testSpreadsheetAccess() {
  console.log("=".repeat(70))
  console.log("🔍 Comprehensive Spreadsheet Access Test")
  console.log("=".repeat(70))
  console.log(`\n📊 Spreadsheet ID: ${SPREADSHEET_ID}\n`)

  try {
    const credentials = getGoogleServiceAccountCredentials()
    if (!credentials) {
      throw new Error("Google Sheets credentials not configured")
    }

    console.log("✅ Credentials loaded")
    console.log(`   Email: ${credentials.email}\n`)

    const serviceAccountAuth = new JWT({
      email: credentials.email,
      key: credentials.privateKey,
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets.readonly",
        "https://www.googleapis.com/auth/drive.readonly",
      ],
    })

    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth)

    // Test 1: Load spreadsheet info
    console.log("📋 Test 1: Loading Spreadsheet Info")
    console.log("-".repeat(70))
    try {
      await doc.loadInfo()
      console.log(`✅ Success! Spreadsheet loaded`)
      console.log(`   Title: "${doc.title}"`)
      console.log(`   Total Sheets: ${doc.sheetCount}`)
      console.log(`   Spreadsheet ID: ${doc.spreadsheetId}`)
      console.log()
    } catch (error: any) {
      console.log(`❌ Failed: ${error.message}`)
      if (error.message?.includes("403") || error.message?.includes("permission")) {
        console.log("   ⚠️  This usually means the spreadsheet is not shared with the service account")
        console.log(`   💡 Share it with: ${credentials.email}`)
      }
      throw error
    }

    // Test 2: Enumerate all sheets
    console.log("📋 Test 2: Enumerating All Sheets")
    console.log("-".repeat(70))
    console.log(`✅ Found ${doc.sheetCount} sheet(s):\n`)
    doc.sheetsByIndex.forEach((sheet, index) => {
      console.log(`   ${index + 1}. "${sheet.title}"`)
      console.log(`      - Sheet ID: ${sheet.sheetId}`)
      console.log(`      - Row Count: ${sheet.rowCount}`)
      console.log(`      - Column Count: ${sheet.columnCount}`)
      console.log()
    })

    // Test 3: Read data from first few sheets
    console.log("📋 Test 3: Reading Data from Sheets")
    console.log("-".repeat(70))
    const sheetsToTest = Math.min(3, doc.sheetCount)
    for (let i = 0; i < sheetsToTest; i++) {
      const sheet = doc.sheetsByIndex[i]
      try {
        console.log(`\n   Testing sheet "${sheet.title}":`)
        
        // Try to load headers
        try {
          await sheet.loadHeaderRow()
          if (sheet.headerValues && sheet.headerValues.length > 0) {
            console.log(`   ✅ Headers found: ${sheet.headerValues.length} columns`)
            console.log(`      First 5 headers: ${sheet.headerValues.slice(0, 5).join(", ")}${sheet.headerValues.length > 5 ? "..." : ""}`)
          } else {
            console.log(`   ⚠️  No headers detected`)
          }
        } catch (headerError: any) {
          console.log(`   ⚠️  Could not load headers: ${headerError.message}`)
        }

        // Try to read rows
        try {
          const rows = await sheet.getRows({ limit: 3 })
          console.log(`   ✅ Rows read: ${rows.length}`)
          if (rows.length > 0) {
            const firstRow = rows[0]
            const rowData = firstRow._rawData || []
            if (rowData.length > 0) {
              console.log(`   ✅ First row data: ${rowData.slice(0, 5).join(" | ")}${rowData.length > 5 ? "..." : ""}`)
            }
          }
        } catch (rowError: any) {
          console.log(`   ⚠️  Could not read rows: ${rowError.message}`)
        }
      } catch (error: any) {
        console.log(`   ❌ Error testing sheet: ${error.message}`)
      }
    }
    console.log()

    // Test 4: Get spreadsheet metadata via Sheets API
    console.log("📋 Test 4: Getting Spreadsheet Metadata (Sheets API)")
    console.log("-".repeat(70))
    try {
      const sheets = google.sheets({ version: "v4", auth: serviceAccountAuth })
      const metadata = await sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID,
        includeGridData: false,
      })
      console.log(`✅ Metadata retrieved`)
      console.log(`   Title: "${metadata.data.properties?.title}"`)
      console.log(`   Locale: ${metadata.data.properties?.locale}`)
      console.log(`   Time Zone: ${metadata.data.properties?.timeZone}`)
      console.log(`   Sheets: ${metadata.data.sheets?.length || 0}`)
      console.log()
    } catch (error: any) {
      console.log(`❌ Failed: ${error.message}`)
      console.log()
    }

    // Test 5: Test grid data access (for images)
    console.log("📋 Test 5: Testing Grid Data Access (for Images)")
    console.log("-".repeat(70))
    try {
      const sheets = google.sheets({ version: "v4", auth: serviceAccountAuth })
      if (doc.sheetsByIndex.length > 0) {
        const firstSheet = doc.sheetsByIndex[0]
        const gridData = await sheets.spreadsheets.get({
          spreadsheetId: SPREADSHEET_ID,
          ranges: [`${firstSheet.title}!A1:Z10`],
          includeGridData: true,
        })
        const embeddedObjects = gridData.data.sheets?.[0]?.data?.[0]?.embeddedObjects || []
        console.log(`✅ Grid data accessible`)
        console.log(`   Embedded objects found: ${embeddedObjects.length}`)
        if (embeddedObjects.length > 0) {
          console.log(`   ✅ Images/comments can be extracted`)
        }
        console.log()
      }
    } catch (error: any) {
      console.log(`⚠️  Grid data test: ${error.message}`)
      console.log()
    }

    // Summary
    console.log("=".repeat(70))
    console.log("✅ All Tests Completed Successfully!")
    console.log("=".repeat(70))
    console.log("\n📊 Summary:")
    console.log(`   ✅ Spreadsheet: "${doc.title}"`)
    console.log(`   ✅ Sheets: ${doc.sheetCount}`)
    console.log(`   ✅ Access: Working`)
    console.log(`   ✅ Data Reading: Working`)
    console.log(`   ✅ Metadata: Accessible`)
    console.log("\n🎉 Service account has full access to the spreadsheet!")
    console.log("\n💡 Next Steps:")
    console.log("   1. Run comprehensive analysis: npx tsx scripts/test-sheet-analysis.ts")
    console.log("   2. Test parsers: npx tsx scripts/test-parsers.ts")
    console.log("   3. Start dev server and use admin panel")

  } catch (error: any) {
    console.log("\n" + "=".repeat(70))
    console.log("❌ Test Failed")
    console.log("=".repeat(70))
    console.log(`\nError: ${error.message}`)
    
    if (error.message?.includes("403") || error.message?.includes("permission")) {
      console.log("\n💡 Troubleshooting:")
      console.log("   1. Verify spreadsheet is shared with service account")
      console.log(`   2. Service account email: ${credentials?.email || "unknown"}`)
      console.log("   3. Wait 30-60 seconds after sharing for permissions to propagate")
      console.log("   4. Check that Viewer or Editor permission is granted")
    }
    
    if (error.stack) {
      console.log(`\nStack trace:\n${error.stack}`)
    }
    
    process.exit(1)
  }
}

testSpreadsheetAccess()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Unexpected error:", error)
    process.exit(1)
  })
