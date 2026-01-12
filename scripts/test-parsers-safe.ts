/**
 * Safe parser test script with timeouts and error handling
 * Tests parsers one at a time with explicit timeouts to prevent infinite loops
 * Usage: npx tsx scripts/test-parsers-safe.ts [spreadsheet_id] [sheet_name] [parser_type]
 */

import * as dotenv from "dotenv"
import * as path from "path"
import * as fs from "fs"
import { GoogleSpreadsheet } from "google-spreadsheet"
import { JWT } from "google-auth-library"
import { getGoogleServiceAccountCredentials } from "../lib/utils/google-sheets"
import { createServiceRoleClient } from "../lib/supabase/service"
import { createParser, SheetParsingConfig } from "../lib/google-sheets-parsers"

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), ".env.local") })

const SPREADSHEET_ID = process.argv[2] || process.env.GOOGLE_SHEET_ID || "1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0"
const SHEET_NAME = process.argv[3] // Optional: test specific sheet
const PARSER_TYPE = process.argv[4] as SheetParsingConfig["parser_type"] | undefined // Optional: force parser type

interface TestResult {
  parserType: string
  sheetName: string
  success: boolean
  recordsProcessed: number
  errors: string[]
  warnings?: string[]
  duration: number
  timedOut: boolean
}

// Timeout wrapper
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${errorMessage} (timeout after ${timeoutMs}ms)`)), timeoutMs)
    ),
  ])
}

async function testParser(
  sheetName: string,
  parserType: SheetParsingConfig["parser_type"],
  config: Partial<SheetParsingConfig>
): Promise<TestResult> {
  const startTime = Date.now()
  console.log(`\n🧪 Testing ${parserType} parser on sheet "${sheetName}"`)
  console.log(`   Timeout: 60 seconds`)

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

    console.log(`   📊 Loading spreadsheet...`)
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth)
    await withTimeout(doc.loadInfo(), 10000, "Failed to load spreadsheet info")

    const sheet = doc.sheetsByTitle[sheetName] || doc.sheetsByIndex.find((s) => s.title === sheetName)
    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found`)
    }

    console.log(`   ✅ Sheet found: ${sheet.rowCount} rows, ${sheet.columnCount} columns`)

    const supabase = createServiceRoleClient()
    const fullConfig: SheetParsingConfig = {
      parser_type: parserType,
      table_name: config.table_name || "test_table",
      use_ai: config.use_ai !== undefined ? config.use_ai : parserType === "master_data" || parserType === "team_page" || parserType === "rules",
      column_mapping: config.column_mapping || {},
      special_handling: config.special_handling || [],
      has_headers: config.has_headers !== false,
      range: config.range,
    }

    console.log(`   🔧 Creating parser...`)
    const parser = createParser(parserType, sheet, supabase, {
      ...fullConfig,
      spreadsheetId: SPREADSHEET_ID, // Pass spreadsheet ID to parser
    })

    console.log(`   ⚙️  Running parser (max 90 seconds)...`)
    const result = await withTimeout(
      parser.parse(),
      90000, // 90 second timeout (allows for 60s OpenAI timeout + overhead)
      `Parser execution timed out`
    )

    const duration = Date.now() - startTime

    console.log(`   ✅ Parser completed in ${duration}ms`)
    console.log(`   📊 Records processed: ${result.recordsProcessed}`)
    if (result.errors.length > 0) {
      console.log(`   ⚠️  Errors: ${result.errors.length}`)
      result.errors.slice(0, 3).forEach((err) => console.log(`      - ${err}`))
    }

    return {
      parserType,
      sheetName,
      success: result.success,
      recordsProcessed: result.recordsProcessed,
      errors: result.errors,
      warnings: result.warnings,
      duration,
      timedOut: false,
    }
  } catch (error: any) {
    const duration = Date.now() - startTime
    const isTimeout = error.message?.includes("timeout")
    
    console.log(`   ${isTimeout ? "⏱️  TIMEOUT" : "❌ ERROR"} after ${duration}ms`)
    console.log(`   ${error.message}`)

    return {
      parserType,
      sheetName,
      success: false,
      recordsProcessed: 0,
      errors: [error.message || "Unknown error"],
      duration,
      timedOut: isTimeout,
    }
  }
}

async function runTests() {
  console.log("=".repeat(70))
  console.log("🔍 Safe Parser Testing (with timeouts)")
  console.log("=".repeat(70))
  console.log(`\n📊 Spreadsheet ID: ${SPREADSHEET_ID}`)

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

    console.log(`\n📋 Loading spreadsheet...`)
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth)
    await doc.loadInfo()

    console.log(`✅ Spreadsheet loaded: "${doc.title}"`)
    console.log(`   Total sheets: ${doc.sheetCount}\n`)

    // Load analysis results if available
    let analysisResults: any[] = []
    const analysisPath = path.join(process.cwd(), "sheet-analysis-results.json")
    if (fs.existsSync(analysisPath)) {
      try {
        const analysisData = JSON.parse(fs.readFileSync(analysisPath, "utf-8"))
        analysisResults = analysisData.analysis || []
        console.log(`✅ Loaded analysis results (${analysisResults.length} sheets)\n`)
      } catch (e) {
        console.log(`⚠️  Could not load analysis results, will use defaults\n`)
      }
    }

    // Determine which sheets to test
    let sheetsToTest: Array<{ name: string; parserType: SheetParsingConfig["parser_type"]; config: Partial<SheetParsingConfig> }> = []

    if (SHEET_NAME && PARSER_TYPE) {
      // Test specific sheet with specific parser
      const analysis = analysisResults.find((a: any) => a.sheet_name === SHEET_NAME)
      sheetsToTest.push({
        name: SHEET_NAME,
        parserType: PARSER_TYPE,
        config: {
          use_ai: analysis?.parsing_suggestions?.use_ai || false,
          special_handling: analysis?.parsing_suggestions?.special_handling || [],
          has_headers: analysis?.has_headers || false,
        },
      })
    } else if (SHEET_NAME) {
      // Test specific sheet with recommended parser
      const analysis = analysisResults.find((a: any) => a.sheet_name === SHEET_NAME)
      if (analysis) {
        sheetsToTest.push({
          name: SHEET_NAME,
          parserType: analysis.parsing_suggestions?.parser_type || "generic",
          config: {
            use_ai: analysis.parsing_suggestions?.use_ai || false,
            special_handling: analysis.parsing_suggestions?.special_handling || [],
            has_headers: analysis.has_headers || false,
          },
        })
      } else {
        throw new Error(`Sheet "${SHEET_NAME}" not found in analysis results`)
      }
    } else {
      // Test first 5 sheets from analysis (or all if less than 5)
      const sheets = analysisResults.length > 0 
        ? analysisResults.slice(0, 5)
        : doc.sheetsByIndex.slice(0, 5).map((s) => ({
            sheet_name: s.title,
            parsing_suggestions: { parser_type: "generic", use_ai: false, special_handling: [] },
            has_headers: false,
          }))

      sheetsToTest = sheets.map((analysis: any) => ({
        name: analysis.sheet_name,
        parserType: analysis.parsing_suggestions?.parser_type || "generic",
        config: {
          use_ai: analysis.parsing_suggestions?.use_ai || false,
          special_handling: analysis.parsing_suggestions?.special_handling || [],
          has_headers: analysis.has_headers || false,
        },
      }))

      console.log(`📋 Testing first ${sheetsToTest.length} sheets:\n`)
      sheetsToTest.forEach((s, i) => {
        console.log(`   ${i + 1}. "${s.name}" → ${s.parserType} parser`)
      })
      console.log()
    }

    // Run tests
    const results: TestResult[] = []
    for (let i = 0; i < sheetsToTest.length; i++) {
      const { name, parserType, config } = sheetsToTest[i]
      console.log(`\n[${i + 1}/${sheetsToTest.length}] Testing "${name}"`)
      const result = await testParser(name, parserType, config)
      results.push(result)

      // Small delay between tests
      if (i < sheetsToTest.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    // Summary
    console.log("\n" + "=".repeat(70))
    console.log("📊 Test Summary")
    console.log("=".repeat(70))

    const successful = results.filter((r) => r.success)
    const failed = results.filter((r) => !r.success)
    const timedOut = results.filter((r) => r.timedOut)

    console.log(`\n✅ Successful: ${successful.length}/${results.length}`)
    console.log(`❌ Failed: ${failed.length}/${results.length}`)
    console.log(`⏱️  Timed Out: ${timedOut.length}/${results.length}`)

    if (successful.length > 0) {
      console.log(`\n✅ Successful Tests:`)
      successful.forEach((r) => {
        console.log(`   - ${r.sheetName} (${r.parserType}): ${r.recordsProcessed} records in ${r.duration}ms`)
      })
    }

    if (failed.length > 0) {
      console.log(`\n❌ Failed Tests:`)
      failed.forEach((r) => {
        console.log(`   - ${r.sheetName} (${r.parserType}): ${r.errors[0] || "Unknown error"}`)
        if (r.timedOut) {
          console.log(`     ⏱️  TIMED OUT - This parser may have an infinite loop!`)
        }
      })
    }

    // Save results
    const outputPath = path.join(process.cwd(), "parser-test-results.json")
    fs.writeFileSync(
      outputPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          spreadsheet_id: SPREADSHEET_ID,
          results,
          summary: {
            total: results.length,
            successful: successful.length,
            failed: failed.length,
            timedOut: timedOut.length,
          },
        },
        null,
        2
      )
    )

    console.log(`\n💾 Results saved to: ${outputPath}`)

    // Exit with appropriate code
    process.exit(timedOut.length > 0 ? 1 : failed.length > 0 ? 1 : 0)
  } catch (error: any) {
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
