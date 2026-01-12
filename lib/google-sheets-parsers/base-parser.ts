/**
 * Base Parser Class
 * All sheet parsers extend this base class
 */

import { GoogleSpreadsheetWorksheet } from "google-spreadsheet"
import { SupabaseClient } from "@supabase/supabase-js"
import { SheetParsingConfig } from "./index"

export interface ParserConfig extends SheetParsingConfig {
  // Additional config can be added here
}

export interface ParserResult {
  success: boolean
  recordsProcessed: number
  errors: string[]
  warnings?: string[]
  metadata?: Record<string, any>
}

/**
 * Base parser class that all specific parsers extend
 */
export abstract class BaseParser {
  protected sheet: GoogleSpreadsheetWorksheet
  protected supabase: SupabaseClient
  protected config: ParserConfig
  protected errors: string[] = []
  protected warnings: string[] = []
  protected recordsProcessed: number = 0

  constructor(
    sheet: GoogleSpreadsheetWorksheet,
    supabase: SupabaseClient,
    config: ParserConfig
  ) {
    this.sheet = sheet
    this.supabase = supabase
    this.config = config
  }

  /**
   * Main parse method - must be implemented by subclasses
   */
  abstract parse(): Promise<ParserResult>

  /**
   * Load and validate headers
   */
  protected async loadHeaders(): Promise<string[]> {
    try {
      await this.sheet.loadHeaderRow()
      return this.sheet.headerValues || []
    } catch (error: any) {
      const errorMsg = error.message?.toLowerCase() || ""
      if (errorMsg.includes("no values") || errorMsg.includes("header")) {
        this.warnings.push("No headers found - using raw data access")
        return []
      }
      throw error
    }
  }

  /**
   * Get raw row data (for sheets without headers)
   */
  protected async getRawRowData(rowIndex: number, columnCount: number = 50): Promise<any[]> {
    const range = `A${rowIndex + 1}:${this.getColumnLetter(columnCount)}${rowIndex + 1}`
    await this.sheet.loadCells(range)
    
    const rowData: any[] = []
    for (let col = 0; col < columnCount; col++) {
      const cell = this.sheet.getCell(rowIndex, col)
      rowData.push(cell.value !== null && cell.value !== undefined ? cell.value : null)
    }
    
    return rowData
  }

  /**
   * Get all rows (with or without headers)
   */
  protected async getAllRows(): Promise<any[]> {
    if (this.config.has_headers !== false) {
      try {
        await this.sheet.loadHeaderRow()
        return await this.sheet.getRows()
      } catch (error) {
        // Fall back to raw access
        this.config.has_headers = false
      }
    }

    // Raw access for sheets without headers
    // Load cells in batches to avoid performance issues
    const rows: any[] = []
    const rowCount = Math.min(this.sheet.rowCount, 1000)
    const columnCount = Math.min(this.sheet.columnCount, 50)
    
    // Load cells in batches of 100 rows at a time
    const batchSize = 100
    for (let batchStart = 0; batchStart < rowCount; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize, rowCount)
      const range = `A${batchStart + 1}:${this.getColumnLetter(columnCount)}${batchEnd}`
      
      try {
        await this.sheet.loadCells(range)
        
        // Extract rows from this batch
        for (let i = batchStart; i < batchEnd; i++) {
          const rowData: any[] = []
          let hasData = false
          
          for (let col = 0; col < columnCount; col++) {
            const cell = this.sheet.getCell(i, col)
            const value = cell.value !== null && cell.value !== undefined ? cell.value : null
            rowData.push(value)
            if (value !== null && value !== "") {
              hasData = true
            }
          }
          
          if (hasData) {
            rows.push({ _rawData: rowData, _rowIndex: i })
          }
        }
      } catch (error) {
        this.warn(`Failed to load batch ${batchStart}-${batchEnd}: ${error instanceof Error ? error.message : "Unknown error"}`)
        // Continue with next batch
      }
    }
    
    return rows
  }

  /**
   * Map column value using column_mapping configuration
   */
  protected mapColumn(header: string, row: any): any {
    if (!this.config.column_mapping) {
      return null
    }

    const dbField = this.config.column_mapping[header]
    if (!dbField) {
      return null
    }

    // Try to get value by header name
    try {
      return row.get ? row.get(header) : row[header]
    } catch (e) {
      // If that fails, try raw data access
      if (row._rawData && Array.isArray(row._rawData)) {
        const headerIndex = this.sheet.headerValues?.indexOf(header) ?? -1
        if (headerIndex >= 0) {
          return row._rawData[headerIndex]
        }
      }
      return null
    }
  }

  /**
   * Convert column number to letter (1 -> A, 27 -> AA)
   */
  protected getColumnLetter(columnNumber: number): string {
    let result = ""
    while (columnNumber > 0) {
      columnNumber--
      result = String.fromCharCode(65 + (columnNumber % 26)) + result
      columnNumber = Math.floor(columnNumber / 26)
    }
    return result || "A"
  }

  /**
   * Check if special handling is required
   */
  protected hasSpecialHandling(handling: string): boolean {
    return this.config.special_handling?.includes(handling) ?? false
  }

  /**
   * Log parsing progress
   */
  protected log(message: string, ...args: any[]): void {
    console.log(`[Parser:${this.config.parser_type}] ${message}`, ...args)
  }

  /**
   * Log warning
   */
  protected warn(message: string): void {
    this.warnings.push(message)
    console.warn(`[Parser:${this.config.parser_type}] ${message}`)
  }

  /**
   * Log error
   */
  protected error(message: string, err?: any): void {
    const errorMsg = err instanceof Error ? err.message : String(err)
    this.errors.push(`${message}: ${errorMsg}`)
    console.error(`[Parser:${this.config.parser_type}] ${message}`, err)
  }

  /**
   * Get parser result
   */
  protected getResult(): ParserResult {
    return {
      success: this.errors.length === 0,
      recordsProcessed: this.recordsProcessed,
      errors: [...this.errors],
      warnings: [...this.warnings],
    }
  }
}
