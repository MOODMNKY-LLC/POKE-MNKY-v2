/**
 * Test script to validate Google Sheets parsers
 * Tests each parser type with actual sheet data
 * Usage: npx tsx scripts/test-parsers.ts [spreadsheet_id] [sheet_name]
 */

import * as dotenv from "dotenv"
import * as path from "path"
import { GoogleSpreadsheet } from "google-spreadsheet"
import { JWT } from "google-auth-library"
import { getGoogleServiceAccountCredentials } from "../lib/utils/google-sheets"
import { createServiceRoleClient } from "../lib/supabase/service"
import { createParser, SheetParsingConfig } from "../lib/google-sheets-parsers"

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), ".env.local") })

const SPREADSHEET_ID = process.argv[2] || process.env.GOOGLE_SHEET_ID || "1wwH5XUHxQnivm90wGtNLQI_g7P3nPi5ZRcbZ3JU3-YQ"
const SHEET_NAME = process.argv[3] // Optional: test specific sheet

interface TestResult {
  parserType: string
  sheetName: string
  success: boolean
  recordsProcessed: number
  errors: string[]
  warnings?: string[]
  duration: number
}

async function testParser(
  sheetName: string,
  parserType: string,
  config: SheetParsingConfig
): Promise<TestResult> {
  const startTime = Date.now()
  console.log(`\n🧪 Testing ${parserType} parser on sheet "${sheetName}"`)

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

    const sheet = doc.sheetsByTitle[sheetName] || doc.sheetsByIndex.find((s) => s.title === sheetName)
    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found`)
    }

    const supabase = createServiceRoleClient()
    const parser = createParser(parserType, sheet, supabase, config)

    const result = await parser.parse()

    const duration = Date.now() - startTime

    return {
      parserType,
      sheetName,
      success: result.success,
      recordsProcessed: result.recordsProcessed,
      errors: result.errors,
      warnings: result.warnings,
      duration,
    }
  } catch (error) {
    const duration = Date.now() - startTime
    return {
      parserType,
      sheetName,
      success: false,
      recordsProcessed: 0,
      errors: [error instanceof Error ? error.message : "Unknown error"],
      duration,
    }
  }
}

async function runTests() {
  console.log(`\n🔍 Testing parsers for spreadsheet: ${SPREADSHEET_ID}\n`)

  try {
    // First, run comprehensive analysis to get sheet types
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    const analysisResponse = await fetch(`${baseUrl}/api/admin/google-sheets/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        spreadsheet_id: SPREADSHEET_ID,
      }),
    })

    if (!analysisResponse.ok) {
      throw new Error(`Analysis failed: ${analysisResponse.status}`)
    }

    const analysis = await analysisResponse.json()

    console.log(`📊 Analysis complete: ${analysis.total_sheets} sheets found\n`)

    // Filter sheets to test
    const sheetsToTest = SHEET_NAME
      ? analysis.analysis.filter((s: any) => s.sheet_name === SHEET_NAME)
      : analysis.analysis

    if (sheetsToTest.length === 0) {
      console.log("❌ No sheets found to test")
      return
    }

    const testResults: TestResult[] = []

    // Test each sheet with its recommended parser
    for (const sheetAnalysis of sheetsToTest) {
      const sheetName = sheetAnalysis.sheet_name
      const parserType = sheetAnalysis.parsing_suggestions?.parser_type || "generic"
      const useAI = sheetAnalysis.parsing_suggestions?.use_ai || false

      const config: SheetParsingConfig = {
        parser_type: parserType,
        use_ai: useAI,
        table_name: sheetAnalysis.parsing_suggestions?.table_mapping || "unknown",
        column_mapping: sheetAnalysis.parsing_suggestions?.column_mapping || {},
        special_handling: sheetAnalysis.parsing_suggestions?.special_handling || [],
        has_headers: sheetAnalysis.has_headers !== false,
      }

      const result = await testParser(sheetName, parserType, config)
      testResults.push(result)

      // Print result
      console.log(`\n${result.success ? "✅" : "❌"} ${result.parserType} - ${result.sheetName}`)
      console.log(`   Records: ${result.recordsProcessed}`)
      console.log(`   Duration: ${result.duration}ms`)
      if (result.errors.length > 0) {
        console.log(`   Errors: ${result.errors.length}`)
        result.errors.slice(0, 3).forEach((err) => console.log(`     - ${err}`))
      }
      if (result.warnings && result.warnings.length > 0) {
        console.log(`   Warnings: ${result.warnings.length}`)
      }
    }

    // Summary
    console.log(`\n${"=".repeat(60)}`)
    console.log("📊 Test Summary")
    console.log("=".repeat(60))
    console.log(`Total Tests: ${testResults.length}`)
    console.log(`Successful: ${testResults.filter((r) => r.success).length}`)
    console.log(`Failed: ${testResults.filter((r) => !r.success).length}`)
    console.log(`Total Records: ${testResults.reduce((sum, r) => sum + r.recordsProcessed, 0)}`)
    console.log(`Total Duration: ${testResults.reduce((sum, r) => sum + r.duration, 0)}ms`)

    // Save results
    const fs = require("fs")
    const outputPath = path.join(process.cwd(), "parser-test-results.json")
    fs.writeFileSync(outputPath, JSON.stringify(testResults, null, 2))
    console.log(`\n💾 Results saved to: ${outputPath}`)

    return testResults
  } catch (error) {
    console.error("\n❌ Test suite failed:", error)
    if (error instanceof Error) {
      console.error("   Message:", error.message)
      console.error("   Stack:", error.stack)
    }
    process.exit(1)
  }
}

// Run tests
runTests()
  .then(() => {
    console.log("\n✅ Test suite complete!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Test suite failed:", error)
    process.exit(1)
  })
