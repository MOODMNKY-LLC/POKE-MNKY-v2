/**
 * Team Page Parser
 * Handles parsing of individual team pages with variable structure
 * Extracts roster, stats, trades, schedule, and images
 */

import { BaseParser, ParserConfig, ParserResult } from "./base-parser"
import { z } from "zod"
import { zodResponseFormat } from "openai/helpers/zod"
import { openai, AI_MODELS } from "../openai-client"
import { extractImagesFromSheet } from "../google-sheets-image-extractor"

// Schema for team page structure
const TeamSectionSchema = z.object({
  section_type: z.enum(["roster", "stats", "trades", "schedule", "header", "other"]),
  start_row: z.number().int(),
  end_row: z.number().int(),
  headers: z.array(z.string()).optional(),
  data: z.array(z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))).optional(), // Optional for OpenAI schema validation
})

const TeamPageSchema = z.object({
  team_name: z.string(),
  coach_name: z.string().optional(),
  sections: z.array(TeamSectionSchema),
  errors: z.array(z.string()).optional(),
})

export class TeamPageParser extends BaseParser {
  async parse(): Promise<ParserResult> {
    this.log(`Parsing team page from sheet "${this.sheet.title}"`)

    try {
      // Extract team name from structured format (A2:B2)
      const teamName = await this.extractTeamName()
      
      if (!teamName) {
        this.error("Could not extract team name from sheet")
        return this.getResult()
      }

      this.log(`Extracted team name: "${teamName}"`)

      // Extract coach name from structured format (A4:B4)
      const coachName = await this.extractCoachName()
      if (coachName) {
        this.log(`Extracted coach name: "${coachName}"`)
      }

      // Extract draft picks from structured format (Columns C-E, rows 1-11)
      const draftPicks = await this.extractDraftPicks()
      if (draftPicks.length > 0) {
        this.log(`Extracted ${draftPicks.length} draft picks`)
        this.recordsProcessed += draftPicks.length
      }

      // Process structured data first (team name, coach, draft picks)
      await this.processStructuredData(teamName, coachName, draftPicks)

      // Try to detect additional sections using AI (for stats, trades, schedule)
      // This is optional - if it fails, we still have the structured data
      try {
        const pageStructure = await this.detectSections(teamName)
        const images = await this.extractTeamImages(teamName)
        if (pageStructure.sections.length > 0) {
          await this.processSections(teamName, pageStructure.sections, images)
        }
      } catch (error) {
        this.warn("AI section detection failed or skipped, but structured data was processed", error)
      }

      return this.getResult()
    } catch (error) {
      this.error("Failed to parse team page", error)
      return this.getResult()
    }
  }

  /**
   * Extract team name from structured format
   * A1:B1 = Team name header, A2:B2 = Team name value
   */
  private async extractTeamName(): Promise<string | null> {
    // Try to extract from sheet name first (e.g., "Team Name Roster" -> "Team Name")
    const sheetName = this.sheet.title
    const teamNameMatch = sheetName.match(/^(.+?)\s*(?:roster|page|sheet|team)$/i)
    if (teamNameMatch) {
      return teamNameMatch[1].trim()
    }

    // Try structured format: A2:B2 contains team name
    // Use raw API to avoid Drive scope requirement
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
        range: `${this.sheet.title}!A2:B2`,
      })
      
      const values = response.data.values || []
      if (values[0]) {
        const valueA2 = String(values[0][0] || "").trim()
        const valueB2 = String(values[0][1] || "").trim()
        const teamName = valueA2 || valueB2
        if (teamName && teamName.length > 1 && teamName.length < 50) {
          return teamName
        }
      }
    } catch (error) {
      this.warn("Could not load cells for team name extraction, trying fallback", error)
    }

    // Fallback: try to extract from first few rows using raw API
    try {
      const { google } = await import("googleapis")
      const { getGoogleServiceAccountCredentials } = await import("../utils/google-sheets")
      const credentials = getGoogleServiceAccountCredentials()
      if (credentials) {
        const { JWT } = await import("google-auth-library")
        const serviceAccountAuth = new JWT({
          email: credentials.email,
          key: credentials.privateKey,
          scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
        })
        const sheets = google.sheets({ version: "v4", auth: serviceAccountAuth })
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: this.sheet._spreadsheet.spreadsheetId,
          range: `${this.sheet.title}!A1:A5`,
        })
        const values = response.data.values || []
        for (let row = 0; row < values.length; row++) {
          const value = String(values[row]?.[0] || "").trim()
          if (value && value.length > 1 && value.length < 50 && !value.match(/^(roster|stats|trades|schedule|team|coach)$/i)) {
            return value
          }
        }
      }
    } catch (error) {
      // Ignore errors in fallback
    }

    return null
  }

  /**
   * Extract coach name from structured format
   * A3:B3 = Coach name header, A4:B4 = Coach name value
   */
  private async extractCoachName(): Promise<string | null> {
    try {
      // Use raw API to avoid Drive scope requirement
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
        range: `${this.sheet.title}!A4:B4`,
      })
      
      const values = response.data.values || []
      if (values[0]) {
        const valueA4 = String(values[0][0] || "").trim()
        const valueB4 = String(values[0][1] || "").trim()
        const coachName = valueA4 || valueB4
        if (coachName && coachName.length > 1 && coachName.length < 50) {
          return coachName
        }
      }
    } catch (error) {
      this.warn("Could not load cells for coach name extraction", error)
    }

    return null
  }

  /**
   * Extract draft picks from structured format
   * Columns C1:C11 = Draft picks with point values
   * Column D = Pokemon drafted
   * Column E = Pokemon point value
   */
  private async extractDraftPicks(): Promise<Array<{ pokemon: string; pointValue: number; round?: number }>> {
    const picks: Array<{ pokemon: string; pointValue: number; round?: number }> = []
    
    try {
      // Use raw API to avoid Drive scope requirement
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
        range: `${this.sheet.title}!C1:E11`,
      })
      
      const values = response.data.values || []
      
      // Read rows 1-11 (0-indexed: 0-10, but skip row 0 if it's header)
      // Row 0 (C1) might be header, so start from row 1 (C2)
      for (let rowIdx = 1; rowIdx < values.length && rowIdx <= 10; rowIdx++) {
        const row = values[rowIdx] || []
        
        // Column D = index 3 (0-indexed), Column E = index 4 (0-indexed)
        // But in the range C1:E11, columns are: C=0, D=1, E=2
        const pokemon = String(row[1] || "").trim() // Column D (index 1 in range C:E)
        const pointValueStr = String(row[2] || "").trim() // Column E (index 2 in range C:E)
        
        if (pokemon && pokemon.length > 0 && pointValueStr) {
          const pointValue = parseInt(pointValueStr)
          if (!isNaN(pointValue)) {
            picks.push({
              pokemon,
              pointValue,
              round: rowIdx, // Use row number as round estimate
            })
          }
        }
      }
    } catch (error) {
      this.warn("Could not load cells for draft picks extraction", error)
    }

    return picks
  }

  /**
   * Detect sections in team page using AI
   * Uses raw API to avoid Drive scope requirement
   */
  private async detectSections(teamName: string): Promise<z.infer<typeof TeamPageSchema>> {
    // Use raw API instead of loadCells to avoid Drive scope requirement
    const maxRows = Math.min(this.sheet.rowCount, 200)
    const maxCols = Math.min(this.sheet.columnCount, 30)
    const range = `A1:${this.getColumnLetter(maxCols)}${maxRows}`
    
    let cellData: Array<Array<any>> = []
    
    try {
      // Use raw Google Sheets API
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
      
      // Convert to cell data format for AI
      for (let rowIdx = 0; rowIdx < Math.min(values.length, maxRows); rowIdx++) {
        const row = values[rowIdx] || []
        const rowData: any[] = []
        for (let colIdx = 0; colIdx < Math.min(row.length, maxCols); colIdx++) {
          const value = row[colIdx]
          rowData.push({
            value,
            formattedValue: String(value || ""),
            isEmpty: value === null || value === undefined || value === "",
          })
        }
        cellData.push(rowData)
      }
    } catch (error: any) {
      // If raw API fails, return empty structure
      this.warn("Failed to load data for AI section detection", error)
      return {
        team_name: teamName,
        sections: [],
        errors: [`Data loading failed: ${error.message}`],
      }
    }

    const prompt = `Analyze this team page sheet and identify all sections.

Team Name: ${teamName}

Common sections in team pages:
1. **Header**: Team name, coach name, logo (usually first few rows)
2. **Roster**: Table with Pokemon names, types, stats
3. **Stats**: Key-value pairs (Wins: X, Losses: Y) or small table
4. **Trades**: Table with Pokemon available for trade
5. **Schedule**: Table with week, opponent, result columns

For each section:
- Identify section type
- Find boundaries (start_row, end_row)
- Extract headers if table format
- Extract data rows

Sheet data:
${JSON.stringify(cellData.slice(0, 100), null, 2)}

Return structured sections with extracted data.`

    try {
      const responseFormat = zodResponseFormat(TeamPageSchema, "team_page")
      
      // Add timeout to prevent infinite hangs (60 seconds for complex parsing)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("AI section detection timed out after 60 seconds")), 60000)
      )
      
      const apiPromise = openai.chat.completions.create({
        model: AI_MODELS.STRATEGY_COACH,
        messages: [
          {
            role: "system",
            content:
              "You are an expert at analyzing team page structures. Identify sections (roster, stats, trades, schedule), extract their boundaries, and parse their data.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: responseFormat,
        temperature: 0.3,
      })
      
      const response = await Promise.race([apiPromise, timeoutPromise]) as Awaited<typeof apiPromise>

      const message = response.choices[0].message
      const content = message.content

      if (!content) {
        throw new Error("No response from AI section detection")
      }

      const jsonData = JSON.parse(content)
      return TeamPageSchema.parse(jsonData)
    } catch (error) {
      this.error("AI section detection failed", error)
      return {
        team_name: teamName,
        sections: [],
        errors: [`AI detection failed: ${error instanceof Error ? error.message : "Unknown error"}`],
      }
    }
  }

  /**
   * Extract team images (logo, banner, avatar)
   */
  private async extractTeamImages(teamName: string): Promise<number> {
    try {
      // This would use the image extractor utility
      // For now, just return 0
      // TODO: Integrate with extractImagesFromSheet
      return 0
    } catch (error) {
      this.warn("Image extraction not yet implemented")
      return 0
    }
  }

  /**
   * Process each detected section
   */
  private async processSections(
    teamName: string,
    sections: z.infer<typeof TeamSectionSchema>[],
    imagesCount: number
  ): Promise<void> {
    // Get or create team
    let teamId: string | null = null
    const { data: existingTeam } = await this.supabase
      .from("teams")
      .select("id")
      .eq("name", teamName)
      .single()

    if (existingTeam) {
      teamId = existingTeam.id
    } else {
      // Create team if doesn't exist
      const { data: newTeam, error } = await this.supabase
        .from("teams")
        .insert({ name: teamName })
        .select("id")
        .single()

      if (error || !newTeam) {
        this.error(`Failed to create team "${teamName}"`, error)
        return
      }
      teamId = newTeam.id
    }

    // Process each section
    for (const section of sections) {
      try {
        switch (section.section_type) {
          case "roster":
            await this.processRosterSection(teamId!, section)
            break
          case "stats":
            await this.processStatsSection(teamId!, section)
            break
          case "trades":
            await this.processTradesSection(teamId!, section)
            break
          case "schedule":
            await this.processScheduleSection(teamId!, section)
            break
          case "header":
            await this.processHeaderSection(teamId!, section)
            break
        }
      } catch (error) {
        this.error(`Failed to process ${section.section_type} section`, error)
      }
    }
  }

  /**
   * Process structured data (team name, coach, draft picks)
   */
  private async processStructuredData(
    teamName: string,
    coachName: string | null,
    draftPicks: Array<{ pokemon: string; pointValue: number; round?: number }>
  ): Promise<void> {
    try {
      // Get or create team
      let { data: team } = await this.supabase
        .from("teams")
        .select("id")
        .eq("name", teamName)
        .single()

      if (!team) {
        // Create team if it doesn't exist
        const { data: newTeam, error } = await this.supabase
          .from("teams")
          .insert({
            name: teamName,
            coach_name: coachName || "Unknown",
          })
          .select("id")
          .single()

        if (error) {
          this.error("Failed to create team", error)
          return
        }
        team = newTeam
      } else if (coachName) {
        // Update coach name if provided
        await this.supabase
          .from("teams")
          .update({ coach_name: coachName })
          .eq("id", team.id)
      }

      // Process draft picks
      for (const pick of draftPicks) {
        // Get Pokemon from cache
        const { data: pokemon } = await this.supabase
          .from("pokemon_cache")
          .select("id, name")
          .ilike("name", `%${pick.pokemon}%`)
          .limit(1)
          .single()

        if (pokemon) {
          // Upsert roster entry with point value
          const { error } = await this.supabase.from("team_rosters").upsert(
            {
              team_id: team!.id,
              pokemon_id: pokemon.id,
              draft_round: pick.round || 1,
              draft_points: pick.pointValue,
            },
            { onConflict: "team_id,pokemon_id" }
          )

          if (error) {
            this.error(`Failed to upsert draft pick for ${pick.pokemon}`, error)
          }
        } else {
          this.warn(`Pokemon "${pick.pokemon}" not found in cache`)
        }
      }
    } catch (error) {
      this.error("Failed to process structured data", error)
    }
  }

  /**
   * Process roster section
   */
  private async processRosterSection(teamId: string, section: z.infer<typeof TeamSectionSchema>): Promise<void> {
    for (const row of section.data) {
      const pokemonName = row["Pokemon"] || row["pokemon"] || row["Name"] || row["name"]
      if (!pokemonName) continue

      // Get Pokemon from cache
      const { data: pokemon } = await this.supabase
        .from("pokemon_cache")
        .select("id")
        .ilike("name", `%${pokemonName}%`)
        .limit(1)
        .single()

      if (pokemon) {
        await this.supabase.from("team_rosters").upsert(
          {
            team_id: teamId,
            pokemon_id: pokemon.id,
          },
          { onConflict: "team_id,pokemon_id" }
        )
        this.recordsProcessed++
      }
    }
  }

  /**
   * Process stats section
   */
  private async processStatsSection(teamId: string, section: z.infer<typeof TeamSectionSchema>): Promise<void> {
    const stats: any = {}
    for (const row of section.data) {
      for (const [key, value] of Object.entries(row)) {
        const normalizedKey = key.toLowerCase()
        if (normalizedKey.includes("win")) stats.wins = parseInt(String(value), 10) || 0
        if (normalizedKey.includes("loss")) stats.losses = parseInt(String(value), 10) || 0
        if (normalizedKey.includes("point")) stats.points = parseInt(String(value), 10) || 0
      }
    }

    if (Object.keys(stats).length > 0) {
      await this.supabase.from("teams").update(stats).eq("id", teamId)
      this.recordsProcessed++
    }
  }

  /**
   * Process trades section
   */
  private async processTradesSection(teamId: string, section: z.infer<typeof TeamSectionSchema>): Promise<void> {
    // TODO: Implement trade processing
    this.log(`Would process ${section.data.length} trade entries`)
  }

  /**
   * Process schedule section
   */
  private async processScheduleSection(teamId: string, section: z.infer<typeof TeamSectionSchema>): Promise<void> {
    // TODO: Implement schedule processing
    this.log(`Would process ${section.data.length} schedule entries`)
  }

  /**
   * Process header section
   */
  private async processHeaderSection(teamId: string, section: z.infer<typeof TeamSectionSchema>): Promise<void> {
    // Extract coach name if present
    for (const row of section.data) {
      for (const [key, value] of Object.entries(row)) {
        if (key.toLowerCase().includes("coach")) {
          await this.supabase.from("teams").update({ coach_name: String(value) }).eq("id", teamId)
          break
        }
      }
    }
  }
}
