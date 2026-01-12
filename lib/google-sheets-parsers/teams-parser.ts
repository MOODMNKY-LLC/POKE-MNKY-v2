/**
 * Teams/Standings Parser
 * Handles parsing of team standings data with AI support for unstructured data
 */

import { BaseParser, ParserConfig, ParserResult } from "./base-parser"
import { parseTeamDataWithAI, type SheetRow } from "../ai-sheet-parser"

export class TeamsParser extends BaseParser {
  async parse(): Promise<ParserResult> {
    this.log(`Parsing teams from sheet "${this.sheet.title}"`)

    try {
      const headers = await this.loadHeaders()
      const rows = await this.getAllRows()

      if (rows.length === 0) {
        this.warn("No rows found in sheet")
        return this.getResult()
      }

      this.log(`Found ${rows.length} rows`)

      // Determine if we should use AI parsing
      const useAI = this.config.use_ai || 
                    headers.length === 0 || 
                    this.hasSpecialHandling("no_headers") ||
                    (headers.length > 0 && headers.some(h => h.toLowerCase().includes("week") && !h.toLowerCase().includes("team")))

      if (useAI && rows.length > 5) {
        return await this.parseWithAI(headers, rows)
      } else {
        return await this.parseManually(headers, rows)
      }
    } catch (error) {
      this.error("Failed to parse teams", error)
      return this.getResult()
    }
  }

  /**
   * Parse using AI for unstructured data
   */
  private async parseWithAI(headers: string[], rows: any[]): Promise<ParserResult> {
    this.log("Using AI-powered parsing")

    try {
      // Get existing teams for context
      const { data: existingTeams } = await this.supabase
        .from("teams")
        .select("name, division, conference")
        .limit(50)

      // Prepare rows for AI
      const sheetRows: SheetRow[] = []
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        let rawData: any[] = []

        if (row._rawData) {
          rawData = row._rawData
        } else if (headers.length > 0) {
          rawData = headers.map((header) => {
            try {
              return row.get ? row.get(header) : row[header] || ""
            } catch (e) {
              return ""
            }
          })
        }

        // Skip header row
        if (i === 0 && rawData.length > 0) {
          const firstCell = String(rawData[0] || "").toLowerCase()
          if (firstCell.includes("team") && firstCell.includes("name")) {
            continue
          }
        }

        sheetRows.push({
          rawData,
          rowIndex: i,
          headers,
        })
      }

      // Parse with AI
      const aiResult = await parseTeamDataWithAI(sheetRows, {
        sheetName: this.sheet.title,
        existingTeams: existingTeams || [],
      })

      if (aiResult.teams.length === 0) {
        this.warn("AI parsing returned no teams, falling back to manual parsing")
        return await this.parseManually(headers, rows)
      }

      this.log(`AI parsed ${aiResult.teams.length} teams`)

      // Upsert teams
      for (const teamData of aiResult.teams) {
        try {
          const { error } = await this.supabase.from("teams").upsert(
            {
              name: teamData.name,
              coach_name: teamData.coach_name,
              division: teamData.division,
              conference: teamData.conference,
              wins: teamData.wins,
              losses: teamData.losses,
              differential: teamData.differential,
              strength_of_schedule: teamData.strength_of_schedule,
            },
            { onConflict: "name" }
          )

          if (error) {
            this.error(`Failed to upsert team "${teamData.name}"`, error)
          } else {
            this.recordsProcessed++
            if (teamData.inferred_fields && teamData.inferred_fields.length > 0) {
              this.log(`AI inferred fields for "${teamData.name}":`, teamData.inferred_fields)
            }
          }
        } catch (error) {
          this.error(`Error upserting team "${teamData.name}"`, error)
        }
      }

      return this.getResult()
    } catch (error) {
      this.error("AI parsing failed", error)
      // Fall back to manual parsing
      return await this.parseManually(headers, rows)
    }
  }

  /**
   * Parse manually using column mapping
   */
  private async parseManually(headers: string[], rows: any[]): Promise<ParserResult> {
    this.log("Using manual parsing with column mapping")

    const columnMapping = this.config.column_mapping || {}

    for (const row of rows) {
      try {
        // Skip header row
        if (headers.length > 0) {
          const firstValue = this.getValue(row, "name", headers)
          if (String(firstValue || "").toLowerCase().includes("team name")) {
            continue
          }
        }

        const teamData: any = {
          name: this.getValue(row, "name", headers) || null,
          coach_name: this.getValue(row, "coach_name", headers) || "Unknown Coach",
          division: this.getValue(row, "division", headers) || null,
          conference: this.getValue(row, "conference", headers) || null,
          wins: parseInt(this.getValue(row, "wins", headers) || "0", 10) || 0,
          losses: parseInt(this.getValue(row, "losses", headers) || "0", 10) || 0,
          differential: parseInt(this.getValue(row, "differential", headers) || "0", 10) || 0,
          strength_of_schedule: parseFloat(this.getValue(row, "strength_of_schedule", headers) || "0") || 0,
        }

        if (!teamData.name) {
          continue
        }

        const { error } = await this.supabase.from("teams").upsert(teamData, {
          onConflict: "name",
        })

        if (error) {
          this.error(`Failed to upsert team "${teamData.name}"`, error)
        } else {
          this.recordsProcessed++
        }
      } catch (error) {
        this.error("Error processing row", error)
      }
    }

    return this.getResult()
  }

  /**
   * Get value from row using column mapping or direct access
   */
  private getValue(row: any, dbField: string, headers: string[]): any {
    // Try column mapping first
    if (this.config.column_mapping) {
      for (const [sheetCol, mappedField] of Object.entries(this.config.column_mapping)) {
        if (mappedField === dbField) {
          try {
            const value = row.get ? row.get(sheetCol) : row[sheetCol]
            if (value !== null && value !== undefined && value !== "") {
              return value
            }
          } catch (e) {
            // Try raw data access
            if (row._rawData && headers.length > 0) {
              const index = headers.indexOf(sheetCol)
              if (index >= 0 && row._rawData[index] !== null && row._rawData[index] !== "") {
                return row._rawData[index]
              }
            }
          }
        }
      }
    }

    // Fallback: try common column name variations
    const variations: Record<string, string[]> = {
      name: ["team", "team name", "name"],
      coach_name: ["coach", "coach name"],
      division: ["division", "div"],
      conference: ["conference", "conf"],
      wins: ["wins", "w"],
      losses: ["losses", "l", "loss"],
      differential: ["differential", "diff"],
    }

    const fieldVariations = variations[dbField] || []
    for (const variation of fieldVariations) {
      for (const header of headers) {
        if (header.toLowerCase().includes(variation)) {
          try {
            const value = row.get ? row.get(header) : row[header]
            if (value !== null && value !== undefined && value !== "") {
              return value
            }
          } catch (e) {
            // Try raw data
            if (row._rawData) {
              const index = headers.indexOf(header)
              if (index >= 0) {
                return row._rawData[index]
              }
            }
          }
        }
      }
    }

    // Raw data access fallback
    if (row._rawData && row._rawData.length > 0) {
      // Default position-based mapping
      if (dbField === "name") return row._rawData[0]
      if (dbField === "coach_name") return row._rawData[1] || "Unknown Coach"
      if (dbField === "division") return row._rawData[2]
    }

    return null
  }

  /**
   * Get result object
   */
  private getResult(): ParserResult {
    return {
      success: this.errors.length === 0,
      recordsProcessed: this.recordsProcessed,
      errors: this.errors,
      warnings: this.warnings.length > 0 ? this.warnings : undefined,
    }
  }
}
