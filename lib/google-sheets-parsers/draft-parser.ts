/**
 * Draft/Roster Parser
 * Handles parsing of draft board data with snake draft logic
 */

import { BaseParser, ParserConfig, ParserResult } from "./base-parser"

export class DraftParser extends BaseParser {
  // Mapping from point values to actual team names
  private teamNameMapping: Map<number, string> = new Map()

  async parse(): Promise<ParserResult> {
    this.log(`Parsing draft board from sheet "${this.sheet.title}"`)

    try {
      // First, try to extract team name mapping from Draft Results table
      await this.extractDraftResultsMapping()
      // Detect grid structure (rounds × teams)
      const gridStructure = await this.detectGridStructure()
      
      if (!gridStructure.isValid) {
        this.error("Could not detect valid draft board grid structure")
        return this.getResult()
      }

      // Map team columns (point value columns)
      const teamMapping = await this.mapTeamColumns(gridStructure)
      this.log(`Team mapping result: ${teamMapping.length} teams found`)
      if (teamMapping.length > 0) {
        this.log(`Teams: ${teamMapping.map(t => `${t.teamName} (${t.pointValue}pts)@col${t.columnIndex + 1}`).join(", ")}`)
      }
      
      if (teamMapping.length === 0) {
        this.error("Could not identify team columns with point values")
        return this.getResult()
      }

      // Extract picks from point value columns
      const picks = await this.extractPicks(gridStructure, teamMapping)
      
      if (picks.length === 0) {
        this.warn("No draft picks found in grid")
        return this.getResult()
      }

      // Apply snake draft logic to calculate pick order
      const picksWithOrder = this.applySnakeDraftLogic(picks, teamMapping.length)
      
      // Refine team name mapping after we have team mapping
      // This ensures we can match point values to team names accurately
      if (this.teamNameMapping.size > 0 && teamMapping.length > 0) {
        // Extract point values from team mapping (sorted descending)
        const pointValues = teamMapping.map(t => t.pointValue).sort((a, b) => b - a)
        const teamNames = Array.from(this.teamNameMapping.values())
        
        // Re-map: match team names to actual point values from teamMapping
        // Clear old mapping and create new one with actual point values
        this.teamNameMapping.clear()
        for (let i = 0; i < Math.min(teamNames.length, pointValues.length); i++) {
          this.teamNameMapping.set(pointValues[i], teamNames[i])
        }
        
        this.log(`Refined team name mapping: ${this.teamNameMapping.size} teams matched to point values`)
      } else if (this.teamNameMapping.size === 0 && teamMapping.length > 0) {
        // Fallback: try to extract Draft Results mapping again
        await this.extractDraftResultsMapping()
      }

      // Upsert draft picks to database
      await this.upsertDraftPicks(picksWithOrder)

      this.log(`Successfully parsed ${picksWithOrder.length} draft picks`)
      return this.getResult()
    } catch (error) {
      this.error("Failed to parse draft board", error)
      return this.getResult()
    }
  }

  /**
   * Detect grid structure (identify rounds and teams dimensions)
   */
  private async detectGridStructure(): Promise<{
    isValid: boolean
    roundsAreRows: boolean
    teamsAreColumns: boolean
    roundColumn?: number
    teamRow?: number
    dataStartRow: number
    dataStartCol: number
  }> {
    // Try getRows() first (doesn't require Drive scope)
    // Load enough rows to see Pokemon (they start at row 5) and enough columns to include team columns (up to column AD/30)
    const maxRows = Math.min(this.sheet.rowCount, 200) // Load more rows to see Pokemon
    const maxCols = Math.min(this.sheet.columnCount, 35) // Load enough columns (team columns go up to AD/30)
    const range = `A1:${this.getColumnLetter(maxCols)}${maxRows}`
    
    // Try to load data using raw API (doesn't require Drive scope)
    let loadedCells = false
    
    try {
      // First try getRows() if headers exist
      await this.sheet.loadHeaderRow()
      await this.sheet.getRows({ limit: maxRows })
      loadedCells = true
    } catch (headerError: any) {
      // No headers, use raw Google Sheets API
      this.warn("No headers found, using raw API for grid detection")
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
        
        // Store values for later use
        const values = response.data.values || []
        // Store raw values array for helper methods
        const sheetAny = this.sheet as any
        sheetAny._rawValues = values
        // Create a mock cell structure for grid detection
        for (let rowIdx = 0; rowIdx < Math.min(values.length, maxRows); rowIdx++) {
          const row = values[rowIdx] || []
          for (let col = 0; col < Math.min(row.length, maxCols); col++) {
            // Store in a way that getCell() can access
            if (!this.sheet._cells) {
              this.sheet._cells = {}
            }
            const cellKey = `${rowIdx}_${col}`
            this.sheet._cells[cellKey] = {
              value: row[col] || null,
              formattedValue: String(row[col] || ""),
            }
          }
        }
        loadedCells = true
      } catch (apiError: any) {
        this.error("Failed to load data using raw API", apiError)
        throw apiError
      }
    }
    
    if (!loadedCells) {
      throw new Error("Could not load sheet data")
    }

    // Try to detect structure by looking for:
    // 1. Round indicators in first column (rows) or first row (columns)
    // 2. Team names in first row (columns) or first column (rows)

    let roundsAreRows = false
    let teamsAreColumns = false
    let roundColumn = 0
    let teamRow = 0
    let dataStartRow = 1
    let dataStartCol = 1

    // Check first column for round indicators
    const firstColHasRounds = this.checkColumnForRounds(0)
    // Check first row for team names
    const firstRowHasTeams = this.checkRowForTeams(0)

    if (firstColHasRounds && firstRowHasTeams) {
      // Standard format: rounds as rows, teams as columns
      roundsAreRows = true
      teamsAreColumns = true
      roundColumn = 0
      teamRow = 0
      dataStartRow = 1
      dataStartCol = 1
    } else if (firstRowHasTeams) {
      // Teams in first row, rounds likely in rows
      roundsAreRows = true
      teamsAreColumns = true
      roundColumn = 0
      teamRow = 0
      dataStartRow = 1
      dataStartCol = 1
    } else {
      // Try alternative: teams as rows, rounds as columns
      const firstRowHasRounds = this.checkRowForRounds(0)
      const firstColHasTeams = this.checkColumnForTeams(0)
      
      if (firstRowHasRounds && firstColHasTeams) {
        roundsAreRows = false
        teamsAreColumns = false
        roundColumn = 0
        teamRow = 0
        dataStartRow = 1
        dataStartCol = 1
      } else {
        // Could not detect structure - log what we found
        this.warn(`Could not detect grid structure. firstRowHasRounds=${firstRowHasRounds}, firstColHasTeams=${firstColHasTeams}`)
        // Try a more lenient approach: assume standard format if we have any data
        const rawValues = (this.sheet as any)._rawValues
        // Check if any row has data (not just first row, as first row might be empty)
        const hasData = rawValues && rawValues.length > 1 && rawValues.some((row: any[]) => Array.isArray(row) && row.length > 1)
        this.log(`Lenient detection check: rawValues exists=${!!rawValues}, length=${rawValues?.length || 0}, hasData=${hasData}`)
        if (hasData) {
          // Find first non-empty row for team detection
          let teamRow = 0
          for (let i = 0; i < Math.min(rawValues.length, 10); i++) {
            if (rawValues[i] && rawValues[i].length > 1) {
              teamRow = i
              break
            }
          }
          this.log(`Attempting lenient detection: assuming rounds as rows, teams as columns (teamRow=${teamRow})`)
          return {
            isValid: true,
            roundsAreRows: true,
            teamsAreColumns: true,
            roundColumn: 0,
            teamRow: teamRow,
            dataStartRow: teamRow + 1,
            dataStartCol: 1,
          }
        } else {
          this.warn(`Lenient detection failed: no data rows found`)
        }
        return { isValid: false, roundsAreRows: false, teamsAreColumns: false, dataStartRow: 1, dataStartCol: 1 }
      }
    }

    return {
      isValid: true,
      roundsAreRows,
      teamsAreColumns,
      roundColumn,
      teamRow,
      dataStartRow,
      dataStartCol,
    }
  }

  /**
   * Check if a column contains round indicators
   */
  private checkColumnForRounds(columnIndex: number): boolean {
    let roundCount = 0
    // Use raw values if available, otherwise try getCell()
    const rawValues = (this.sheet as any)._rawValues
    if (rawValues && Array.isArray(rawValues)) {
      for (let row = 1; row < Math.min(rawValues.length, 20); row++) {
        const rowData = rawValues[row] || []
        const value = String(rowData[columnIndex] || "").toLowerCase()
        if (value.match(/^(round|r)\s*\d+$/i) || (value.match(/^\d+$/) && parseInt(value) > 0 && parseInt(value) < 50)) {
          roundCount++
        }
      }
    } else {
      // Fallback to getCell()
      for (let row = 1; row < Math.min(this.sheet.rowCount, 20); row++) {
        try {
          const cell = this.sheet.getCell(row, columnIndex)
          const value = String(cell.value || "").toLowerCase()
          if (value.match(/^(round|r)\s*\d+$/i) || (value.match(/^\d+$/) && parseInt(value) > 0 && parseInt(value) < 50)) {
            roundCount++
          }
        } catch {
          continue
        }
      }
    }
    return roundCount >= 3 // At least 3 round indicators
  }

  /**
   * Check if a row contains team names
   */
  private checkRowForTeams(rowIndex: number): boolean {
    let teamCount = 0
    // Use raw values if available, otherwise try getCell()
    const rawValues = (this.sheet as any)._rawValues
    if (rawValues && Array.isArray(rawValues) && rawValues[rowIndex]) {
      const rowData = rawValues[rowIndex] || []
      for (let col = 1; col < Math.min(rowData.length, 20); col++) {
        const value = String(rowData[col] || "").trim()
        // Team names are usually non-numeric, non-empty strings
        if (value && !value.match(/^\d+$/) && value.length > 1 && value.length < 50) {
          teamCount++
        }
      }
    } else {
      // Fallback to getCell()
      for (let col = 1; col < Math.min(this.sheet.columnCount, 20); col++) {
        try {
          const cell = this.sheet.getCell(rowIndex, col)
          const value = String(cell.value || "").trim()
          // Team names are usually non-numeric, non-empty strings
          if (value && !value.match(/^\d+$/) && value.length > 1 && value.length < 50) {
            teamCount++
          }
        } catch {
          continue
        }
      }
    }
    return teamCount >= 3 // At least 3 team names
  }

  /**
   * Check if a row contains round indicators
   */
  private checkRowForRounds(rowIndex: number): boolean {
    let roundCount = 0
    // Use raw values if available, otherwise try getCell()
    const rawValues = (this.sheet as any)._rawValues
    if (rawValues && Array.isArray(rawValues) && rawValues[rowIndex]) {
      const rowData = rawValues[rowIndex] || []
      for (let col = 1; col < Math.min(rowData.length, 20); col++) {
        const value = String(rowData[col] || "").toLowerCase()
        if (value.match(/^(round|r)\s*\d+$/i) || (value.match(/^\d+$/) && parseInt(value) > 0 && parseInt(value) < 50)) {
          roundCount++
        }
      }
    } else {
      // Fallback to getCell()
      for (let col = 1; col < Math.min(this.sheet.columnCount, 20); col++) {
        try {
          const cell = this.sheet.getCell(rowIndex, col)
          const value = String(cell.value || "").toLowerCase()
          if (value.match(/^(round|r)\s*\d+$/i) || (value.match(/^\d+$/) && parseInt(value) > 0 && parseInt(value) < 50)) {
            roundCount++
          }
        } catch {
          continue
        }
      }
    }
    return roundCount >= 3
  }

  /**
   * Check if a column contains team names
   */
  private checkColumnForTeams(columnIndex: number): boolean {
    let teamCount = 0
    // Use raw values if available, otherwise try getCell()
    const rawValues = (this.sheet as any)._rawValues
    if (rawValues && Array.isArray(rawValues)) {
      for (let row = 1; row < Math.min(rawValues.length, 20); row++) {
        const rowData = rawValues[row] || []
        const value = String(rowData[columnIndex] || "").trim()
        if (value && !value.match(/^\d+$/) && value.length > 1 && value.length < 50) {
          teamCount++
        }
      }
    } else {
      // Fallback to getCell()
      for (let row = 1; row < Math.min(this.sheet.rowCount, 20); row++) {
        try {
          const cell = this.sheet.getCell(row, columnIndex)
          const value = String(cell.value || "").trim()
          if (value && !value.match(/^\d+$/) && value.length > 1 && value.length < 50) {
            teamCount++
          }
        } catch {
          continue
        }
      }
    }
    return teamCount >= 3
  }

  /**
   * Map point value columns to teams
   * Looks for "X Points" headers in row 3 (index 2)
   * Pattern: J3=20 points, M3=19 points, P3=18 points (every 3 columns starting from column J/10)
   */
  private async mapTeamColumns(gridStructure: any): Promise<Array<{ columnIndex: number; teamName: string; pointValue: number }>> {
    const teamMapping: Array<{ columnIndex: number; teamName: string; pointValue: number }> = []
    const rawValues = (this.sheet as any)._rawValues

    // Row 3 (index 2) contains point value headers
    const headerRow = 2 // Row 3, 0-indexed
    
    if (rawValues && rawValues[headerRow]) {
      const rowData = rawValues[headerRow] || []
      
      // Scan row 3 for "X Points" pattern
      for (let col = 0; col < Math.min(rowData.length, 75); col++) {
        const cellValue = String(rowData[col] || "").trim()
        
        // Match "X Points" or "X Point" pattern (e.g., "20 Points", "19 Points")
        const pointMatch = cellValue.match(/(\d+)\s*points?/i)
        if (pointMatch) {
          const pointValue = parseInt(pointMatch[1])
          const teamName = `Team ${pointValue} Points`
          
          // Based on inspection: headers are at I, L, O (indices 8, 11, 14)
          // But Pokemon are at J, M, P (indices 9, 12, 15) - one column after
          // User said J3=20 points, so if we detect header at I (col 8), Pokemon are at J (col 9)
          const pokemonColumnIndex = col + 1
          
          teamMapping.push({
            columnIndex: pokemonColumnIndex, // Pokemon column, not header column
            teamName,
            pointValue,
          })
          
          this.log(`Found team header at ${this.getColumnLetter(col + 1)}${headerRow + 1} = ${pointValue} Points, Pokemon at ${this.getColumnLetter(pokemonColumnIndex + 1)}`)
        }
      }
      
      // Sort by point value (descending - higher points = earlier draft position)
      teamMapping.sort((a, b) => b.pointValue - a.pointValue)
      
      this.log(`Mapped ${teamMapping.length} team columns based on point values`)
    } else {
      this.warn("Could not read row 3 for point value headers")
    }

    return teamMapping
  }

  /**
   * Extract picks from point value columns
   * Pokemon appear in team columns starting at row 5 (index 4)
   * Drafted Pokemon are removed/struck out (empty cells)
   */
  private async extractPicks(
    gridStructure: any,
    teamMapping: Array<{ columnIndex: number; teamName: string; pointValue: number }>
  ): Promise<Array<{ round: number; teamName: string; pokemonName: string; pointValue: number; row: number; col: number }>> {
    const picks: Array<{ round: number; teamName: string; pokemonName: string; pointValue: number; row: number; col: number }> = []
    const rawValues = (this.sheet as any)._rawValues

    if (!rawValues || !Array.isArray(rawValues)) {
      this.error("Raw values not available for pick extraction")
      return picks
    }

    // Pokemon start at row 5 (index 4), after headers at row 3 (index 2) and empty row 4 (index 3)
    const pokemonStartRow = 4 // Row 5, 0-indexed
    const maxRow = Math.min(rawValues.length, 421)

    this.log(`Extracting picks: pokemonStartRow=${pokemonStartRow} (row ${pokemonStartRow + 1}), maxRow=${maxRow}, teamColumns=${teamMapping.map(t => `${this.getColumnLetter(t.columnIndex + 1)}${t.columnIndex}`).join(", ")}`)

    // Track picks per team to calculate round numbers
    const picksPerTeam = new Map<number, number>() // team index -> pick count
    
    // Extract Pokemon from each team column
    for (let row = pokemonStartRow; row < maxRow; row++) {
      if (!rawValues[row]) {
        continue
      }
      
      const rowData = rawValues[row] || []
      
      // Check each team column for Pokemon names
      for (let teamIdx = 0; teamIdx < teamMapping.length; teamIdx++) {
        const team = teamMapping[teamIdx]
        
        // Debug: log first few rows to see what we're reading
        if (row < pokemonStartRow + 3 && teamIdx < 3) {
          this.log(`Row ${row + 1}, Team ${teamIdx} (col ${team.columnIndex}): rowData.length=${rowData.length}, value="${rowData[team.columnIndex] || ''}"`)
        }
        
        // Check if column index is within bounds
        if (team.columnIndex >= rowData.length) {
          if (row < pokemonStartRow + 3 && teamIdx < 3) {
            this.log(`Skipping team ${teamIdx}: column ${team.columnIndex} >= rowData.length ${rowData.length}`)
          }
          continue
        }
        
        // Debug: check what's actually at this column
        const rawValue = rowData[team.columnIndex]
        const pokemonName = String(rawValue || "").trim()
        
        if (row < pokemonStartRow + 3 && teamIdx < 3) {
          this.log(`Row ${row + 1}, Team ${teamIdx}: col ${team.columnIndex} (${this.getColumnLetter(team.columnIndex + 1)}), raw="${rawValue}", trimmed="${pokemonName}"`)
        }
        
        // Skip empty cells (drafted Pokemon are removed/struck out)
        if (!pokemonName || pokemonName.length === 0) {
          continue
        }
        
        // Validate Pokemon name: capitalized, 3-30 chars, not numbers, not "Points", not "Banned"
        const lengthCheck = pokemonName.length >= 3 && pokemonName.length <= 30
        const notNumber = !pokemonName.match(/^\d+$/)
        const notPoints = !pokemonName.match(/\d+\s*points?/i)
        const notBanned = !pokemonName.match(/banned/i) && !pokemonName.match(/tera\s*banned/i)
        const isCapitalized = pokemonName.length > 0 && pokemonName[0] === pokemonName[0].toUpperCase()
        
        const isValidPokemon = lengthCheck && notNumber && notPoints && notBanned && isCapitalized
        
        // Always log validation for first few rows to debug
        if (row < pokemonStartRow + 3 && teamIdx < 3) {
          this.log(`Validating "${pokemonName}" at row ${row + 1}, col ${this.getColumnLetter(team.columnIndex + 1)}: length=${lengthCheck}(${pokemonName.length}), notNum=${notNumber}, notPts=${notPoints}, notBan=${notBanned}, cap=${isCapitalized}, valid=${isValidPokemon}`)
        }
        
        if (!isValidPokemon) {
          continue
        }
        
        // Calculate round: each team picks once per round
        // Round = (pick count for this team) + 1
        const currentPickCount = picksPerTeam.get(teamIdx) || 0
        const round = currentPickCount + 1
        picksPerTeam.set(teamIdx, round)
        
        // Debug: log before push
        if (row < pokemonStartRow + 3 && teamIdx < 3) {
          this.log(`Adding pick: "${pokemonName}" → ${team.teamName} (${team.pointValue}pts, round ${round}, row ${row + 1}, col ${this.getColumnLetter(team.columnIndex + 1)})`)
        }
        
        picks.push({
          round,
          teamName: team.teamName,
          pokemonName,
          pointValue: team.pointValue,
          row,
          col: team.columnIndex,
        })
        
        this.log(`Found pick: ${pokemonName} → ${team.teamName} (${team.pointValue}pts, round ${round}, row ${row + 1}, col ${this.getColumnLetter(team.columnIndex + 1)})`)
      }
    }
    
    this.log(`Extracted ${picks.length} picks from ${teamMapping.length} team columns`)
    return picks
  }

  /**
   * Apply snake draft logic to calculate pick order
   */
  private applySnakeDraftLogic(
    picks: Array<{ round: number; teamName: string; pokemonName: string; row: number; col: number }>,
    teamCount: number
  ): Array<{
    round: number
    teamName: string
    pokemonName: string
    pickOrder: number
    overallPick: number
  }> {
    // Group picks by round
    const picksByRound = new Map<number, typeof picks>()
    for (const pick of picks) {
      if (!picksByRound.has(pick.round)) {
        picksByRound.set(pick.round, [])
      }
      picksByRound.get(pick.round)!.push(pick)
    }

    const picksWithOrder: Array<{
      round: number
      teamName: string
      pokemonName: string
      pickOrder: number
      overallPick: number
    }> = []

    let overallPickCounter = 1

    // Process each round
    for (const [round, roundPicks] of picksByRound.entries()) {
      const isOddRound = round % 2 === 1
      
      // Sort picks by column position (team order)
      const sortedPicks = [...roundPicks].sort((a, b) => a.col - b.col)

      // Calculate pick order within round
      for (let i = 0; i < sortedPicks.length; i++) {
        const pick = sortedPicks[i]
        let pickOrder: number

        if (isOddRound) {
          // Normal order: 1, 2, 3, ..., teamCount
          pickOrder = i + 1
        } else {
          // Reverse order: teamCount, teamCount-1, ..., 1
          pickOrder = sortedPicks.length - i
        }

        picksWithOrder.push({
          round: pick.round,
          teamName: pick.teamName,
          pokemonName: pick.pokemonName,
          pickOrder,
          overallPick: overallPickCounter++,
        })
      }
    }

    return picksWithOrder.sort((a, b) => a.overallPick - b.overallPick)
  }

  /**
   * Extract team name mapping from Draft Results table (if present)
   * Looks for "Draft Results" section starting around row 92
   * Extracts team names from column headers and matches to point values
   */
  private async extractDraftResultsMapping(): Promise<void> {
    try {
      // Use raw API to read Draft Results section
      const { google } = await import("googleapis")
      const { getGoogleServiceAccountCredentials } = await import("../utils/google-sheets")
      
      const credentials = getGoogleServiceAccountCredentials()
      if (!credentials) {
        return // Skip if credentials not available
      }
      
      const { JWT } = await import("google-auth-library")
      const serviceAccountAuth = new JWT({
        email: credentials.email,
        key: credentials.privateKey,
        scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
      })
      
      const sheets = google.sheets({ version: "v4", auth: serviceAccountAuth })
      
      // Read broader range to find Draft Results header and team names
      // Draft Results typically starts around row 92, but search more broadly
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.sheet._spreadsheet.spreadsheetId,
        range: `${this.sheet.title}!A85:Z105`,
      })
      
      const values = response.data.values || []
      if (values.length === 0) {
        this.log("No Draft Results table found, will use point-based team names")
        return
      }
      
      // Find "Draft Results" header row - search more broadly
      let headerRowIdx = -1
      for (let i = 0; i < Math.min(values.length, 20); i++) {
        const row = values[i] || []
        // Check first few cells for "Draft Results" or "Round"
        for (let col = 0; col < Math.min(row.length, 3); col++) {
          const cellValue = String(row[col] || "").toLowerCase()
          if (cellValue.includes("draft results") || (cellValue.includes("round") && col === 0)) {
            headerRowIdx = i
            break
          }
        }
        if (headerRowIdx !== -1) break
      }
      
      if (headerRowIdx === -1) {
        this.log("Could not find Draft Results header, will use point-based team names")
        return
      }
      
      // Extract team names from the row after header (usually row 93, index headerRowIdx + 1)
      // Also try the header row itself in case team names are there
      const candidateRows = [
        values[headerRowIdx + 1] || [], // Row after header (most common)
        values[headerRowIdx] || [],     // Header row itself (if team names are there)
        values[headerRowIdx + 2] || [], // Two rows after (fallback)
      ]
      
      let teamNames: string[] = []
      
      // Try each candidate row
      for (const teamNamesRow of candidateRows) {
        const extractedNames: string[] = []
        
        // Skip first column (usually "Round"), extract team names
        for (let col = 1; col < teamNamesRow.length; col++) {
          const teamName = String(teamNamesRow[col] || "").trim()
          if (teamName && teamName.length > 2 && teamName.length < 50) {
            // Skip if it's a number, "Round", or common non-team values
            if (!teamName.match(/^\d+$/) && 
                !teamName.match(/^round$/i) &&
                !teamName.match(/^team\s*\d+$/i) &&
                !teamName.match(/^\d+\s*points?$/i)) {
              extractedNames.push(teamName)
            }
          }
        }
        
        // Use the row with the most team names (likely the correct one)
        if (extractedNames.length > teamNames.length) {
          teamNames = extractedNames
        }
      }
      
      if (teamNames.length === 0) {
        this.log("No team names found in Draft Results, will use point-based team names")
        return
      }
      
      this.log(`Found ${teamNames.length} team names in Draft Results: ${teamNames.slice(0, 5).join(", ")}...`)
      
      // Match team names to point values
      // Strategy: Match by draft order (first team = highest points, etc.)
      // We'll refine this after we have teamMapping from mapTeamColumns
      // For now, assume point values start at 20 and decrease
      const maxPointValue = 20
      const pointValues = Array.from({ length: teamNames.length }, (_, i) => maxPointValue - i)
      
      // Create mapping: teamNames[i] → pointValues[i]
      // This assumes Draft Results columns are in draft order (highest points first)
      // This will be refined when we have actual teamMapping
      for (let i = 0; i < Math.min(teamNames.length, pointValues.length); i++) {
        this.teamNameMapping.set(pointValues[i], teamNames[i])
      }
      
      this.log(`Created initial team name mapping: ${teamNames.length} teams mapped to point values ${pointValues[0]} to ${pointValues[pointValues.length - 1]}`)
      
      this.log(`Created team name mapping: ${Array.from(this.teamNameMapping.entries()).slice(0, 3).map(([pts, name]) => `${pts}pts → ${name}`).join(", ")}...`)
    } catch (error) {
      this.warn("Failed to extract Draft Results mapping, will use point-based team names", error)
    }
  }

  /**
   * Upsert draft picks to team_rosters table
   * Includes point values for point-based draft system
   */
  private async upsertDraftPicks(
    picks: Array<{
      round: number
      teamName: string
      pokemonName: string
      pointValue: number
      pickOrder: number
      overallPick: number
    }>
  ): Promise<void> {
    for (const pick of picks) {
      try {
        // Get actual team name from mapping if available
        let actualTeamName = pick.teamName
        if (this.teamNameMapping.has(pick.pointValue)) {
          actualTeamName = this.teamNameMapping.get(pick.pointValue)!
          this.log(`Mapped ${pick.teamName} (${pick.pointValue}pts) → ${actualTeamName}`)
        }
        
        // Get team ID - try multiple matching strategies
        // Strategy 1: Exact match with actual team name (from mapping or point-based)
        let team = null
        let { data: teamData } = await this.supabase
          .from("teams")
          .select("id, name")
          .eq("name", actualTeamName)
          .limit(1)
          .single()

        if (teamData) {
          team = teamData
        } else {
          // Strategy 2: Try point-based name as fallback
          if (actualTeamName !== pick.teamName) {
            const { data: fallbackTeam } = await this.supabase
              .from("teams")
              .select("id, name")
              .eq("name", pick.teamName)
              .limit(1)
              .single()
            
            if (fallbackTeam) {
              team = fallbackTeam
            }
          }
          
          // Strategy 3: Create team if it doesn't exist
          if (!team) {
            try {
              const { data: newTeam, error: createError } = await this.supabase
                .from("teams")
                .insert({
                  name: actualTeamName,
                  coach_name: "Unknown", // Will be updated from Team Pages
                  division: "Unknown", // Will be updated from Master Data
                  conference: "Unknown", // Will be updated from Master Data
                })
                .select("id, name")
                .single()

              if (createError) {
                // If creation fails (e.g., unique constraint), try to find again
                const { data: foundTeam } = await this.supabase
                  .from("teams")
                  .select("id, name")
                  .eq("name", actualTeamName)
                  .limit(1)
                  .single()
                
                if (foundTeam) {
                  team = foundTeam
                } else {
                  this.warn(`Team "${actualTeamName}" not found and could not be created: ${createError.message}`)
                  continue
                }
              } else {
                team = newTeam
                this.log(`Created team "${actualTeamName}" for draft picks`)
              }
            } catch (error: any) {
              this.warn(`Failed to create/find team "${actualTeamName}": ${error.message}`)
              continue
            }
          }
        }

        // Get Pokemon ID from cache with improved name matching
        // Try multiple search patterns for better matching
        const searchPatterns = [
          pick.pokemonName, // Exact match first
          pick.pokemonName.replace(/\s+/g, "-"), // Replace spaces with hyphens
          pick.pokemonName.replace(/\s+/g, ""), // Remove spaces
          pick.pokemonName.toLowerCase(), // Lowercase
        ]

        let pokemon = null
        for (const pattern of searchPatterns) {
          const { data: foundPokemon } = await this.supabase
            .from("pokemon_cache")
            .select("id, name")
            .ilike("name", `%${pattern}%`)
            .limit(1)
            .single()

          if (foundPokemon) {
            pokemon = foundPokemon
            break
          }
        }

        // If still not found, try searching without regional form indicators
        if (!pokemon) {
          const baseName = pick.pokemonName
            .replace(/\s*(hisuian|galarian|alolan|paldean|kantonian|johtonian|hoennian|sinnohan|unovan|kalosian|alolan)\s*/gi, "")
            .trim()
          
          if (baseName !== pick.pokemonName) {
            const { data: foundPokemon } = await this.supabase
              .from("pokemon_cache")
              .select("id, name")
              .ilike("name", `%${baseName}%`)
              .limit(1)
              .single()

            if (foundPokemon) {
              pokemon = foundPokemon
              this.log(`Found Pokemon "${foundPokemon.name}" using base name for "${pick.pokemonName}"`)
            }
          }
        }

        if (!pokemon) {
          this.warn(`Pokemon "${pick.pokemonName}" not found in cache after trying multiple patterns`)
          continue
        }

        // Upsert roster entry with point value
        const { error: rosterError } = await this.supabase.from("team_rosters").upsert(
          {
            team_id: team.id,
            pokemon_id: pokemon.id,
            draft_round: pick.round,
            draft_order: pick.pickOrder,
            overall_pick: pick.overallPick,
            draft_points: pick.pointValue, // Store point value
          },
          {
            onConflict: "team_id,pokemon_id",
          }
        )

        if (rosterError) {
          this.error(`Failed to upsert draft pick for ${pick.teamName} - ${pick.pokemonName}`, rosterError)
          continue
        }

        // Update draft budget (point spending)
        // Get or create current season first
        let { data: currentSeason } = await this.supabase
          .from("seasons")
          .select("id")
          .eq("is_current", true)
          .limit(1)
          .single()

        // Create default season if none exists
        if (!currentSeason) {
          const { data: newSeason, error: seasonError } = await this.supabase
            .from("seasons")
            .insert({
              name: "Season 1",
              start_date: new Date().toISOString().split("T")[0],
              is_current: true,
            })
            .select("id")
            .single()

          if (seasonError) {
            this.warn(`Failed to create default season: ${seasonError.message}`)
          } else {
            currentSeason = newSeason
            this.log("Created default season for draft budget tracking")
          }
        }

        if (currentSeason) {
          // Get or create draft budget
          const { data: budget } = await this.supabase
            .from("draft_budgets")
            .select("id, spent_points, total_points, remaining_points")
            .eq("team_id", team.id)
            .eq("season_id", currentSeason.id)
            .limit(1)
            .single()

          if (budget) {
            // Validate point spending before updating budget
            const newSpentPoints = (budget.spent_points || 0) + pick.pointValue
            const remainingPoints = budget.remaining_points || (budget.total_points - (budget.spent_points || 0))
            
            if (pick.pointValue > remainingPoints) {
              this.warn(
                `Pick "${pick.pokemonName}" (${pick.pointValue}pts) would exceed budget for ${actualTeamName}. ` +
                `Remaining: ${remainingPoints}pts, Required: ${pick.pointValue}pts`
              )
              // Continue anyway (don't reject), but log warning
            }

            // Update spent points
            const { error: budgetError } = await this.supabase
              .from("draft_budgets")
              .update({ spent_points: newSpentPoints })
              .eq("id", budget.id)

            if (budgetError) {
              this.warn(`Failed to update draft budget: ${budgetError.message}`)
            } else {
              this.log(`Updated budget for ${actualTeamName}: spent ${newSpentPoints}/${budget.total_points}pts`)
            }
          } else {
            // Create new budget (default 120 points total)
            const { error: createBudgetError } = await this.supabase
              .from("draft_budgets")
              .insert({
                team_id: team.id,
                season_id: currentSeason.id,
                total_points: 120, // Default budget
                spent_points: pick.pointValue,
              })

            if (createBudgetError) {
              this.warn(`Failed to create draft budget: ${createBudgetError.message}`)
            } else {
              this.log(`Created budget for ${actualTeamName}: spent ${pick.pointValue}/120pts`)
            }
          }
        }

        this.recordsProcessed++
      } catch (error) {
        this.error(`Error processing draft pick for ${pick.teamName}`, error)
      }
    }
  }
}
