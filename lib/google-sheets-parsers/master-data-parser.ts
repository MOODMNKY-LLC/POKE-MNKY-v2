/**
 * Master Data Parser
 * Handles parsing of master/reference data sheets with multiple tables
 * Uses AI to detect table boundaries and extract different data types
 */

import { BaseParser, ParserConfig, ParserResult } from "./base-parser"
import { z } from "zod"
import { zodResponseFormat } from "openai/helpers/zod"
import { openai, AI_MODELS } from "../openai-client"

// Schema for multi-table extraction
const TableSchema = z.object({
  table_name: z.string(),
  table_type: z.enum(["pokemon_reference", "type_effectiveness", "league_config", "scoring_rules", "season_structure", "unknown"]),
  start_row: z.number().int(),
  end_row: z.number().int(),
  start_column: z.number().int(),
  end_column: z.number().int(),
  headers: z.array(z.string()),
  data_rows: z.array(z.array(z.union([z.string(), z.number(), z.boolean(), z.null()]))), // Explicit types for OpenAI schema validation
})

const MultiTableResponseSchema = z.object({
  tables: z.array(TableSchema),
  relationships: z.array(z.object({
    from_table: z.string(),
    to_table: z.string(),
    relationship_type: z.string(),
  })).optional(),
  errors: z.array(z.string()).optional(),
})

export class MasterDataParser extends BaseParser {
  async parse(): Promise<ParserResult> {
    this.log(`Parsing master data from sheet "${this.sheet.title}"`)

    try {
      // Detect all tables in the sheet using AI
      const tables = await this.detectTables()
      
      if (tables.length === 0) {
        this.warn("No tables detected in master data sheet")
        return this.getResult()
      }

      this.log(`Detected ${tables.length} table(s) in master data sheet`)

      // Extract and process each table
      const extractedData = await this.extractTables(tables)

      // Map to database tables
      await this.mapToDatabase(extractedData)

      return this.getResult()
    } catch (error) {
      this.error("Failed to parse master data", error)
      return this.getResult()
    }
  }

  /**
   * Detect all distinct tables in the sheet using AI
   */
  private async detectTables(): Promise<Array<{
    tableName: string
    tableType: string
    startRow: number
    endRow: number
    startColumn: number
    endColumn: number
    headers: string[]
  }>> {
    // Load a sample of the sheet (limit size to avoid scope issues and OpenAI timeouts)
    const maxRows = Math.min(this.sheet.rowCount, 200) // Limit for OpenAI payload
    const maxCols = Math.min(this.sheet.columnCount, 30) // Limit for OpenAI payload
    const range = `A1:${this.getColumnLetter(maxCols)}${maxRows}`
    
    // Try to get data using raw Google Sheets API (doesn't require Drive scope)
    let cellData: Array<Array<any>> = []
    
    try {
      // Use raw API via google-spreadsheet's internal methods
      // First try getRows() if headers exist
      try {
        await this.sheet.loadHeaderRow()
        const rows = await this.sheet.getRows({ limit: maxRows })
        // Convert rows to cell data format
        for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
          const row = rows[rowIdx]
          const rowData: any[] = []
          const rowValues = row._rawData || []
          for (let col = 0; col < Math.min(rowValues.length, maxCols); col++) {
            const value = rowValues[col]
            rowData.push({
              value,
              formattedValue: String(value || ""),
              isEmpty: value === null || value === undefined || value === "",
            })
          }
          cellData.push(rowData)
        }
      } catch (headerError: any) {
        // No headers, use raw API call
        this.warn("No headers found, using raw API")
        const { google } = await import("googleapis")
        const { getGoogleServiceAccountCredentials } = await import("../utils/google-sheets")
        
        const credentials = getGoogleServiceAccountCredentials()
        if (!credentials) {
          throw new Error("Google Sheets credentials not configured")
        }
        
        const { JWT } = await import("google-auth-library")
        const serviceAccountAuth = new JWT({
          email: credentials.email,
          key: credentials.privateKey,
          scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
        })
        
        const sheets = google.sheets({ version: "v4", auth: serviceAccountAuth })
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: this.sheet._spreadsheet.spreadsheetId,
          range: `${this.sheet.title}!${range}`,
        })
        
        const values = response.data.values || []
        for (let rowIdx = 0; rowIdx < Math.min(values.length, maxRows); rowIdx++) {
          const row = values[rowIdx] || []
          const rowData: any[] = []
          for (let col = 0; col < Math.min(row.length, maxCols); col++) {
            const value = row[col]
            rowData.push({
              value,
              formattedValue: String(value || ""),
              isEmpty: value === null || value === undefined || value === "",
            })
          }
          cellData.push(rowData)
        }
      }
    } catch (error: any) {
      this.error("Failed to load cell data", error)
      // Return empty structure if we can't load data
      return []
    }

    const prompt = `Analyze this Google Sheet and identify all distinct tables within it.
    
Tables are separated by blank rows, formatting changes, or different column structures.
For each table, identify:
- Table boundaries (start_row, end_row, start_column, end_column)
- Table type (pokemon_reference, type_effectiveness, league_config, scoring_rules, season_structure, or unknown)
- Headers (first non-empty row in the table)
- Data rows

Sheet data (${maxRows} rows × ${maxCols} columns):
${JSON.stringify(cellData.slice(0, 100), null, 2)}

Return all detected tables with their structure.`

    try {
      const responseFormat = zodResponseFormat(MultiTableResponseSchema, "multi_table_extraction")
      
      // Add timeout to prevent infinite hangs (30 seconds)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("AI table detection timed out after 30 seconds")), 30000)
      )
      
      const apiPromise = openai.chat.completions.create({
        model: AI_MODELS.STRATEGY_COACH,
        messages: [
          {
            role: "system",
            content:
              "You are an expert at analyzing spreadsheet structures. Identify distinct tables within sheets, detect their boundaries, classify their types, and extract their data.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: responseFormat,
        temperature: 0.2,
      })
      
      const response = await Promise.race([apiPromise, timeoutPromise]) as Awaited<typeof apiPromise>

      const message = response.choices[0].message
      const content = message.content

      if (!content) {
        throw new Error("No response from AI table detection")
      }

      const jsonData = JSON.parse(content)
      const parsed = MultiTableResponseSchema.parse(jsonData)

      return parsed.tables.map((table) => ({
        tableName: table.table_name,
        tableType: table.table_type,
        startRow: table.start_row,
        endRow: table.end_row,
        startColumn: table.start_column,
        endColumn: table.end_column,
        headers: table.headers,
      }))
    } catch (error) {
      this.error("AI table detection failed", error)
      // Fallback: treat entire sheet as one table
      return [
        {
          tableName: this.sheet.title,
          tableType: "unknown",
          startRow: 0,
          endRow: Math.min(this.sheet.rowCount, 500),
          startColumn: 0,
          endColumn: Math.min(this.sheet.columnCount, 50),
          headers: [],
        },
      ]
    }
  }

  /**
   * Extract data from detected tables
   */
  private async extractTables(
    tables: Array<{
      tableName: string
      tableType: string
      startRow: number
      endRow: number
      startColumn: number
      endColumn: number
      headers: string[]
    }>
  ): Promise<Array<{
    tableType: string
    data: any[]
  }>> {
    const extractedData: Array<{ tableType: string; data: any[] }> = []

    for (const table of tables) {
      try {
        const tableData: any[] = []

        // Use raw API to extract table data (doesn't require Drive scope)
        const range = `${this.getColumnLetter(table.startColumn + 1)}${table.startRow + 1}:${this.getColumnLetter(table.endColumn + 1)}${table.endRow + 1}`
        
        try {
          const { google } = await import("googleapis")
          const { getGoogleServiceAccountCredentials } = await import("../utils/google-sheets")
          
          const credentials = getGoogleServiceAccountCredentials()
          if (!credentials) {
            throw new Error("Google Sheets credentials not configured")
          }
          
          const { JWT } = await import("google-auth-library")
          const serviceAccountAuth = new JWT({
            email: credentials.email,
            key: credentials.privateKey,
            scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
          })
          
          const sheets = google.sheets({ version: "v4", auth: serviceAccountAuth })
          const response = await sheets.spreadsheets.values.get({
            spreadsheetId: this.sheet._spreadsheet.spreadsheetId,
            range: `${this.sheet.title}!${range}`,
          })
          
          const values = response.data.values || []
          
          // Extract rows
          for (let rowIdx = 0; rowIdx < values.length; rowIdx++) {
            const row = values[rowIdx] || []
            const rowData: any = {}
            let hasData = false
            
            for (let colIdx = 0; colIdx < Math.min(row.length, table.endColumn - table.startColumn + 1); colIdx++) {
              const header = table.headers[colIdx] || `Column ${colIdx + 1}`
              const value = row[colIdx]
              
              if (value !== null && value !== undefined && value !== "") {
                rowData[header] = value
                hasData = true
              }
            }
            
            if (hasData) {
              tableData.push(rowData)
            }
          }
          
          extractedData.push({
            tableType: table.tableType,
            data: tableData,
          })
          
          this.log(`Extracted ${tableData.length} rows from ${table.tableType} table`)
        } catch (apiError: any) {
          // Fallback to loadCells() if raw API fails
          this.warn("Raw API failed, trying loadCells()")
          try {
            await this.sheet.loadCells(range)

            // Extract rows using loadCells()
            const dataStartRow = table.startRow + (table.headers.length > 0 ? 1 : 0)
            for (let row = dataStartRow; row <= table.endRow; row++) {
              const rowData: any = {}
              let hasData = false

              for (let col = table.startColumn; col <= table.endColumn; col++) {
                try {
                  const cell = this.sheet.getCell(row, col)
                  const header = table.headers[col - table.startColumn] || `Column ${col + 1}`
                  
                  if (cell.value !== null && cell.value !== undefined && cell.value !== "") {
                    rowData[header] = cell.value
                    hasData = true
                  }
                } catch (cellError) {
                  // Cell not loaded, skip
                  continue
                }
              }

              if (hasData) {
                tableData.push(rowData)
              }
            }

            extractedData.push({
              tableType: table.tableType,
              data: tableData,
            })

            this.log(`Extracted ${tableData.length} rows from ${table.tableType} table`)
          } catch (loadCellsError: any) {
            this.error(`Failed to extract table "${table.tableName}"`, loadCellsError)
          }
        }
      } catch (error: any) {
        // General error handling for this table
        this.error(`Failed to process table "${table.tableName}"`, error)
      }
    }

    return extractedData
  }

  /**
   * Map extracted data to database tables
   */
  private async mapToDatabase(
    extractedData: Array<{
      tableType: string
      data: any[]
    }>
  ): Promise<void> {
    for (const table of extractedData) {
      try {
        switch (table.tableType) {
          case "pokemon_reference":
            await this.upsertPokemonReference(table.data)
            break
          case "type_effectiveness":
            await this.upsertTypeEffectiveness(table.data)
            break
          case "league_config":
            await this.upsertLeagueConfig(table.data)
            break
          case "scoring_rules":
            await this.upsertScoringRules(table.data)
            break
          case "season_structure":
            await this.upsertSeasonStructure(table.data)
            break
          default:
            this.warn(`Unknown table type: ${table.tableType}, skipping database mapping`)
        }
      } catch (error) {
        this.error(`Failed to map ${table.tableType} to database`, error)
      }
    }
  }

  /**
   * Upsert Pokemon reference data
   */
  private async upsertPokemonReference(data: any[]): Promise<void> {
    // This would update pokemon_cache if needed
    // For now, just log
    this.log(`Would upsert ${data.length} Pokemon reference records`)
    this.recordsProcessed += data.length
  }

  /**
   * Upsert type effectiveness data
   */
  private async upsertTypeEffectiveness(data: any[]): Promise<void> {
    // This would create/update type_effectiveness table
    this.log(`Would upsert ${data.length} type effectiveness records`)
    this.recordsProcessed += data.length
  }

  /**
   * Upsert league configuration
   */
  private async upsertLeagueConfig(data: any[]): Promise<void> {
    // This would update league_config table
    this.log(`Would upsert ${data.length} league config records`)
    this.recordsProcessed += data.length
  }

  /**
   * Upsert scoring rules
   */
  private async upsertScoringRules(data: any[]): Promise<void> {
    // This would update scoring_rules table
    this.log(`Would upsert ${data.length} scoring rule records`)
    this.recordsProcessed += data.length
  }

  /**
   * Upsert season structure
   */
  private async upsertSeasonStructure(data: any[]): Promise<void> {
    // This would update season_weeks table
    this.log(`Would upsert ${data.length} season structure records`)
    this.recordsProcessed += data.length
  }
}
