/**
 * Draft Pool Parser
 * Extracts the complete list of available Pokemon with point values from the Draft Board
 * This is the AVAILABLE pool, not the picks that have been made
 */

import { BaseParser, ParserConfig, ParserResult } from "./base-parser"

interface DraftPoolPokemon {
  pokemon_name: string
  point_value: number
  column_index: number
  row_index: number
  is_available: boolean
  generation?: number
}

export class DraftPoolParser extends BaseParser {
  private spreadsheetId?: string

  async parse(): Promise<ParserResult> {
    this.log(`Extracting draft pool from sheet "${this.sheet.title}"`)

    try {
      // Get spreadsheet ID from sheet (same pattern as DraftParser)
      this.spreadsheetId = (this.config as any).spreadsheetId || 
                           (this.sheet as any)._spreadsheet?.spreadsheetId ||
                           (this.sheet as any).spreadsheet?.spreadsheetId

      if (!this.spreadsheetId) {
        this.warn("Could not determine spreadsheet ID - will try to continue")
      }

      // Detect grid structure to find point value columns
      const gridStructure = await this.detectGridStructure()
      
      if (!gridStructure.isValid) {
        this.error("Could not detect valid draft board grid structure")
        return this.getResult()
      }

      // Map team columns (point value columns)
      const teamMapping = await this.mapTeamColumns(gridStructure)
      
      if (teamMapping.length === 0) {
        this.error("Could not identify point value columns")
        return this.getResult()
      }

      this.log(`Found ${teamMapping.length} point value columns`)

      // Extract all Pokemon from each point value column
      const draftPool: DraftPoolPokemon[] = []
      
      for (const team of teamMapping) {
        // columnIndex already points to Pokemon column (was set as col + 1 in mapTeamColumns)
        const pokemonColumnIndex = team.columnIndex
        const pointValue = team.pointValue
        
        this.log(`Extracting Pokemon from column ${this.getColumnLetter(pokemonColumnIndex)} (${pointValue} points)`)

        // Read all rows starting from row 5 (where Pokemon start)
        // Use raw API for better reliability
        const { google } = await import("googleapis")
        const { getGoogleServiceAccountCredentials } = await import("../utils/google-sheets")
        const credentials = getGoogleServiceAccountCredentials()
        
        if (!credentials) {
          this.warn("Credentials not available for column reading")
          continue
        }

        const { JWT } = await import("google-auth-library")
        const serviceAccountAuth = new JWT({
          email: credentials.email,
          key: credentials.privateKey,
          scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
        })

        const sheets = google.sheets({ version: "v4", auth: serviceAccountAuth })
        const spreadsheetId = this.spreadsheetId || (this.sheet as any)._spreadsheet?.spreadsheetId

        if (!spreadsheetId) {
          this.warn(`Could not get spreadsheet ID for column ${this.getColumnLetter(pokemonColumnIndex)}`)
          continue
        }

        // Read rows 5-200 (where Pokemon are)
        const startRow = 5 // Row 5 (1-indexed)
        const endRow = Math.min(this.sheet.rowCount, 200)
        const columnLetter = this.getColumnLetter(pokemonColumnIndex)
        const range = `${this.sheet.title}!${columnLetter}${startRow}:${columnLetter}${endRow}`

        try {
          const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
          })

          const values = response.data.values || []

          for (let rowIdx = 0; rowIdx < values.length; rowIdx++) {
            const cellValue = values[rowIdx]?.[0] // First (and only) column in range
            
            // Get Pokemon name
            const pokemonName = this.extractPokemonName(cellValue)
            
            if (pokemonName) {
              // Check if Pokemon is available (not struck out/empty)
              const isAvailable = this.isPokemonAvailable(cellValue, [])
              
              draftPool.push({
                pokemon_name: pokemonName,
                point_value: pointValue,
                column_index: pokemonColumnIndex,
                row_index: startRow + rowIdx, // Actual row number (1-indexed)
                is_available: isAvailable,
              })

              if (isAvailable && draftPool.length <= 10) {
                // Log first 10 for debugging
                this.log(`  Found available: ${pokemonName} (${pointValue}pts) at row ${startRow + rowIdx}`)
              }
            }
          }
        } catch (error: any) {
          this.warn(`Failed to read rows for column ${columnLetter}: ${error.message}`)
        }
      }

      this.log(`Extracted ${draftPool.length} total Pokemon entries`)
      const availableCount = draftPool.filter(p => p.is_available).length
      this.log(`Found ${availableCount} available Pokemon`)

      // Enrich with generation data if available
      await this.enrichWithGenerations(draftPool)

      // Store draft pool in database
      await this.storeDraftPool(draftPool)

      return this.getResult()
    } catch (error) {
      this.error("Failed to extract draft pool", error)
      return this.getResult()
    }
  }

  /**
   * Extract Pokemon name from cell value
   * Handles various formats and cleans the name
   */
  private extractPokemonName(cellValue: any): string | null {
    if (!cellValue) return null

    const value = String(cellValue).trim()
    
    // Skip empty values
    if (value.length === 0) return null

    // Skip if it's a number (point value)
    if (/^\d+$/.test(value)) return null

    // Skip if it's "Points" or similar header text
    if (/points?/i.test(value)) return null

    // Clean the name (remove extra whitespace, special characters)
    const cleaned = value
      .replace(/\s+/g, " ")
      .replace(/[^\w\s-]/g, "")
      .trim()

    // Must be at least 2 characters
    if (cleaned.length < 2) return null

    return cleaned
  }

  /**
   * Check if Pokemon is available (not struck out/drafted)
   * Drafted Pokemon are typically empty or have strikethrough formatting
   */
  private isPokemonAvailable(cellValue: any, rowData: any[]): boolean {
    // If cell is empty/null, Pokemon is not available
    if (!cellValue || String(cellValue).trim().length === 0) {
      return false
    }

    // Check for strikethrough indicators in surrounding cells
    // (Some sheets mark drafted Pokemon with special formatting)
    const value = String(cellValue).trim()
    
    // If value contains strikethrough indicators
    if (value.includes("~~") || value.includes("—") || value.includes("--")) {
      return false
    }

    // Check adjacent cells for draft indicators
    // (Some sheets mark drafted Pokemon in adjacent columns)
    for (const cell of rowData) {
      const cellStr = String(cell || "").toLowerCase()
      if (cellStr.includes("drafted") || cellStr.includes("taken")) {
        return false
      }
    }

    return true
  }

  /**
   * Detect grid structure (same as DraftParser)
   */
  private async detectGridStructure(): Promise<{
    isValid: boolean
    startRow: number
    endRow: number
    startCol: number
    endCol: number
  }> {
    try {
      // Use raw API to read row 3 for headers
      const { google } = await import("googleapis")
      const { getGoogleServiceAccountCredentials } = await import("../utils/google-sheets")
      const credentials = getGoogleServiceAccountCredentials()
      
      if (!credentials) {
        return { isValid: false, startRow: 0, endRow: 0, startCol: 0, endCol: 0 }
      }

      const { JWT } = await import("google-auth-library")
      const serviceAccountAuth = new JWT({
        email: credentials.email,
        key: credentials.privateKey,
        scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
      })

      const sheets = google.sheets({ version: "v4", auth: serviceAccountAuth })
      // Get spreadsheet ID from sheet's parent document
      const spreadsheetId = (this.sheet as any).spreadsheet?.spreadsheetId || 
                           (this.sheet as any)._spreadsheet?.id ||
                           (this.sheet as any).sheetId ? 
                             (await this.sheet.loadInfo()).spreadsheetId : null

      if (!spreadsheetId) {
        // Try to get from config if available
        const configSpreadsheetId = (this.config as any).spreadsheetId
        if (configSpreadsheetId) {
          const sheets2 = google.sheets({ version: "v4", auth: serviceAccountAuth })
          const response = await sheets2.spreadsheets.values.get({
            spreadsheetId: configSpreadsheetId,
            range: `${this.sheet.title}!A3:Z3`,
          })
          const rowData = response.data.values?.[0] || []
          let foundHeaders = 0
          for (let col = 0; col < Math.min(rowData.length, 50); col++) {
            const value = String(rowData[col] || "").trim()
            const match = value.match(/(\d+)\s*points?/i)
            if (match) foundHeaders++
          }
          return {
            isValid: foundHeaders > 0,
            startRow: 0,
            endRow: Math.min(this.sheet.rowCount, 200),
            startCol: 0,
            endCol: Math.min(this.sheet.columnCount, 50),
          }
        }
        this.warn("Could not get spreadsheet ID")
        return { isValid: false, startRow: 0, endRow: 0, startCol: 0, endCol: 0 }
      }

      // Read row 3 (index 2)
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${this.sheet.title}!A3:Z3`,
      })

      const rowData = response.data.values?.[0] || []
      let foundHeaders = 0

      for (let col = 0; col < Math.min(rowData.length, 50); col++) {
        const value = String(rowData[col] || "").trim()
        const match = value.match(/(\d+)\s*points?/i)
        if (match) {
          foundHeaders++
        }
      }

      return {
        isValid: foundHeaders > 0,
        startRow: 0,
        endRow: Math.min(this.sheet.rowCount, 200),
        startCol: 0,
        endCol: Math.min(this.sheet.columnCount, 50),
      }
    } catch (error) {
      this.warn("Grid detection failed, assuming valid", error)
      // Assume valid if detection fails - we'll try to parse anyway
      return {
        isValid: true,
        startRow: 0,
        endRow: Math.min(this.sheet.rowCount, 200),
        startCol: 0,
        endCol: Math.min(this.sheet.columnCount, 50),
      }
    }
  }

  /**
   * Map team columns (point value columns) - same logic as DraftParser
   */
  private async mapTeamColumns(gridStructure: {
    isValid: boolean
    startRow: number
    endRow: number
    startCol: number
    endCol: number
  }): Promise<Array<{ pointValue: number; columnIndex: number; teamName: string }>> {
    const teamMapping: Array<{ pointValue: number; columnIndex: number; teamName: string }> = []

    try {
      // Use raw API to read row 3
      const { google } = await import("googleapis")
      const { getGoogleServiceAccountCredentials } = await import("../utils/google-sheets")
      const credentials = getGoogleServiceAccountCredentials()
      
      if (!credentials) {
        return teamMapping
      }

      const { JWT } = await import("google-auth-library")
      const serviceAccountAuth = new JWT({
        email: credentials.email,
        key: credentials.privateKey,
        scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
      })

      const sheets = google.sheets({ version: "v4", auth: serviceAccountAuth })
      const spreadsheetId = this.spreadsheetId || (this.sheet as any)._spreadsheet?.spreadsheetId

      if (!spreadsheetId) {
        this.warn("Could not get spreadsheet ID for column mapping")
        return teamMapping
      }

      this.log(`Reading row 3 from spreadsheet ${spreadsheetId.substring(0, 20)}...`)

      // Read row 3 - expand range to cover all point value columns (up to column ZZ for lower point values)
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${this.sheet.title}!A3:ZZ3`,
      })

      const rowData = response.data.values?.[0] || []

      this.log(`Scanning row 3 (${rowData.length} columns) for point value headers...`)

      // Look for "X Points" headers
      // Headers are at columns I, L, O, etc. (indices 8, 11, 14, ...)
      // Pattern: Every 3 columns starting from column I
      // Now scanning more columns to find point values down to 2
      for (let col = 8; col < Math.min(rowData.length, 200); col += 3) {
        const headerValue = String(rowData[col] || "").trim()
        
        // Match "20 Points", "19 Points", etc.
        const match = headerValue.match(/(\d+)\s*points?/i)
        if (match) {
          const pointValue = parseInt(match[1], 10)
          if (pointValue >= 2 && pointValue <= 20) {
            // Pokemon are one column after header (col + 1)
            const pokemonCol = col + 1
            teamMapping.push({
              pointValue,
              columnIndex: pokemonCol, // Pokemon column
              teamName: `Team ${pointValue} Points`,
            })
            this.log(`  Mapped: ${this.getColumnLetter(col)}3 = ${pointValue}pts, Pokemon at ${this.getColumnLetter(pokemonCol)}`)
          }
        }
      }

      // Sort by point value descending
      teamMapping.sort((a, b) => b.pointValue - a.pointValue)

      this.log(`Mapped ${teamMapping.length} point value columns`)
      return teamMapping
    } catch (error) {
      this.warn("Failed to map team columns", error)
      return teamMapping
    }
  }

  /**
   * Enrich Pokemon with generation data from pokemon_cache
   */
  private async enrichWithGenerations(draftPool: DraftPoolPokemon[]): Promise<void> {
    try {
      // Get unique Pokemon names
      const pokemonNames = [...new Set(draftPool.map(p => p.pokemon_name))]

      // Normalize names for matching (cache uses lowercase hyphenated: "flutter-mane")
      // Draft pool has spaces and capitals: "Flutter Mane"
      const normalizedNames = pokemonNames.map(name => 
        name.toLowerCase().replace(/\s+/g, "-")
      )

      // Query pokemon_cache for generation data using ILIKE for fuzzy matching
      let enriched = 0
      const generationMap = new Map<string, number>()

      // Try exact match first
      const { data: exactMatches } = await this.supabase
        .from("pokemon_cache")
        .select("name, generation")
        .in("name", normalizedNames)

      if (exactMatches) {
        for (const pokemon of exactMatches) {
          if (pokemon.generation) {
            generationMap.set(pokemon.name.toLowerCase(), pokemon.generation)
          }
        }
      }

      // For Pokemon not found, try ILIKE matching
      const unmatchedNames = pokemonNames.filter(name => {
        const normalized = name.toLowerCase().replace(/\s+/g, "-")
        return !generationMap.has(normalized)
      })

      if (unmatchedNames.length > 0) {
        for (const name of unmatchedNames) {
          // Try various name formats
          const searchPatterns = [
            name.toLowerCase().replace(/\s+/g, "-"), // "flutter-mane"
            name.toLowerCase().replace(/\s+/g, ""),  // "fluttermane"
            name.toLowerCase(),                       // "flutter mane"
          ]

          for (const pattern of searchPatterns) {
            const { data: matches } = await this.supabase
              .from("pokemon_cache")
              .select("name, generation")
              .ilike("name", pattern)
              .limit(1)

            if (matches && matches.length > 0 && matches[0].generation) {
              generationMap.set(name.toLowerCase(), matches[0].generation)
              break
            }
          }
        }
      }

      // Enrich draft pool
      for (const pokemon of draftPool) {
        const normalized = pokemon.pokemon_name.toLowerCase().replace(/\s+/g, "-")
        const gen = generationMap.get(normalized) || generationMap.get(pokemon.pokemon_name.toLowerCase())
        
        if (gen) {
          pokemon.generation = gen
          enriched++
        }
      }

      if (enriched > 0) {
        this.log(`Enriched ${enriched}/${draftPool.length} Pokemon with generation data`)
      } else {
        this.warn(`No generation data found for ${draftPool.length} Pokemon (tried ${pokemonNames.length} unique names)`)
      }
    } catch (error) {
      this.warn("Failed to enrich with generations", error)
    }
  }

  /**
   * Store draft pool in database
   */
  private async storeDraftPool(draftPool: DraftPoolPokemon[]): Promise<void> {
    try {
      // First, clear existing draft pool for this sheet
      const { error: deleteError } = await this.supabase
        .from("draft_pool")
        .delete()
        .eq("sheet_name", this.sheet.title)

      if (deleteError) {
        this.warn("Failed to clear existing draft pool", deleteError)
      }

      // Prepare data for insertion
      const poolData = draftPool.map((pokemon) => ({
        pokemon_name: pokemon.pokemon_name,
        point_value: pokemon.point_value,
        is_available: pokemon.is_available,
        generation: pokemon.generation || null,
        sheet_name: this.sheet.title,
        sheet_row: pokemon.row_index,
        sheet_column: this.getColumnLetter(pokemon.column_index),
        extracted_at: new Date().toISOString(),
      }))

      // Insert in batches
      const batchSize = 50
      for (let i = 0; i < poolData.length; i += batchSize) {
        const batch = poolData.slice(i, i + batchSize)
        const { error } = await this.supabase
          .from("draft_pool")
          .insert(batch)

        if (error) {
          this.error(`Failed to insert batch ${i / batchSize + 1}`, error)
        } else {
          this.recordsProcessed += batch.length
        }
      }

      this.log(`Stored ${this.recordsProcessed} Pokemon in draft pool`)
    } catch (error) {
      this.error("Failed to store draft pool", error)
    }
  }

  /**
   * Get column letter from index (0 = A, 1 = B, etc.)
   */
  private getColumnLetter(index: number): string {
    let result = ""
    let num = index
    while (num >= 0) {
      result = String.fromCharCode(65 + (num % 26)) + result
      num = Math.floor(num / 26) - 1
    }
    return result
  }
}
