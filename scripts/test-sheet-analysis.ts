/**
 * Test script to run comprehensive Google Sheets analysis
 * Usage: npx tsx scripts/test-sheet-analysis.ts [spreadsheet_id]
 */

import * as dotenv from "dotenv"
import * as path from "path"
import * as fs from "fs"

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), ".env.local") })

// Use the spreadsheet ID from environment or command line, fallback to the one we've been working with
const SPREADSHEET_ID = process.argv[2] || process.env.GOOGLE_SHEET_ID || "1wwH5XUHxQnivm90wGtNLQI_g7P3nPi5ZRcbZ3JU3-YQ"

async function runAnalysis() {
  console.log(`\n🔍 Running comprehensive analysis for spreadsheet: ${SPREADSHEET_ID}\n`)

  try {
    // Call the analyze endpoint
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    const response = await fetch(`${baseUrl}/api/admin/google-sheets/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        spreadsheet_id: SPREADSHEET_ID,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Analysis failed: ${response.status} ${response.statusText}\n${errorText}`)
    }

    const result = await response.json()

    // Save results to file
    const outputPath = path.join(process.cwd(), "sheet-analysis-results.json")
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2))

    console.log("✅ Analysis complete!")
    console.log(`\n📊 Summary:`)
    console.log(`   Spreadsheet: ${result.spreadsheet_title}`)
    console.log(`   Total Sheets: ${result.total_sheets}`)
    
    if (result.summary) {
      console.log(`\n   Sheet Types:`)
      Object.entries(result.summary.sheet_types || {}).forEach(([type, count]) => {
        console.log(`     - ${type}: ${count}`)
      })
      
      console.log(`\n   Parsing Strategies:`)
      Object.entries(result.summary.parsing_strategies || {}).forEach(([strategy, count]) => {
        console.log(`     - ${strategy}: ${count}`)
      })
      
      console.log(`\n   AI Required: ${result.summary.ai_required_count} sheet(s)`)
      console.log(`   No Headers: ${result.summary.no_headers_count} sheet(s)`)
    }

    console.log(`\n💾 Full results saved to: ${outputPath}`)
    console.log(`\n📋 Sheet Analysis:`)
    
    result.analysis?.forEach((sheet: any, index: number) => {
      console.log(`\n${index + 1}. ${sheet.sheet_name}`)
      console.log(`   Type: ${sheet.structure?.type || "unknown"}`)
      console.log(`   Complexity: ${sheet.structure?.complexity || "unknown"}`)
      console.log(`   Rows: ${sheet.row_count}, Columns: ${sheet.column_count}`)
      console.log(`   Headers: ${sheet.has_headers ? sheet.headers?.length || 0 : "None"}`)
      console.log(`   Parser: ${sheet.parsing_suggestions?.parser_type || "unknown"}`)
      console.log(`   AI Required: ${sheet.parsing_suggestions?.use_ai ? "Yes" : "No"}`)
      
      if (sheet.parsing_suggestions?.special_handling?.length > 0) {
        console.log(`   Special Handling: ${sheet.parsing_suggestions.special_handling.join(", ")}`)
      }
      
      if (sheet.error) {
        console.log(`   ⚠️  Error: ${sheet.error}`)
      }
    })

    return result
  } catch (error) {
    console.error("\n❌ Analysis failed:", error)
    if (error instanceof Error) {
      console.error("   Message:", error.message)
      console.error("   Stack:", error.stack)
    }
    process.exit(1)
  }
}

// Run analysis
runAnalysis()
  .then(() => {
    console.log("\n✅ Test complete!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Test failed:", error)
    process.exit(1)
  })
