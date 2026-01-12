import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getGoogleServiceAccountCredentials } from "@/lib/utils/google-sheets"
import { GoogleSpreadsheet } from "google-spreadsheet"
import { JWT } from "google-auth-library"
import { google } from "googleapis"

/**
 * Comprehensive analysis of Google Sheet structure
 * Analyzes all sheets, their data types, patterns, and suggests parsing configurations
 * POST /api/admin/google-sheets/analyze
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { spreadsheet_id } = body

    if (!spreadsheet_id) {
      return NextResponse.json({ error: "Spreadsheet ID is required" }, { status: 400 })
    }

    // Get credentials
    const credentials = getGoogleServiceAccountCredentials()
    if (!credentials) {
      return NextResponse.json(
        { error: "Google Sheets credentials not configured" },
        { status: 500 }
      )
    }

    // Authenticate with both Sheets and Drive scopes (Drive needed for includeGridData)
    const serviceAccountAuth = new JWT({
      email: credentials.email,
      key: credentials.privateKey,
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets.readonly",
        "https://www.googleapis.com/auth/drive.readonly",
      ],
    })

    const doc = new GoogleSpreadsheet(spreadsheet_id, serviceAccountAuth)
    await doc.loadInfo()

    const sheets = google.sheets({ version: "v4", auth: serviceAccountAuth })

    // Comprehensive analysis of each sheet
    const analysisResults = await Promise.all(
      doc.sheetsByIndex.map(async (sheet) => {
        const analysis: any = {
          sheet_name: sheet.title,
          sheet_index: sheet.index,
          row_count: sheet.rowCount,
          column_count: sheet.columnCount,
          structure: {},
          data_samples: [],
          parsing_suggestions: {},
        }

        try {
          // Load a sample of cells to analyze structure
          const sampleRange = `A1:${getColumnLetter(Math.min(sheet.columnCount, 50))}${Math.min(sheet.rowCount, 100)}`
          await sheet.loadCells(sampleRange)

          // Analyze headers
          const headers: string[] = []
          const headerRow = 0
          for (let col = 0; col < Math.min(sheet.columnCount, 50); col++) {
            const cell = sheet.getCell(headerRow, col)
            if (cell.value) {
              headers.push(String(cell.value))
            } else {
              break
            }
          }

          analysis.headers = headers
          analysis.has_headers = headers.length > 0

          // Sample data rows (skip header if exists)
          const dataStartRow = headers.length > 0 ? 1 : 0
          const sampleRows: any[] = []
          
          for (let row = dataStartRow; row < Math.min(dataStartRow + 20, sheet.rowCount); row++) {
            const rowData: any = {
              row_number: row + 1,
              cells: [],
              non_empty_count: 0,
            }

            for (let col = 0; col < headers.length || col < 20; col++) {
              const cell = sheet.getCell(row, col)
              const value = cell.value
              
              if (value !== null && value !== undefined && value !== "") {
                rowData.cells.push({
                  column: getColumnLetter(col + 1),
                  header: headers[col] || `Column ${col + 1}`,
                  value: String(value),
                  type: typeof value,
                  formatted_value: cell.formattedValue || String(value),
                })
                rowData.non_empty_count++
              } else {
                rowData.cells.push({
                  column: getColumnLetter(col + 1),
                  header: headers[col] || `Column ${col + 1}`,
                  value: null,
                  type: "empty",
                })
              }
            }

            // Only include rows with some data
            if (rowData.non_empty_count > 0) {
              sampleRows.push(rowData)
            }
          }

          analysis.data_samples = sampleRows.slice(0, 10) // Limit to 10 sample rows

          // Analyze structure patterns
          const structureAnalysis = analyzeSheetStructure(sheet.title, headers, sampleRows)
          analysis.structure = structureAnalysis

          // Detect sheet type and suggest parsing configuration
          const parsingConfig = suggestParsingConfiguration(
            sheet.title,
            headers,
            sampleRows,
            structureAnalysis
          )
          analysis.parsing_suggestions = parsingConfig

          // Check for special formatting, merged cells, etc.
          // Note: includeGridData requires Drive API scope, so we'll skip it if not available
          try {
            const sheetMetadata = await sheets.spreadsheets.get({
              spreadsheetId: spreadsheet_id,
              ranges: [`${sheet.title}!A1:Z100`],
              includeGridData: false, // Changed to false - doesn't require Drive scope
            })

            const sheetData = sheetMetadata.data.sheets?.[0]
            if (sheetData) {
              // Count merged cells (available without includeGridData)
              const mergedRanges = sheetData.merges || []
              analysis.merged_cells_count = mergedRanges.length

              // Note: Formatting detection requires includeGridData, so we'll skip it
              // This is acceptable as it's not critical for parsing
            }
          } catch (metadataError: any) {
            // Ignore metadata errors - not critical for analysis
            if (metadataError.message?.includes("insufficient_scope")) {
              console.log(`Skipping metadata for sheet "${sheet.title}" - Drive scope not available`)
            } else {
              console.log(`Could not fetch metadata for sheet "${sheet.title}": ${metadataError.message}`)
            }
          }

        } catch (error: any) {
          analysis.error = error.message
          console.error(`Error analyzing sheet "${sheet.title}":`, error)
        }

        return analysis
      })
    )

    return NextResponse.json({
      success: true,
      spreadsheet_title: doc.title,
      spreadsheet_id,
      total_sheets: doc.sheetsByIndex.length,
      analysis: analysisResults,
      summary: generateSummary(analysisResults),
    })
  } catch (error: any) {
    console.error("Error analyzing sheets:", error)
    return NextResponse.json(
      { error: error.message || "Failed to analyze sheets" },
      { status: 500 }
    )
  }
}

/**
 * Analyze sheet structure to identify patterns
 */
function analyzeSheetStructure(
  sheetName: string,
  headers: string[],
  sampleRows: any[]
): any {
  const analysis: any = {
    type: "unknown",
    patterns: [],
    data_types: {},
    complexity: "simple",
  }

  const normalizedName = sheetName.toLowerCase()
  const normalizedHeaders = headers.map((h) => h.toLowerCase())

  // Detect sheet type based on name and headers
  if (
    normalizedName.includes("standings") ||
    normalizedName.includes("ranking") ||
    normalizedName.includes("leaderboard")
  ) {
    analysis.type = "standings"
    analysis.complexity = "structured"
  } else if (
    normalizedName.includes("draft") ||
    normalizedName.includes("roster") ||
    normalizedHeaders.some((h) => h.includes("pick") || h.includes("round"))
  ) {
    analysis.type = "draft"
    analysis.complexity = "structured"
  } else if (
    normalizedName.includes("match") ||
    normalizedName.includes("battle") ||
    normalizedName.includes("week") ||
    normalizedHeaders.some((h) => h.includes("team1") || h.includes("team2"))
  ) {
    analysis.type = "matches"
    analysis.complexity = "structured"
  } else if (
    normalizedName.includes("master") ||
    normalizedName.includes("data") ||
    normalizedName.includes("reference")
  ) {
    analysis.type = "master_data"
    analysis.complexity = "complex"
  } else if (
    normalizedName.includes("rule") ||
    normalizedName.includes("regulation") ||
    normalizedName.includes("guideline")
  ) {
    analysis.type = "rules"
    analysis.complexity = "variable"
  } else if (
    normalizedName.includes("team") ||
    (sampleRows.length > 0 && sampleRows[0].cells.some((c: any) => 
      c.header?.toLowerCase().includes("team")
    ))
  ) {
    analysis.type = "team_page"
    analysis.complexity = "variable"
  } else {
    analysis.type = "unknown"
  }

  // Analyze data types in columns
  if (sampleRows.length > 0) {
    const columnTypes: Record<string, Set<string>> = {}
    
    sampleRows.forEach((row) => {
      row.cells.forEach((cell: any) => {
        if (cell.value !== null) {
          const header = cell.header || `Column ${cell.column}`
          if (!columnTypes[header]) {
            columnTypes[header] = new Set()
          }
          columnTypes[header].add(cell.type)
        }
      })
    })

    analysis.data_types = Object.fromEntries(
      Object.entries(columnTypes).map(([header, types]) => [
        header,
        Array.from(types),
      ])
    )
  }

  // Detect patterns
  if (headers.length === 0) {
    analysis.patterns.push("no_headers")
  }
  
  if (sampleRows.some((row) => row.non_empty_count === 1)) {
    analysis.patterns.push("single_column_data")
  }

  if (sampleRows.every((row) => row.non_empty_count === headers.length)) {
    analysis.patterns.push("fully_populated")
  }

  return analysis
}

/**
 * Suggest parsing configuration based on sheet analysis
 */
function suggestParsingConfiguration(
  sheetName: string,
  headers: string[],
  sampleRows: any[],
  structure: any
): any {
  const config: any = {
    parser_type: "standard",
    use_ai: false,
    table_mapping: null,
    column_mapping: {},
    special_handling: [],
  }

  // Determine parser type based on structure
  switch (structure.type) {
    case "standings":
      config.parser_type = "teams"
      config.table_mapping = "teams"
      config.use_ai = headers.length === 0 || headers.some((h) => 
        h.toLowerCase().includes("week") && !h.toLowerCase().includes("team")
      )
      config.column_mapping = suggestTeamColumnMapping(headers, sampleRows)
      break

    case "draft":
      config.parser_type = "draft"
      config.table_mapping = "team_rosters"
      config.use_ai = false // Draft data is usually structured
      config.column_mapping = suggestDraftColumnMapping(headers, sampleRows)
      break

    case "matches":
      config.parser_type = "matches"
      config.table_mapping = "matches"
      config.use_ai = headers.length === 0
      config.column_mapping = suggestMatchColumnMapping(headers, sampleRows)
      break

    case "master_data":
      config.parser_type = "master_data"
      config.use_ai = true // Master data often needs AI for complex structures
      config.special_handling.push("multi_table_extraction")
      break

    case "rules":
      config.parser_type = "rules"
      config.use_ai = true // Rules are text-heavy and need AI
      config.special_handling.push("text_extraction")
      config.special_handling.push("section_detection")
      break

    case "team_page":
      config.parser_type = "team_page"
      config.use_ai = true // Team pages vary widely
      config.special_handling.push("extract_team_name_from_sheet")
      break

    default:
      config.parser_type = "generic"
      config.use_ai = headers.length === 0 || structure.patterns.includes("no_headers")
  }

  // Add special handling flags
  if (structure.patterns.includes("no_headers")) {
    config.special_handling.push("no_headers")
  }

  if (structure.patterns.includes("single_column_data")) {
    config.special_handling.push("single_column")
  }

  return config
}

/**
 * Suggest column mapping for teams/standings
 */
function suggestTeamColumnMapping(headers: string[], sampleRows: any[]): Record<string, string> {
  const mapping: Record<string, string> = {}
  const normalizedHeaders = headers.map((h) => h.toLowerCase())

  // Common team column patterns
  const patterns: Record<string, string[]> = {
    name: ["team", "team name", "name"],
    coach_name: ["coach", "coach name"],
    division: ["division", "div"],
    conference: ["conference", "conf"],
    wins: ["wins", "w"],
    losses: ["losses", "l", "loss"],
    differential: ["differential", "diff", "difference", "point diff"],
    strength_of_schedule: ["strength", "sos", "strength of schedule"],
  }

  for (const [dbField, hints] of Object.entries(patterns)) {
    const matchedHeader = normalizedHeaders.find((h) =>
      hints.some((hint) => h.includes(hint))
    )
    if (matchedHeader) {
      const originalHeader = headers[normalizedHeaders.indexOf(matchedHeader)]
      mapping[originalHeader] = dbField
    }
  }

  return mapping
}

/**
 * Suggest column mapping for draft data
 */
function suggestDraftColumnMapping(headers: string[], sampleRows: any[]): Record<string, string> {
  const mapping: Record<string, string> = {}
  const normalizedHeaders = headers.map((h) => h.toLowerCase())

  const patterns: Record<string, string[]> = {
    team_id: ["team", "team name"],
    pokemon_id: ["pokemon", "pokémon", "pick"],
    draft_round: ["round"],
    draft_order: ["order", "pick number", "pick"],
    draft_points: ["cost", "points", "price"],
  }

  for (const [dbField, hints] of Object.entries(patterns)) {
    const matchedHeader = normalizedHeaders.find((h) =>
      hints.some((hint) => h.includes(hint))
    )
    if (matchedHeader) {
      const originalHeader = headers[normalizedHeaders.indexOf(matchedHeader)]
      mapping[originalHeader] = dbField
    }
  }

  return mapping
}

/**
 * Suggest column mapping for match data
 */
function suggestMatchColumnMapping(headers: string[], sampleRows: any[]): Record<string, string> {
  const mapping: Record<string, string> = {}
  const normalizedHeaders = headers.map((h) => h.toLowerCase())

  const patterns: Record<string, string[]> = {
    week: ["week"],
    team1_name: ["team 1", "team1", "team a", "home"],
    team2_name: ["team 2", "team2", "team b", "away"],
    team1_score: ["score 1", "team1 score", "home score"],
    team2_score: ["score 2", "team2 score", "away score"],
    winner_name: ["winner", "winning team"],
  }

  for (const [dbField, hints] of Object.entries(patterns)) {
    const matchedHeader = normalizedHeaders.find((h) =>
      hints.some((hint) => h.includes(hint))
    )
    if (matchedHeader) {
      const originalHeader = headers[normalizedHeaders.indexOf(matchedHeader)]
      mapping[originalHeader] = dbField
    }
  }

  return mapping
}

/**
 * Generate summary of analysis
 */
function generateSummary(analysisResults: any[]): any {
  const summary = {
    total_sheets: analysisResults.length,
    sheet_types: {} as Record<string, number>,
    parsing_strategies: {} as Record<string, number>,
    complexity_distribution: {} as Record<string, number>,
    ai_required_count: 0,
    no_headers_count: 0,
  }

  analysisResults.forEach((analysis) => {
    // Count sheet types
    const type = analysis.structure?.type || "unknown"
    summary.sheet_types[type] = (summary.sheet_types[type] || 0) + 1

    // Count parsing strategies
    const parserType = analysis.parsing_suggestions?.parser_type || "unknown"
    summary.parsing_strategies[parserType] = (summary.parsing_strategies[parserType] || 0) + 1

    // Count complexity
    const complexity = analysis.structure?.complexity || "unknown"
    summary.complexity_distribution[complexity] = (summary.complexity_distribution[complexity] || 0) + 1

    // Count AI requirements
    if (analysis.parsing_suggestions?.use_ai) {
      summary.ai_required_count++
    }

    // Count no headers
    if (!analysis.has_headers) {
      summary.no_headers_count++
    }
  })

  return summary
}

/**
 * Convert column number to letter
 */
function getColumnLetter(columnNumber: number): string {
  let result = ""
  while (columnNumber > 0) {
    columnNumber--
    result = String.fromCharCode(65 + (columnNumber % 26)) + result
    columnNumber = Math.floor(columnNumber / 26)
  }
  return result || "A"
}
