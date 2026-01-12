// AI-powered Google Sheets parser using OpenAI GPT-5 models
// Intelligently extracts and infers missing fields from unstructured sheet data

import { z } from "zod"
import { zodResponseFormat } from "openai/helpers/zod"
import { openai, AI_MODELS } from "./openai-client"

export interface SheetRow {
  rawData: any[]
  rowIndex: number
  headers?: string[]
}

// Zod schema for parsed team data
const ParsedTeamDataSchema = z.object({
  name: z.string(),
  coach_name: z.string(),
  division: z.string(),
  conference: z.string(),
  wins: z.number().int().default(0),
  losses: z.number().int().default(0),
  differential: z.number().int().default(0),
  strength_of_schedule: z.number().default(0),
  confidence: z.number().min(0).max(1),
  inferred_fields: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional(),
})

export type ParsedTeamData = z.infer<typeof ParsedTeamDataSchema>

// Schema for the response containing teams array
const ParsedTeamsResponseSchema = z.object({
  teams: z.array(ParsedTeamDataSchema),
  errors: z.array(z.string()).optional(),
})

// Zod schema for parsed match data
const ParsedMatchDataSchema = z.object({
  week: z.number().int(),
  team1_name: z.string(),
  team2_name: z.string(),
  team1_score: z.number().int().default(0),
  team2_score: z.number().int().default(0),
  winner_name: z.string().nullable(),
  differential: z.number().int(),
  status: z.enum(["completed", "scheduled"]),
  confidence: z.number().min(0).max(1),
  inferred_fields: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional(),
})

export type ParsedMatchData = z.infer<typeof ParsedMatchDataSchema>

// Schema for the response containing matches array
const ParsedMatchesResponseSchema = z.object({
  matches: z.array(ParsedMatchDataSchema),
  errors: z.array(z.string()).optional(),
})

/**
 * AI-powered parser for team standings data from Google Sheets
 * Handles various formats and infers missing required fields
 */
export async function parseTeamDataWithAI(
  rows: SheetRow[],
  context?: {
    sheetName?: string
    existingTeams?: Array<{ name: string; division?: string; conference?: string }>
  }
): Promise<{ teams: ParsedTeamData[]; errors: string[] }> {
  // Prepare ALL rows for AI analysis (AI can handle larger datasets)
  // Limit to reasonable size to avoid token limits (process up to 50 rows at a time)
  const rowsToProcess = rows.slice(0, Math.min(50, rows.length))
  const rowData = rowsToProcess.map((row) => ({
    rowNumber: row.rowIndex + 1,
    cells: row.rawData,
    headers: row.headers || [],
  }))

  const existingTeamsContext = context?.existingTeams
    ? `\n\nExisting teams in database (for reference - use their divisions/conferences as patterns):\n${JSON.stringify(context.existingTeams.slice(0, 30), null, 2)}`
    : ""

  const prompt = `You are parsing team standings data from a Google Sheet. The sheet "${context?.sheetName || "Standings"}" contains team information, but the format may be inconsistent or missing required fields.

Database Schema Requirements:
- name (string, REQUIRED): Team name
- coach_name (string, REQUIRED): Coach name (can infer as "Unknown Coach" if missing)
- division (string, REQUIRED): Division name (e.g., "East", "West", "North", "South", "Alpha", "Beta", "Division 1", "Division 2")
- conference (string, REQUIRED): Conference name (e.g., "American", "National", "AFC", "NFC", "Conference A", "Conference B")
- wins (integer, default 0): Number of wins
- losses (integer, default 0): Number of losses
- differential (integer, default 0): Point differential
- strength_of_schedule (decimal, default 0): Strength of schedule metric

All rows from the sheet (${rowsToProcess.length} rows to parse):
${JSON.stringify(rowData, null, 2)}${existingTeamsContext}

Your task:
1. Extract structured team data from EACH of the ${rowsToProcess.length} rows provided above
2. Infer missing REQUIRED fields (division, conference) intelligently based on:
   - **Geographic patterns**: Team names with cities/states (e.g., "South Bend", "Kalamazoo", "Detroit", "Miami") suggest divisions based on regions
     * US Midwest teams → "Midwest" or "Central" division
     * US East Coast teams → "East" division  
     * US West Coast teams → "West" division
     * International teams (e.g., "Manchester", "Leicester", "Liverpool", "Tegucigalpa") → "International" division or group by continent
   - **Team name themes**: Pokemon-themed names suggest conferences (e.g., "Pokemon League", "Draft League")
   - **Existing teams**: If existing teams have divisions/conferences, maintain consistency and balance
   - **Balancing**: Distribute teams evenly across 2-4 divisions and 1-2 conferences
   - **Defaults**: If no clear pattern, use "Division 1"/"Division 2" and "Conference A"/"Conference B"
3. Set defaults for optional numeric fields (0 if missing)
4. Provide confidence scores (0-1) for each parsed record:
   - High confidence (0.8-1.0): Clear team name, inferred fields match patterns
   - Medium confidence (0.5-0.8): Team name clear but inference less certain
   - Low confidence (0.0-0.5): Ambiguous data, include warnings
5. List which fields were inferred vs extracted in the inferred_fields array
6. Include warnings for low-confidence inferences or missing critical data

IMPORTANT: 
- Return a JSON object with a "teams" array containing exactly ${rowsToProcess.length} parsed team objects (one per row)
- Each team object MUST have all required fields filled in (no nulls for division/conference)
- Be creative but consistent with divisions/conferences - group similar teams together`

  try {
    // Use Zod schema with OpenAI's zodResponseFormat helper
    const responseFormat = zodResponseFormat(ParsedTeamsResponseSchema, "parsed_teams")
    
    const response = await openai.chat.completions.create({
      model: AI_MODELS.STRATEGY_COACH, // Use GPT-5.2 for complex reasoning
      messages: [
        {
          role: "system",
          content:
            "You are an expert data parser specializing in sports league data. You extract structured information from unstructured spreadsheets and intelligently infer missing required fields based on context and patterns. Always return valid JSON matching the requested schema.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: responseFormat,
      temperature: 0.3, // Lower temperature for more consistent parsing
    })

    const message = response.choices[0].message
    const content = message.content
    
    if (!content) {
      // Check if there are tool calls instead
      if (message.tool_calls && message.tool_calls.length > 0) {
        throw new Error("AI returned tool calls instead of parsed data")
      }
      throw new Error("No response from AI parser")
    }

    // Parse and validate the JSON response with Zod
    let parsed: z.infer<typeof ParsedTeamsResponseSchema>
    try {
      const jsonData = JSON.parse(content)
      parsed = ParsedTeamsResponseSchema.parse(jsonData)
    } catch (parseError) {
      console.error("[AI Parser] Failed to parse/validate JSON response:", content)
      if (parseError instanceof z.ZodError) {
        console.error("[AI Parser] Zod validation errors:", parseError.errors)
      }
      throw new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : "Invalid JSON"}`)
    }
    return {
      teams: parsed.teams || [],
      errors: parsed.errors || [],
    }
  } catch (error) {
    console.error("[AI Parser] Error parsing team data:", error)
    return {
      teams: [],
      errors: [`AI parsing failed: ${error instanceof Error ? error.message : "Unknown error"}`],
    }
  }
}

/**
 * AI-powered parser for match data from Google Sheets
 */
export async function parseMatchDataWithAI(
  rows: SheetRow[],
  context?: {
    sheetName?: string
    existingTeams?: Array<{ name: string; id: string }>
  }
): Promise<{ matches: ParsedMatchData[]; errors: string[] }> {
  const sampleRows = rows.slice(0, Math.min(10, rows.length))
  const sampleData = sampleRows.map((row, idx) => ({
    rowNumber: idx + 1,
    cells: row.rawData,
    headers: row.headers || [],
  }))

  const existingTeamsContext = context?.existingTeams
    ? `\n\nExisting teams in database:\n${context.existingTeams.map((t) => t.name).join(", ")}`
    : ""

  const prompt = `You are parsing match/game results from a Google Sheet. The sheet "${context?.sheetName || "Matches"}" contains match information.

Database Schema Requirements:
- week (integer, REQUIRED): Week number
- team1_name (string, REQUIRED): First team name
- team2_name (string, REQUIRED): Second team name
- team1_score (integer, default 0): First team's score
- team2_score (integer, default 0): Second team's score
- winner_name (string | null): Winner team name (null if tie or incomplete)
- differential (integer): Absolute difference in scores
- status ("completed" | "scheduled"): Match status

Sample rows from the sheet:
${JSON.stringify(sampleData, null, 2)}${existingTeamsContext}

Your task:
1. Extract structured match data from each row
2. Parse scores from various formats (e.g., "6-4", "Team A 6, Team B 4", etc.)
3. Determine winner and differential
4. Infer week number if missing (can use row order or context)
5. Provide confidence scores and warnings

Return a JSON array of parsed match objects.`

  try {
    // Use Zod schema with OpenAI's zodResponseFormat helper
    const responseFormat = zodResponseFormat(ParsedMatchesResponseSchema, "parsed_matches")
    
    const response = await openai.chat.completions.create({
      model: AI_MODELS.STRATEGY_COACH,
      messages: [
        {
          role: "system",
          content:
            "You are an expert data parser specializing in sports match results. Extract structured match data from unstructured spreadsheets, handling various score formats and inferring missing fields.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: responseFormat,
      temperature: 0.3,
    })

    const message = response.choices[0].message
    const content = message.content
    
    if (!content) {
      if (message.tool_calls && message.tool_calls.length > 0) {
        throw new Error("AI returned tool calls instead of parsed data")
      }
      throw new Error("No response from AI parser")
    }

    // Parse and validate the JSON response with Zod
    let parsed: z.infer<typeof ParsedMatchesResponseSchema>
    try {
      const jsonData = JSON.parse(content)
      parsed = ParsedMatchesResponseSchema.parse(jsonData)
    } catch (parseError) {
      console.error("[AI Parser] Failed to parse/validate JSON response:", content)
      if (parseError instanceof z.ZodError) {
        console.error("[AI Parser] Zod validation errors:", parseError.errors)
      }
      throw new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : "Invalid JSON"}`)
    }
    
    return {
      matches: parsed.matches || [],
      errors: parsed.errors || [],
    }
  } catch (error) {
    console.error("[AI Parser] Error parsing match data:", error)
    return {
      matches: [],
      errors: [`AI parsing failed: ${error instanceof Error ? error.message : "Unknown error"}`],
    }
  }
}
