/**
 * Comprehensive Google Sheets analysis script (direct, no API required)
 * Analyzes all sheets, their structure, and suggests parsing strategies
 * Usage: npx tsx scripts/analyze-sheet-comprehensive.ts [spreadsheet_id]
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

const SPREADSHEET_ID = process.argv[2] || process.env.GOOGLE_SHEET_ID || "1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0"

interface SheetAnalysis {
  sheet_name: string
  sheet_id: number
  row_count: number
  column_count: number
  has_headers: boolean
  headers?: string[]
  structure: {
    type: string
    complexity: string
    description?: string
  }
  parsing_suggestions: {
    parser_type: string
    use_ai: boolean
    special_handling: string[]
    column_mapping?: Record<string, string>
    has_headers: boolean
  }
  sample_data?: any[]
  error?: string
}

interface AnalysisResult {
  spreadsheet_id: string
  spreadsheet_title: string
  total_sheets: number
  analysis: SheetAnalysis[]
  summary: {
    sheet_types: Record<string, number>
    parsing_strategies: Record<string, number>
    ai_required_count: number
    no_headers_count: number
  }
}

function detectSheetType(sheetName: string, headers: string[], rowCount: number, columnCount: number): { type: string; complexity: string; description?: string } {
  const normalizedName = sheetName.toLowerCase().trim()

  // Team pages
  if (normalizedName.startsWith("team") && /team\s*\d+/.test(normalizedName)) {
    return {
      type: "team_page",
      complexity: "high",
      description: "Individual team page with roster, stats, and team-specific data",
    }
  }

  // Master data
  if (normalizedName.includes("master") || normalizedName.includes("data") && normalizedName.includes("master")) {
    return {
      type: "master_data",
      complexity: "very_high",
      description: "Master data sheet with multiple tables and complex structure",
    }
  }

  // Draft board
  if (normalizedName.includes("draft") && (normalizedName.includes("board") || normalizedName.includes("pick"))) {
    return {
      type: "draft",
      complexity: "high",
      description: "Draft board with pick order and team selections",
    }
  }

  // Rules
  if (normalizedName.includes("rule") || normalizedName.includes("regulation") || normalizedName.includes("guideline")) {
    return {
      type: "rules",
      complexity: "variable",
      description: "Rules and regulations document",
    }
  }

  // Matches
  if (normalizedName.includes("match") || normalizedName.includes("game") || normalizedName.includes("battle")) {
    return {
      type: "matches",
      complexity: "medium",
      description: "Match results and game data",
    }
  }

  // Teams list
  if (normalizedName.includes("team") && !normalizedName.includes("page") && columnCount < 20) {
    return {
      type: "teams",
      complexity: "low",
      description: "Teams list or roster",
    }
  }

  // Standings
  if (normalizedName.includes("standing") || normalizedName.includes("rank")) {
    return {
      type: "standings",
      complexity: "low",
      description: "League standings and rankings",
    }
  }

  // Stats
  if (normalizedName.includes("stat") || normalizedName.includes("mvp") || normalizedName.includes("weekly")) {
    return {
      type: "stats",
      complexity: "medium",
      description: "Statistics and performance data",
    }
  }

  // Pokedex
  if (normalizedName.includes("pokédex") || normalizedName.includes("pokedex") || normalizedName.includes("pokemon")) {
    return {
      type: "pokedex",
      complexity: "medium",
      description: "Pokémon reference data",
    }
  }

  // Trade block
  if (normalizedName.includes("trade") || normalizedName.includes("block")) {
    return {
      type: "trade",
      complexity: "low",
      description: "Trade block or trade listings",
    }
  }

  // Generic
  return {
    type: "generic",
    complexity: "unknown",
    description: "Generic sheet structure",
  }
}

function suggestParser(config: { type: string; hasHeaders: boolean; complexity: string; headers?: string[] }): {
  parser_type: string
  use_ai: boolean
  special_handling: string[]
  has_headers: boolean
} {
  const { type, hasHeaders, complexity, headers = [] } = config

  const suggestions: Record<string, any> = {
    team_page: {
      parser_type: "team_page",
      use_ai: true,
      special_handling: ["section_detection", "image_extraction", "roster_parsing"],
      has_headers: hasHeaders,
    },
    master_data: {
      parser_type: "master_data",
      use_ai: true,
      special_handling: ["multi_table_detection", "table_extraction", "data_inference"],
      has_headers: hasHeaders,
    },
    draft: {
      parser_type: "draft",
      use_ai: false,
      special_handling: ["grid_parsing", "snake_draft_logic"],
      has_headers: hasHeaders,
    },
    rules: {
      parser_type: "rules",
      use_ai: true,
      special_handling: ["text_extraction", "section_detection"],
      has_headers: hasHeaders,
    },
    matches: {
      parser_type: "matches",
      use_ai: false,
      special_handling: ["date_parsing", "score_extraction"],
      has_headers: hasHeaders,
    },
    teams: {
      parser_type: "teams",
      use_ai: false,
      special_handling: [],
      has_headers: hasHeaders,
    },
    standings: {
      parser_type: "teams", // Can reuse teams parser
      use_ai: false,
      special_handling: ["ranking_calculation"],
      has_headers: hasHeaders,
    },
    stats: {
      parser_type: "generic",
      use_ai: false,
      special_handling: ["numeric_parsing"],
      has_headers: hasHeaders,
    },
    pokedex: {
      parser_type: "generic",
      use_ai: false,
      special_handling: [],
      has_headers: hasHeaders,
    },
    trade: {
      parser_type: "generic",
      use_ai: false,
      special_handling: [],
      has_headers: hasHeaders,
    },
    generic: {
      parser_type: "generic",
      use_ai: !hasHeaders || complexity === "very_high",
      special_handling: hasHeaders ? [] : ["header_detection"],
      has_headers: hasHeaders,
    },
  }

  return suggestions[type] || suggestions.generic
}

async function analyzeSheet(sheet: any, sheets: any): Promise<SheetAnalysis> {
  const analysis: SheetAnalysis = {
    sheet_name: sheet.title,
    sheet_id: sheet.sheetId || 0,
    row_count: sheet.rowCount || 0,
    column_count: sheet.columnCount || 0,
    has_headers: false,
    structure: {
      type: "unknown",
      complexity: "unknown",
    },
    parsing_suggestions: {
      parser_type: "generic",
      use_ai: false,
      special_handling: [],
      has_headers: false,
    },
  }

  try {
    // Try to load headers
    try {
      await sheet.loadHeaderRow()
      if (sheet.headerValues && sheet.headerValues.length > 0) {
        analysis.has_headers = true
        analysis.headers = sheet.headerValues.filter((h: string) => h && h.trim() !== "")
      }
    } catch (headerError: any) {
      // No headers - this is okay for some sheet types
      analysis.has_headers = false
    }

    // Detect sheet type
    analysis.structure = detectSheetType(
      sheet.title,
      analysis.headers || [],
      analysis.row_count,
      analysis.column_count
    )

    // Get parsing suggestions
    analysis.parsing_suggestions = suggestParser({
      type: analysis.structure.type,
      hasHeaders: analysis.has_headers,
      complexity: analysis.structure.complexity,
      headers: analysis.headers,
    })

    // Get sample data (first 3 rows)
    try {
      const rows = await sheet.getRows({ limit: 3 })
      analysis.sample_data = rows.map((row: any) => {
        if (analysis.has_headers && sheet.headerValues) {
          const data: any = {}
          sheet.headerValues.forEach((header: string, index: number) => {
            if (header && header.trim()) {
              data[header] = row._rawData[index] || null
            }
          })
          return data
        } else {
          return row._rawData || []
        }
      })
    } catch (rowError: any) {
      // Can't read rows - might be empty or protected
      analysis.sample_data = []
    }
  } catch (error: any) {
    analysis.error = error.message
  }

  return analysis
}

async function runAnalysis(): Promise<AnalysisResult> {
  console.log("=".repeat(70))
  console.log("🔍 Comprehensive Google Sheets Analysis")
  console.log("=".repeat(70))
  console.log(`\n📊 Spreadsheet ID: ${SPREADSHEET_ID}\n`)

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
  await doc.loadInfo()

  console.log(`✅ Spreadsheet loaded: "${doc.title}"`)
  console.log(`   Total sheets: ${doc.sheetCount}\n`)

  const sheets = google.sheets({ version: "v4", auth: serviceAccountAuth })

  // Analyze each sheet
  console.log("📋 Analyzing sheets...\n")
  const analyses: SheetAnalysis[] = []

  for (let i = 0; i < doc.sheetCount; i++) {
    const sheet = doc.sheetsByIndex[i]
    console.log(`   Analyzing ${i + 1}/${doc.sheetCount}: "${sheet.title}"`)
    const analysis = await analyzeSheet(sheet, sheets)
    analyses.push(analysis)
  }

  // Calculate summary
  const summary = {
    sheet_types: {} as Record<string, number>,
    parsing_strategies: {} as Record<string, number>,
    ai_required_count: 0,
    no_headers_count: 0,
  }

  analyses.forEach((analysis) => {
    // Count sheet types
    summary.sheet_types[analysis.structure.type] = (summary.sheet_types[analysis.structure.type] || 0) + 1

    // Count parsing strategies
    const parserType = analysis.parsing_suggestions.parser_type
    summary.parsing_strategies[parserType] = (summary.parsing_strategies[parserType] || 0) + 1

    // Count AI required
    if (analysis.parsing_suggestions.use_ai) {
      summary.ai_required_count++
    }

    // Count no headers
    if (!analysis.has_headers) {
      summary.no_headers_count++
    }
  })

  const result: AnalysisResult = {
    spreadsheet_id: SPREADSHEET_ID,
    spreadsheet_title: doc.title,
    total_sheets: doc.sheetCount,
    analysis: analyses,
    summary,
  }

  // Save results
  const outputPath = path.join(process.cwd(), "sheet-analysis-results.json")
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2))

  // Display summary
  console.log("\n" + "=".repeat(70))
  console.log("📊 Analysis Summary")
  console.log("=".repeat(70))
  console.log(`\nSpreadsheet: "${result.spreadsheet_title}"`)
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

  // Display detailed analysis
  console.log("\n" + "=".repeat(70))
  console.log("📋 Detailed Sheet Analysis")
  console.log("=".repeat(70))

  analyses.forEach((analysis, index) => {
    console.log(`\n${index + 1}. ${analysis.sheet_name}`)
    console.log(`   Type: ${analysis.structure.type}`)
    console.log(`   Complexity: ${analysis.structure.complexity}`)
    if (analysis.structure.description) {
      console.log(`   Description: ${analysis.structure.description}`)
    }
    console.log(`   Rows: ${analysis.row_count}, Columns: ${analysis.column_count}`)
    console.log(`   Headers: ${analysis.has_headers ? (analysis.headers?.length || 0) : "None"}`)
    if (analysis.headers && analysis.headers.length > 0) {
      console.log(`   Header Preview: ${analysis.headers.slice(0, 5).join(", ")}${analysis.headers.length > 5 ? "..." : ""}`)
    }
    console.log(`   Parser: ${analysis.parsing_suggestions.parser_type}`)
    console.log(`   AI Required: ${analysis.parsing_suggestions.use_ai ? "Yes" : "No"}`)
    if (analysis.parsing_suggestions.special_handling.length > 0) {
      console.log(`   Special Handling: ${analysis.parsing_suggestions.special_handling.join(", ")}`)
    }
    if (analysis.error) {
      console.log(`   ⚠️  Error: ${analysis.error}`)
    }
  })

  return result
}

runAnalysis()
  .then(() => {
    console.log("\n✅ Analysis complete!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Analysis failed:", error)
    if (error instanceof Error) {
      console.error("   Message:", error.message)
      console.error("   Stack:", error.stack)
    }
    process.exit(1)
  })
