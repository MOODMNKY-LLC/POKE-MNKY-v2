/**
 * Direct comprehensive analysis script
 * Analyzes Google Sheets without going through API endpoints
 * Usage: npx tsx scripts/analyze-sheet-direct.ts [spreadsheet_id]
 */

import * as dotenv from "dotenv"
import * as path from "path"
import * as fs from "fs"
import { GoogleSpreadsheet } from "google-spreadsheet"
import { JWT } from "google-auth-library"
import { google } from "googleapis"
import { getGoogleServiceAccountCredentials } from "../lib/utils/google-sheets"

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), ".env.local") })

const SPREADSHEET_ID = process.argv[2] || process.env.GOOGLE_SHEET_ID || "1wwH5XUHxQnivm90wGtNLQI_g7P3nPi5ZRcbZ3JU3-YQ"

interface SheetAnalysis {
  sheet_name: string
  row_count: number
  column_count: number
  has_headers: boolean
  headers?: string[]
  sample_rows: number
  structure_type: string
  complexity: string
  patterns: string[]
  parsing_suggestions: {
    parser_type: string
    use_ai: boolean
    table_mapping: string
    special_handling: string[]
  }
}

async function analyzeSheet() {
  console.log(`\n🔍 Running comprehensive analysis for spreadsheet: ${SPREADSHEET_ID}\n`)

  try {
    const credentials = getGoogleServiceAccountCredentials()
    if (!credentials) {
      throw new Error("Google Sheets credentials not configured")
    }

    console.log("✅ Credentials loaded\n")

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

    const sheets = google.sheets({ version: "v4", auth: serviceAccountAuth })
    const analysisResults: SheetAnalysis[] = []

    // Analyze each sheet
    for (let i = 0; i < doc.sheetCount; i++) {
      const sheet = doc.sheetsByIndex[i]
      console.log(`\n[${i + 1}/${doc.sheetCount}] Analyzing: "${sheet.title}"`)

      try {
        const analysis: SheetAnalysis = {
          sheet_name: sheet.title,
          row_count: sheet.rowCount,
          column_count: sheet.columnCount,
          has_headers: false,
          headers: [],
          sample_rows: 0,
          structure_type: "unknown",
          complexity: "simple",
          patterns: [],
          parsing_suggestions: {
            parser_type: "generic",
            use_ai: false,
            table_mapping: "unknown",
            special_handling: [],
          },
        }

        // Try to load headers
        try {
          await sheet.loadHeaderRow()
          analysis.has_headers = true
          analysis.headers = sheet.headerValues || []
          console.log(`   ✅ Headers found: ${analysis.headers.length}`)
        } catch (headerError: any) {
          analysis.has_headers = false
          console.log(`   ⚠️  No headers detected`)
        }

        // Get sample rows
        try {
          const rows = await sheet.getRows({ limit: 5 })
          analysis.sample_rows = rows.length
          console.log(`   ✅ Sample rows: ${analysis.sample_rows}`)
        } catch (rowError) {
          console.log(`   ⚠️  Could not read rows`)
        }

        // Detect structure type
        const normalizedName = sheet.title.toLowerCase()
        if (normalizedName.includes("standings") || normalizedName.includes("ranking")) {
          analysis.structure_type = "standings"
          analysis.parsing_suggestions.parser_type = "teams"
          analysis.parsing_suggestions.table_mapping = "teams"
          analysis.parsing_suggestions.use_ai = !analysis.has_headers
        } else if (normalizedName.includes("draft") || normalizedName.includes("board")) {
          analysis.structure_type = "draft"
          analysis.parsing_suggestions.parser_type = "draft"
          analysis.parsing_suggestions.table_mapping = "team_rosters"
        } else if (normalizedName.includes("rule")) {
          analysis.structure_type = "rules"
          analysis.parsing_suggestions.parser_type = "rules"
          analysis.parsing_suggestions.use_ai = true
          analysis.complexity = "variable"
        } else if (normalizedName.includes("master") || normalizedName.includes("data")) {
          analysis.structure_type = "master_data"
          analysis.parsing_suggestions.parser_type = "master_data"
          analysis.parsing_suggestions.use_ai = true
          analysis.complexity = "complex"
        } else if (normalizedName.includes("team") && !normalizedName.includes("team")) {
          analysis.structure_type = "team_page"
          analysis.parsing_suggestions.parser_type = "team_page"
          analysis.parsing_suggestions.use_ai = true
          analysis.complexity = "variable"
        } else if (normalizedName.includes("match") || normalizedName.includes("battle")) {
          analysis.structure_type = "matches"
          analysis.parsing_suggestions.parser_type = "matches"
          analysis.parsing_suggestions.table_mapping = "matches"
        }

        // Check for special patterns
        if (!analysis.has_headers) {
          analysis.patterns.push("no_headers")
          analysis.parsing_suggestions.special_handling.push("no_headers")
        }

        if (analysis.row_count > 100) {
          analysis.complexity = "medium"
        }
        if (analysis.row_count > 500) {
          analysis.complexity = "high"
        }

        analysisResults.push(analysis)
        console.log(`   ✅ Analysis complete`)

      } catch (error: any) {
        console.error(`   ❌ Error analyzing sheet: ${error.message}`)
        analysisResults.push({
          sheet_name: sheet.title,
          row_count: 0,
          column_count: 0,
          has_headers: false,
          sample_rows: 0,
          structure_type: "error",
          complexity: "unknown",
          patterns: ["error"],
          parsing_suggestions: {
            parser_type: "generic",
            use_ai: false,
            table_mapping: "unknown",
            special_handling: ["error"],
          },
        })
      }
    }

    // Generate summary
    const summary = {
      spreadsheet_title: doc.title,
      total_sheets: doc.sheetCount,
      sheet_types: {} as Record<string, number>,
      parsing_strategies: {} as Record<string, number>,
      ai_required_count: 0,
      no_headers_count: 0,
    }

    analysisResults.forEach((analysis) => {
      summary.sheet_types[analysis.structure_type] = (summary.sheet_types[analysis.structure_type] || 0) + 1
      summary.parsing_strategies[analysis.parsing_suggestions.parser_type] =
        (summary.parsing_strategies[analysis.parsing_suggestions.parser_type] || 0) + 1
      if (analysis.parsing_suggestions.use_ai) summary.ai_required_count++
      if (!analysis.has_headers) summary.no_headers_count++
    })

    const result = {
      spreadsheet_title: doc.title,
      spreadsheet_id: SPREADSHEET_ID,
      total_sheets: doc.sheetCount,
      summary,
      analysis: analysisResults,
    }

    // Save results
    const outputPath = path.join(process.cwd(), "sheet-analysis-results.json")
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2))

    // Display summary
    console.log(`\n${"=".repeat(60)}`)
    console.log("📊 Analysis Summary")
    console.log("=".repeat(60))
    console.log(`Spreadsheet: ${result.spreadsheet_title}`)
    console.log(`Total Sheets: ${result.total_sheets}`)
    console.log(`\nSheet Types:`)
    Object.entries(summary.sheet_types).forEach(([type, count]) => {
      console.log(`   - ${type}: ${count}`)
    })
    console.log(`\nParsing Strategies:`)
    Object.entries(summary.parsing_strategies).forEach(([strategy, count]) => {
      console.log(`   - ${strategy}: ${count}`)
    })
    console.log(`\nAI Required: ${summary.ai_required_count} sheet(s)`)
    console.log(`No Headers: ${summary.no_headers_count} sheet(s)`)
    console.log(`\n💾 Full results saved to: ${outputPath}`)

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
analyzeSheet()
  .then(() => {
    console.log("\n✅ Analysis complete!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Analysis failed:", error)
    process.exit(1)
  })
