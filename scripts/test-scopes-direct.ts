/**
 * Direct test script to verify Google API scopes
 * Tests authentication and API access without going through Next.js API routes
 * Usage: npx tsx scripts/test-scopes-direct.ts [spreadsheet_id]
 */

import * as dotenv from "dotenv"
import * as path from "path"
import { GoogleSpreadsheet } from "google-spreadsheet"
import { JWT } from "google-auth-library"
import { google } from "googleapis"
import { getGoogleServiceAccountCredentials } from "../lib/utils/google-sheets"

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), ".env.local") })

const SPREADSHEET_ID = process.argv[2] || process.env.GOOGLE_SHEET_ID || "1wwH5XUHxQnivm90wGtNLQI_g7P3nPi5ZRcbZ3JU3-YQ"

async function testScopes() {
  console.log(`\n🔍 Testing Google API scopes for spreadsheet: ${SPREADSHEET_ID}\n`)

  try {
    const credentials = getGoogleServiceAccountCredentials()
    if (!credentials) {
      throw new Error("Google Sheets credentials not configured")
    }

    console.log("✅ Credentials loaded")
    console.log(`   Email: ${credentials.email}\n`)

    // Test with both scopes
    const scopes = [
      "https://www.googleapis.com/auth/spreadsheets.readonly",
      "https://www.googleapis.com/auth/drive.readonly",
    ]

    console.log("🔐 Authenticating with scopes:")
    scopes.forEach((scope) => console.log(`   - ${scope}`))
    console.log()

    const serviceAccountAuth = new JWT({
      email: credentials.email,
      key: credentials.privateKey,
      scopes,
    })

    // Test 1: Load spreadsheet info (Sheets API)
    console.log("📊 Test 1: Loading spreadsheet info (Sheets API)...")
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth)
    await doc.loadInfo()
    console.log(`   ✅ Success! Spreadsheet: "${doc.title}"`)
    console.log(`   ✅ Sheets found: ${doc.sheetCount}`)
    doc.sheetsByIndex.slice(0, 5).forEach((sheet, i) => {
      console.log(`      ${i + 1}. ${sheet.title}`)
    })
    if (doc.sheetCount > 5) {
      console.log(`      ... and ${doc.sheetCount - 5} more`)
    }
    console.log()

    // Test 2: Read cell data (Sheets API)
    console.log("📝 Test 2: Reading cell data (Sheets API)...")
    if (doc.sheetsByIndex.length > 0) {
      const firstSheet = doc.sheetsByIndex[0]
      await firstSheet.loadHeaderRow()
      const rows = await firstSheet.getRows({ limit: 3 })
      console.log(`   ✅ Success! Read ${rows.length} rows from "${firstSheet.title}"`)
      if (rows.length > 0 && firstSheet.headerValues) {
        console.log(`   ✅ Headers: ${firstSheet.headerValues.slice(0, 5).join(", ")}${firstSheet.headerValues.length > 5 ? "..." : ""}`)
      }
    }
    console.log()

    // Test 3: Get spreadsheet metadata (Sheets API)
    console.log("📋 Test 3: Getting spreadsheet metadata (Sheets API)...")
    const sheets = google.sheets({ version: "v4", auth: serviceAccountAuth })
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
      includeGridData: false,
    })
    console.log(`   ✅ Success! Metadata retrieved`)
    console.log(`   ✅ Spreadsheet title: "${metadata.data.properties?.title}"`)
    console.log(`   ✅ Sheets: ${metadata.data.sheets?.length || 0}`)
    console.log()

    // Test 4: Get merged cells info (Sheets API - doesn't require Drive)
    console.log("🔗 Test 4: Getting merged cells info (Sheets API)...")
    if (metadata.data.sheets && metadata.data.sheets.length > 0) {
      const firstSheetId = metadata.data.sheets[0].properties?.sheetId
      if (firstSheetId !== undefined) {
        const sheetData = await sheets.spreadsheets.get({
          spreadsheetId: SPREADSHEET_ID,
          ranges: [`${metadata.data.sheets[0].properties?.title}!A1:Z100`],
          includeGridData: false,
        })
        const merges = sheetData.data.sheets?.[0]?.merges || []
        console.log(`   ✅ Success! Found ${merges.length} merged cell ranges`)
      }
    }
    console.log()

    // Test 5: Try to get grid data with images (requires Drive scope)
    console.log("🖼️  Test 5: Getting grid data with images (requires Drive scope)...")
    try {
      const gridData = await sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID,
        ranges: [`${doc.sheetsByIndex[0].title}!A1:Z10`],
        includeGridData: true,
      })
      const embeddedObjects = gridData.data.sheets?.[0]?.data?.[0]?.embeddedObjects || []
      console.log(`   ✅ Success! Drive scope working`)
      console.log(`   ✅ Found ${embeddedObjects.length} embedded objects (images)`)
    } catch (error: any) {
      if (error.message?.includes("insufficient_scope") || error.message?.includes("403")) {
        console.log(`   ❌ Failed: Drive scope not working`)
        console.log(`   ⚠️  Error: ${error.message}`)
        console.log(`   💡 Make sure Google Drive API is enabled in Google Cloud Console`)
      } else {
        throw error
      }
    }
    console.log()

    // Summary
    console.log("=".repeat(60))
    console.log("✅ All scope tests completed!")
    console.log("=".repeat(60))
    console.log("\n📋 Summary:")
    console.log("   ✅ Sheets API: Working")
    console.log("   ✅ Drive API: " + (scopes.includes("https://www.googleapis.com/auth/drive.readonly") ? "Configured" : "Not configured"))
    console.log("\n💡 Next steps:")
    console.log("   1. If Drive scope test failed, enable Google Drive API in Cloud Console")
    console.log("   2. Ensure service account has Viewer access to the spreadsheet")
    console.log("   3. Run parser tests: npx tsx scripts/test-parsers.ts")

  } catch (error) {
    console.error("\n❌ Test failed:", error)
    if (error instanceof Error) {
      console.error("   Message:", error.message)
      if (error.message.includes("401") || error.message.includes("unauthorized")) {
        console.error("\n💡 Troubleshooting:")
        console.error("   1. Check that service account email has Viewer access to the spreadsheet")
        console.error("   2. Verify GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY are set")
        console.error("   3. Ensure Google Sheets API is enabled in Cloud Console")
      }
      if (error.message.includes("403") || error.message.includes("insufficient_scope")) {
        console.error("\n💡 Troubleshooting:")
        console.error("   1. Enable Google Drive API in Google Cloud Console")
        console.error("   2. Ensure both APIs are enabled: Sheets API and Drive API")
      }
    }
    process.exit(1)
  }
}

// Run tests
testScopes()
  .then(() => {
    console.log("\n✅ Scope test complete!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Scope test failed:", error)
    process.exit(1)
  })
