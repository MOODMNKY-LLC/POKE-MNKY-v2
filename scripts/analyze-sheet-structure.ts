/**
 * Comprehensive Google Sheet Structure Analysis Script
 * Analyzes each sheet type in detail for parsing strategy development
 */

import { GoogleSpreadsheet } from "google-spreadsheet"
import { JWT } from "google-auth-library"
import { google } from "googleapis"
import { getGoogleServiceAccountCredentials } from "../lib/utils/google-sheets"
import * as dotenv from "dotenv"
import * as path from "path"

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), ".env.local") })

interface SheetAnalysis {
  sheetName: string
  sheetIndex: number
  rowCount: number
  columnCount: number
  headers: string[]
  hasHeaders: boolean
  structure: {
    type: "master_data" | "rules" | "draft_board" | "team_sheet" | "unknown"
    complexity: "simple" | "structured" | "complex" | "variable"
    patterns: string[]
    dataTypes: Record<string, string[]>
  }
  sampleData: {
    rows: any[]
    cellAnalysis: Record<string, any>
  }
  images: {
    count: number
    locations: Array<{ row: number; column: string; type?: string }>
  }
  comments: {
    count: number
    locations: Array<{ row: number; column: string; content: string }>
  }
  parsingRecommendations: {
    parserType: string
    useAI: boolean
    columnMapping: Record<string, string>
    specialHandling: string[]
    confidence: number
  }
}

function getColumnLetter(columnNumber: number): string {
  let result = ""
  while (columnNumber > 0) {
    columnNumber--
    result = String.fromCharCode(65 + (columnNumber % 26)) + result
    columnNumber = Math.floor(columnNumber / 26)
  }
  return result || "A"
}

async function analyzeSheetComprehensively(
  spreadsheetId: string
): Promise<SheetAnalysis[]> {
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

  const doc = new GoogleSpreadsheet(spreadsheetId, serviceAccountAuth)
  await doc.loadInfo()

  const sheets = google.sheets({ version: "v4", auth: serviceAccountAuth })

  console.log(`\n📊 Analyzing Spreadsheet: "${doc.title}"`)
  console.log(`📑 Total Sheets: ${doc.sheetsByIndex.length}\n`)

  const analyses: SheetAnalysis[] = []

  for (const sheet of doc.sheetsByIndex) {
    console.log(`\n🔍 Analyzing Sheet: "${sheet.title}" (${sheet.index + 1}/${doc.sheetsByIndex.length})`)
    console.log("─".repeat(60))

    const analysis: SheetAnalysis = {
      sheetName: sheet.title,
      sheetIndex: sheet.index,
      rowCount: sheet.rowCount,
      columnCount: sheet.columnCount,
      headers: [],
      hasHeaders: false,
      structure: {
        type: "unknown",
        complexity: "simple",
        patterns: [],
        dataTypes: {},
      },
      sampleData: {
        rows: [],
        cellAnalysis: {},
      },
      images: {
        count: 0,
        locations: [],
      },
      comments: {
        count: 0,
        locations: [],
      },
      parsingRecommendations: {
        parserType: "generic",
        useAI: false,
        columnMapping: {},
        specialHandling: [],
        confidence: 0,
      },
    }

    try {
      // Load a comprehensive sample of cells
      const maxRows = Math.min(sheet.rowCount, 200)
      const maxCols = Math.min(sheet.columnCount, 50)
      const sampleRange = `A1:${getColumnLetter(maxCols)}${maxRows}`
      
      await sheet.loadCells(sampleRange)

      // Analyze headers
      const headers: string[] = []
      for (let col = 0; col < maxCols; col++) {
        const cell = sheet.getCell(0, col)
        if (cell.value) {
          headers.push(String(cell.value))
        } else {
          break
        }
      }

      analysis.headers = headers
      analysis.hasHeaders = headers.length > 0

      // Detect sheet type based on name and structure
      const normalizedName = sheet.title.toLowerCase()
      if (normalizedName.includes("master") || normalizedName.includes("data") || normalizedName.includes("reference")) {
        analysis.structure.type = "master_data"
        analysis.structure.complexity = "complex"
      } else if (normalizedName.includes("rule")) {
        analysis.structure.type = "rules"
        analysis.structure.complexity = "variable"
      } else if (normalizedName.includes("draft") || normalizedName.includes("board")) {
        analysis.structure.type = "draft_board"
        analysis.structure.complexity = "structured"
      } else if (normalizedName.includes("team")) {
        analysis.structure.type = "team_sheet"
        analysis.structure.complexity = "variable"
      }

      // Sample data rows (skip header if exists)
      const dataStartRow = headers.length > 0 ? 1 : 0
      const sampleRows: any[] = []

      for (let row = dataStartRow; row < Math.min(dataStartRow + 30, maxRows); row++) {
        const rowData: any = {
          rowNumber: row + 1,
          cells: {},
          nonEmptyCells: 0,
        }

        for (let col = 0; col < headers.length || col < maxCols; col++) {
          const cell = sheet.getCell(row, col)
          const columnLetter = getColumnLetter(col + 1)
          const header = headers[col] || `Column ${columnLetter}`

          if (cell.value !== null && cell.value !== undefined && cell.value !== "") {
            rowData.cells[header] = {
              value: cell.value,
              formattedValue: cell.formattedValue || String(cell.value),
              type: typeof cell.value,
              column: columnLetter,
            }
            rowData.nonEmptyCells++

            // Track data types per column
            if (!analysis.structure.dataTypes[header]) {
              analysis.structure.dataTypes[header] = []
            }
            if (!analysis.structure.dataTypes[header].includes(typeof cell.value)) {
              analysis.structure.dataTypes[header].push(typeof cell.value)
            }
          }
        }

        if (rowData.nonEmptyCells > 0) {
          sampleRows.push(rowData)
        }
      }

      analysis.sampleData.rows = sampleRows.slice(0, 10)

      // Analyze patterns
      if (!analysis.hasHeaders) {
        analysis.structure.patterns.push("no_headers")
      }
      if (sampleRows.some((r) => r.nonEmptyCells === 1)) {
        analysis.structure.patterns.push("single_column_data")
      }
      if (sampleRows.every((r) => r.nonEmptyCells === headers.length)) {
        analysis.structure.patterns.push("fully_populated")
      }

      // Get images and comments using Sheets API v4
      try {
        const spreadsheetMetadata = await sheets.spreadsheets.get({
          spreadsheetId,
          includeGridData: true,
          ranges: [`${sheet.title}!A1:${getColumnLetter(maxCols)}${maxRows}`],
        })

        const gridData = spreadsheetMetadata.data.sheets?.[0]?.data?.[0]
        if (gridData) {
          // Count embedded images
          const embeddedObjects = gridData.embeddedObjects || []
          analysis.images.count = embeddedObjects.length

          for (const obj of embeddedObjects) {
            const position = obj.position?.overlayPosition?.anchorCell
            if (position) {
              analysis.images.locations.push({
                row: (position.rowIndex || 0) + 1,
                column: getColumnLetter((position.columnIndex || 0) + 1),
                type: obj.imageProperties ? "image" : "chart",
              })
            }
          }

          // Check for IMAGE() formulas
          if (gridData.rowData) {
            for (let rowIdx = 0; rowIdx < gridData.rowData.length; rowIdx++) {
              const row = gridData.rowData[rowIdx]
              if (row.values) {
                for (let colIdx = 0; colIdx < row.values.length; colIdx++) {
                  const cell = row.values[colIdx]
                  if (cell.userEnteredValue?.formulaValue) {
                    const formula = cell.userEnteredValue.formulaValue
                    if (formula.match(/IMAGE\(/i)) {
                      analysis.images.count++
                      analysis.images.locations.push({
                        row: rowIdx + 1,
                        column: getColumnLetter(colIdx + 1),
                        type: "formula_image",
                      })
                    }
                  }
                }
              }
            }
          }
        }

        // Get comments
        try {
          const commentsResponse = await sheets.spreadsheets.comments.list({
            spreadsheetId,
          })

          const sheetComments = commentsResponse.data.comments?.filter((comment) => {
            const anchor = comment.anchor
            return anchor && (anchor.startRowIndex !== undefined || anchor.sheetId !== undefined)
          }) || []

          analysis.comments.count = sheetComments.length
          for (const comment of sheetComments) {
            const anchor = comment.anchor
            if (anchor?.startRowIndex !== undefined && anchor?.startColumnIndex !== undefined) {
              analysis.comments.locations.push({
                row: anchor.startRowIndex + 1,
                column: getColumnLetter(anchor.startColumnIndex + 1),
                content: comment.content || "",
              })
            }
          }
        } catch (commentsError) {
          console.log(`  ⚠️  Could not fetch comments: ${commentsError}`)
        }
      } catch (metadataError) {
        console.log(`  ⚠️  Could not fetch metadata: ${metadataError}`)
      }

      // Generate parsing recommendations
      analysis.parsingRecommendations = generateParsingRecommendations(
        analysis.structure.type,
        headers,
        sampleRows,
        analysis.structure
      )

      analyses.push(analysis)

      // Print summary
      console.log(`  ✅ Analyzed ${analysis.rowCount} rows × ${analysis.columnCount} columns`)
      console.log(`  📋 Headers: ${analysis.headers.length > 0 ? analysis.headers.length : "None"}`)
      console.log(`  🖼️  Images: ${analysis.images.count}`)
      console.log(`  💬 Comments: ${analysis.comments.count}`)
      console.log(`  🎯 Type: ${analysis.structure.type}`)
      console.log(`  📊 Complexity: ${analysis.structure.complexity}`)

    } catch (error) {
      console.error(`  ❌ Error analyzing sheet "${sheet.title}":`, error)
      analysis.parsingRecommendations.confidence = 0
      analyses.push(analysis)
    }
  }

  return analyses
}

function generateParsingRecommendations(
  sheetType: string,
  headers: string[],
  sampleRows: any[],
  structure: any
): SheetAnalysis["parsingRecommendations"] {
  const recommendations: SheetAnalysis["parsingRecommendations"] = {
    parserType: "generic",
    useAI: false,
    columnMapping: {},
    specialHandling: [],
    confidence: 0.5,
  }

  switch (sheetType) {
    case "master_data":
      recommendations.parserType = "master_data"
      recommendations.useAI = true
      recommendations.specialHandling.push("multi_table_extraction")
      recommendations.specialHandling.push("complex_structure")
      recommendations.confidence = 0.7
      break

    case "rules":
      recommendations.parserType = "rules"
      recommendations.useAI = true
      recommendations.specialHandling.push("text_extraction")
      recommendations.specialHandling.push("section_detection")
      recommendations.confidence = 0.6
      break

    case "draft_board":
      recommendations.parserType = "draft"
      recommendations.useAI = false
      recommendations.specialHandling.push("round_tracking")
      recommendations.specialHandling.push("pick_order")
      recommendations.confidence = 0.8
      break

    case "team_sheet":
      recommendations.parserType = "team_page"
      recommendations.useAI = true
      recommendations.specialHandling.push("extract_team_name_from_sheet")
      recommendations.specialHandling.push("variable_structure")
      recommendations.confidence = 0.7
      break

    default:
      recommendations.parserType = "generic"
      recommendations.useAI = headers.length === 0
      recommendations.confidence = 0.5
  }

  return recommendations
}

// Main execution
async function main() {
  const spreadsheetId = process.argv[2] || process.env.GOOGLE_SHEET_ID

  if (!spreadsheetId) {
    console.error("Please provide spreadsheet ID as argument or set GOOGLE_SHEET_ID env var")
    process.exit(1)
  }

  try {
    const analyses = await analyzeSheetComprehensively(spreadsheetId)

    console.log("\n" + "=".repeat(60))
    console.log("📊 COMPREHENSIVE ANALYSIS SUMMARY")
    console.log("=".repeat(60))

    // Group by type
    const byType: Record<string, SheetAnalysis[]> = {}
    for (const analysis of analyses) {
      const type = analysis.structure.type
      if (!byType[type]) {
        byType[type] = []
      }
      byType[type].push(analysis)
    }

    console.log("\n📑 Sheets by Type:")
    for (const [type, sheets] of Object.entries(byType)) {
      console.log(`  ${type}: ${sheets.length} sheet(s)`)
      for (const sheet of sheets) {
        console.log(`    - ${sheet.sheetName}`)
      }
    }

    // Save detailed analysis to JSON
    const fs = require("fs")
    const outputPath = path.join(process.cwd(), "sheet-analysis-detailed.json")
    fs.writeFileSync(outputPath, JSON.stringify(analyses, null, 2))
    console.log(`\n💾 Detailed analysis saved to: ${outputPath}`)

  } catch (error) {
    console.error("Analysis failed:", error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

export { analyzeSheetComprehensively, type SheetAnalysis }
