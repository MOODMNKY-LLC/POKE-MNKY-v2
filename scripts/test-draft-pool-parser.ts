/**
 * Test script for Draft Pool Parser
 * Extracts available Pokemon with point values from Draft Board
 */

import * as dotenv from "dotenv"
import * as path from "path"
import { GoogleSpreadsheet } from "google-spreadsheet"
import { JWT } from "google-auth-library"
import { getGoogleServiceAccountCredentials } from "../lib/utils/google-sheets"
import { createServiceRoleClient } from "../lib/supabase/service"
import { DraftPoolParser } from "../lib/google-sheets-parsers/draft-pool-parser"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || "1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0"
const SHEET_NAME = "Draft Board"

async function testDraftPoolParser() {
  console.log("=".repeat(70))
  console.log("🧪 Testing Draft Pool Parser")
  console.log("=".repeat(70))
  console.log(`📊 Spreadsheet ID: ${SPREADSHEET_ID}`)
  console.log(`📋 Sheet: ${SHEET_NAME}\n`)

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

    const sheet = doc.sheetsByTitle[SHEET_NAME]
    if (!sheet) {
      throw new Error(`Sheet "${SHEET_NAME}" not found`)
    }

    console.log(`✅ Sheet loaded: ${sheet.rowCount} rows, ${sheet.columnCount} columns\n`)

    const supabase = createServiceRoleClient()
    const parser = new DraftPoolParser(sheet, supabase, {
      parser_type: "draft_pool",
      table_name: "draft_pool",
      use_ai: false,
      has_headers: false,
      spreadsheetId: SPREADSHEET_ID, // Pass spreadsheet ID
    } as any)

    console.log("🔍 Extracting draft pool...\n")
    const result = await parser.parse()

    console.log("\n" + "=".repeat(70))
    console.log("📊 Results")
    console.log("=".repeat(70))
    console.log(`✅ Records processed: ${result.recordsProcessed}`)
    console.log(`⚠️  Warnings: ${result.warnings?.length || 0}`)
    console.log(`❌ Errors: ${result.errors.length}`)

    if (result.errors.length > 0) {
      console.log("\nErrors:")
      result.errors.forEach((err) => console.log(`  - ${err}`))
    }

    if (result.warnings && result.warnings.length > 0) {
      console.log("\nWarnings:")
      result.warnings.forEach((warn) => console.log(`  - ${warn}`))
    }

    // Query database to verify
    const { data: poolData, error: queryError } = await supabase
      .from("draft_pool")
      .select("pokemon_name, point_value, is_available, generation")
      .eq("sheet_name", SHEET_NAME)
      .order("point_value", { ascending: false })
      .order("pokemon_name", { ascending: true })
      .limit(20)

    if (queryError) {
      console.error("\n❌ Database query error:", queryError)
    } else {
      console.log(`\n✅ Found ${poolData?.length || 0} Pokemon in database`)
      console.log("\nSample Pokemon:")
      poolData?.slice(0, 10).forEach((p) => {
        console.log(`  - ${p.pokemon_name} (${p.point_value}pts) ${p.is_available ? "✅" : "❌"} Gen ${p.generation || "?"}`)
      })
    }

    // Count by point value
    const { data: counts } = await supabase
      .from("draft_pool")
      .select("point_value, is_available")
      .eq("sheet_name", SHEET_NAME)

    if (counts) {
      const byPoints = new Map<number, { total: number; available: number }>()
      for (const p of counts) {
        if (!byPoints.has(p.point_value)) {
          byPoints.set(p.point_value, { total: 0, available: 0 })
        }
        const stats = byPoints.get(p.point_value)!
        stats.total++
        if (p.is_available) {
          stats.available++
        }
      }

      console.log("\n📊 Breakdown by Point Value:")
      for (const [points, stats] of Array.from(byPoints.entries()).sort((a, b) => b[0] - a[0])) {
        console.log(`  ${points}pts: ${stats.available}/${stats.total} available`)
      }
    }

    console.log("\n" + "=".repeat(70))
    console.log("✅ Test Complete")
    console.log("=".repeat(70))
  } catch (error: any) {
    console.error("\n❌ Error:", error.message)
    process.exit(1)
  }
}

testDraftPoolParser()
