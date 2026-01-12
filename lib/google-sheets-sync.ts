import { GoogleSpreadsheet } from "google-spreadsheet"
import { JWT } from "google-auth-library"
import { createServiceRoleClient } from "./supabase/service"
import { getPokemonDataExtended } from "./pokemon-api-enhanced"
import { getGoogleServiceAccountCredentials } from "./utils/google-sheets"
import { parseTeamDataWithAI, type SheetRow } from "./ai-sheet-parser"

export interface SyncResult {
  success: boolean
  recordsProcessed: number
  errors: string[]
}

interface SheetMapping {
  sheet_name: string
  table_name: string
  range?: string
  enabled: boolean
  sync_order: number
  column_mapping?: Record<string, string>
}

/**
 * Sync league data from Google Sheets using stored configuration
 * @param spreadsheetId - Google Sheets ID
 * @param mappings - Sheet mappings configuration
 */
export async function syncLeagueData(
  spreadsheetId: string,
  mappings?: SheetMapping[],
): Promise<SyncResult> {
  const supabase = createServiceRoleClient()
  const errors: string[] = []
  let recordsProcessed = 0

  try {
    // Get credentials from environment variables
    const credentials = getGoogleServiceAccountCredentials()
    if (!credentials) {
      throw new Error(
        "Google Sheets credentials not configured. Please set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY environment variables."
      )
    }

    // Authenticate with Google Sheets and Drive (Drive needed for image extraction)
    const serviceAccountAuth = new JWT({
      email: credentials.email,
      key: credentials.privateKey,
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets.readonly",
        "https://www.googleapis.com/auth/drive.readonly",
      ],
    })

    const doc = new GoogleSpreadsheet(spreadsheetId, serviceAccountAuth)

    // Load spreadsheet info
    await doc.loadInfo()
    console.log("[Sync] Loaded spreadsheet:", doc.title)

    // Use configured mappings if provided, otherwise use defaults
    const sheetMappings: SheetMapping[] =
      mappings && mappings.length > 0
        ? mappings.filter((m) => m.enabled).sort((a, b) => a.sync_order - b.sync_order)
        : [
            { sheet_name: "Standings", table_name: "teams", enabled: true, sync_order: 1 },
            { sheet_name: "Draft Results", table_name: "team_rosters", enabled: true, sync_order: 2 },
            { sheet_name: "Week Battles", table_name: "matches", enabled: true, sync_order: 3 },
          ]

    // Sync each mapped sheet
    for (const mapping of sheetMappings) {
      try {
        const sheet = doc.sheetsByTitle[mapping.sheet_name] || doc.sheetsByIndex.find((s) => s.title === mapping.sheet_name)

        if (!sheet) {
          errors.push(`Sheet "${mapping.sheet_name}" not found in spreadsheet`)
          continue
        }

        console.log(`[Sync] Syncing sheet "${mapping.sheet_name}" to table "${mapping.table_name}"`)

        // Load headers if they exist (required for getRows())
        try {
          await sheet.loadHeaderRow()
          console.log(`[Sync] Loaded headers for "${mapping.sheet_name}":`, sheet.headerValues?.slice(0, 5).join(", "), "...")
        } catch (headerError: any) {
          const errorMsg = headerError.message?.toLowerCase() || ""
          if (errorMsg.includes("no values") || errorMsg.includes("header")) {
            console.warn(`[Sync] Sheet "${mapping.sheet_name}" has no headers - will attempt to read raw rows`)
          } else {
            console.warn(`[Sync] Could not load headers for "${mapping.sheet_name}":`, headerError.message)
          }
        }

        let result: SyncResult

        switch (mapping.table_name) {
          case "teams":
            result = await syncTeams(sheet, supabase, mapping)
            break
          case "team_rosters":
            result = await syncDraftResults(sheet, supabase, mapping)
            break
          case "matches":
            result = await syncMatches(sheet, supabase, mapping)
            break
          default:
            console.warn(`[Sync] Unknown table mapping: ${mapping.table_name}`)
            result = { success: true, recordsProcessed: 0, errors: [] }
        }

        console.log(`[Sync] Sheet "${mapping.sheet_name}" result: ${result.recordsProcessed} records, ${result.errors.length} errors`)
        recordsProcessed += result.recordsProcessed
        errors.push(...result.errors)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        console.error(`[Sync] Error syncing sheet "${mapping.sheet_name}":`, errorMessage)
        errors.push(`Sheet "${mapping.sheet_name}": ${errorMessage}`)
      }
    }

    // Log sync result
    const syncStatus = errors.length > 0 ? (recordsProcessed > 0 ? "partial" : "error") : "success"

    await supabase.from("sync_log").insert({
      sync_type: "google_sheets",
      status: syncStatus,
      records_processed: recordsProcessed,
      error_message: errors.length > 0 ? errors.slice(0, 5).join("; ") : null, // Limit error message length
    })

    return {
      success: errors.length === 0,
      recordsProcessed,
      errors,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error("[Sync] Fatal error:", errorMessage)

    await supabase.from("sync_log").insert({
      sync_type: "google_sheets",
      status: "error",
      records_processed: recordsProcessed,
      error_message: errorMessage,
    })

    return {
      success: false,
      recordsProcessed,
      errors: [errorMessage, ...errors],
    }
  }
}

async function syncTeams(sheet: any, supabase: any, mapping: SheetMapping): Promise<SyncResult> {
  let rows: any[] = []
  
  try {
    rows = await sheet.getRows()
    console.log(`[Sync] syncTeams: Found ${rows.length} rows in sheet`)
  } catch (error: any) {
    console.error(`[Sync] syncTeams: Error getting rows:`, error.message)
    return {
      success: false,
      recordsProcessed: 0,
      errors: [`Failed to read rows: ${error.message}`],
    }
  }

  if (rows.length === 0) {
    console.warn(`[Sync] syncTeams: No rows found in sheet. Headers:`, sheet.headerValues)
    return {
      success: true,
      recordsProcessed: 0,
      errors: ["No rows found in sheet"],
    }
  }

  const errors: string[] = []
  let processed = 0

  // Check if first row is actually a header row (contains "Team Name" or similar)
  // If headers are wrong (like "Week 14"), we need to use raw cell access
  const detectedHeaders = sheet.headerValues || []
  const hasValidHeaders = detectedHeaders.some((h: string) => 
    h && (h.toLowerCase().includes("team") || h.toLowerCase().includes("name") || h.toLowerCase().includes("coach"))
  )
  
  // If headers don't look valid, use raw cell access
  const useRawAccess = !hasValidHeaders || detectedHeaders.length === 0
  
  console.log(`[Sync] syncTeams: Headers detected:`, detectedHeaders)
  console.log(`[Sync] syncTeams: Has valid headers:`, hasValidHeaders)
  console.log(`[Sync] syncTeams: Column mapping:`, mapping.column_mapping || "none")
  console.log(`[Sync] syncTeams: Using raw access:`, useRawAccess)
  
  // If using raw access and we have many rows, try AI-powered parsing
  const useAIParsing = useRawAccess && rows.length > 5
  
  if (useAIParsing) {
    console.log(`[Sync] syncTeams: Using AI-powered parsing for ${rows.length} rows`)
    
    try {
      // Get existing teams for context
      const { data: existingTeams } = await supabase
        .from("teams")
        .select("name, division, conference")
        .limit(50)
      
      // Prepare rows for AI parsing
      const sheetRows: SheetRow[] = []
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        let rawData: any[] = []
        try {
          rawData = (row as any)._rawData || (row as any).raw || []
          if (rawData.length === 0 && sheet.headerValues && sheet.headerValues.length > 0) {
            rawData = sheet.headerValues.map((header: string) => {
              try {
                return row.get(header) || ""
              } catch (e) {
                return ""
              }
            })
          }
        } catch (e) {
          // Ignore
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
          headers: sheet.headerValues,
        })
      }
      
      // Use AI to parse teams
      const aiResult = await parseTeamDataWithAI(sheetRows, {
        sheetName: mapping.sheet_name,
        existingTeams: existingTeams || [],
      })
      
      if (aiResult.teams.length > 0) {
        console.log(`[Sync] syncTeams: AI parsed ${aiResult.teams.length} teams`)
        
        // Upsert AI-parsed teams
        for (const teamData of aiResult.teams) {
          try {
            const { error } = await supabase.from("teams").upsert(
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
              errors.push(`Team ${teamData.name}: ${error.message}`)
            } else {
              processed++
              if (teamData.inferred_fields && teamData.inferred_fields.length > 0) {
                console.log(`[Sync] syncTeams: AI inferred fields for "${teamData.name}":`, teamData.inferred_fields)
              }
            }
          } catch (error) {
            errors.push(`Team ${teamData.name}: ${error instanceof Error ? error.message : "Unknown error"}`)
          }
        }
        
        return { success: errors.length === 0, recordsProcessed: processed, errors }
      } else {
        console.warn(`[Sync] syncTeams: AI parsing returned no teams, falling back to manual parsing`)
      }
    } catch (aiError) {
      console.error(`[Sync] syncTeams: AI parsing failed, falling back to manual:`, aiError)
      // Fall through to manual parsing
    }
  }

  // Helper function to get value from row
  const getValue = (row: any, expectedDbField: string, rawData?: any[]): any => {
    // If using raw access, read from rawData array by index
    if (useRawAccess && rawData && rawData.length > 0) {
      // Check column_mapping for index mapping
      if (mapping.column_mapping) {
        for (const [sheetCol, dbField] of Object.entries(mapping.column_mapping)) {
          if (dbField === expectedDbField || dbField.toLowerCase() === expectedDbField.toLowerCase()) {
            // Try to parse sheetCol as index
            const index = Number.parseInt(sheetCol)
            if (!Number.isNaN(index) && rawData[index] !== undefined && rawData[index] !== null && rawData[index] !== "") {
              return rawData[index]
            }
            // Try as column name
            try {
              const val = row.get(sheetCol)
              if (val !== undefined && val !== null && val !== "") return val
            } catch (e) {
              // Continue
            }
          }
        }
      }
      
      // Default position-based mapping for teams (when headers are invalid)
      // Based on typical team standings sheet structure
      if (expectedDbField === "name") {
        const val = rawData[0]
        return val !== undefined && val !== null && val !== "" ? val : null
      }
      if (expectedDbField === "coach_name") {
        const val = rawData[1]
        return val !== undefined && val !== null && val !== "" ? val : "Unknown Coach"
      }
      if (expectedDbField === "division") {
        const val = rawData[2]
        return val !== undefined && val !== null && val !== "" ? val : null
      }
      if (expectedDbField === "conference") {
        const val = rawData[3]
        return val !== undefined && val !== null && val !== "" ? val : null
      }
      if (expectedDbField === "wins") {
        const val = rawData[4]
        return val !== undefined && val !== null && val !== "" ? String(val) : "0"
      }
      if (expectedDbField === "losses") {
        const val = rawData[5]
        return val !== undefined && val !== null && val !== "" ? String(val) : "0"
      }
      if (expectedDbField === "differential") {
        const val = rawData[6]
        return val !== undefined && val !== null && val !== "" ? String(val) : "0"
      }
      if (expectedDbField === "strength_of_schedule") {
        const val = rawData[7]
        return val !== undefined && val !== null && val !== "" ? String(val) : "0"
      }
      
      return null
    }
    
    // Use column mapping if provided, otherwise use defaults
    // column_mapping maps sheet column names TO database field names
    let sheetColumn: string | null = null
    
    if (mapping.column_mapping) {
      // Reverse lookup: find sheet column that maps to this db field
      for (const [sheetCol, dbField] of Object.entries(mapping.column_mapping)) {
        if (dbField === expectedDbField || dbField.toLowerCase() === expectedDbField.toLowerCase()) {
          sheetColumn = sheetCol
          break
        }
      }
    }
    
    // Try the mapped column first
    if (sheetColumn) {
      try {
        const value = row.get(sheetColumn)
        if (value !== undefined && value !== null && value !== "") {
          return value
        }
      } catch (e) {
        // Continue to try alternatives
      }
    }
    
    // Try direct column name match with common variations
    const possibleNames: string[] = []
    
    if (expectedDbField === "name") {
      possibleNames.push("Team", "Team Name", "team", "team name", "TEAM", "TEAM NAME", "Name", "name")
    } else if (expectedDbField === "coach_name") {
      possibleNames.push("Coach", "Coach Name", "coach", "coach name", "COACH", "COACH NAME")
    } else if (expectedDbField === "wins") {
      possibleNames.push("Wins", "W", "wins", "w", "WINS")
    } else if (expectedDbField === "losses") {
      possibleNames.push("Losses", "L", "losses", "l", "LOSSES", "Loss", "loss")
    } else if (expectedDbField === "differential") {
      possibleNames.push("Differential", "Diff", "differential", "diff", "DIFFERENTIAL", "DIFF")
    } else if (expectedDbField === "division") {
      possibleNames.push("Division", "Div", "division", "div", "DIVISION", "DIV")
    } else if (expectedDbField === "conference") {
      possibleNames.push("Conference", "Conf", "conference", "conf", "CONFERENCE", "CONF")
    } else if (expectedDbField === "strength_of_schedule") {
      possibleNames.push("SoS", "Strength of Schedule", "sos", "strength of schedule", "SOS")
    }
    
    // Also try the expected field name directly
    possibleNames.push(expectedDbField, expectedDbField.toLowerCase(), expectedDbField.toUpperCase())
    
    for (const colName of possibleNames) {
      try {
        const value = row.get(colName)
        if (value !== undefined && value !== null && value !== "") {
          return value
        }
      } catch (e) {
        // Continue to next name
      }
    }
    
    return null
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      // Get raw data if available - try multiple ways to access it
      let rawData: any[] = []
      try {
        // Try different ways to access raw data
        rawData = (row as any)._rawData || (row as any).raw || []
        
        // If still empty and we have headers, try to build raw data from row values
        if (rawData.length === 0 && sheet.headerValues && sheet.headerValues.length > 0) {
          rawData = sheet.headerValues.map((header: string) => {
            try {
              return row.get(header) || ""
            } catch (e) {
              return ""
            }
          })
        }
      } catch (e) {
        // If we can't get raw data, try to build it from available headers
        if (sheet.headerValues && sheet.headerValues.length > 0) {
          rawData = sheet.headerValues.map((header: string) => {
            try {
              return row.get(header) || ""
            } catch (e) {
              return ""
            }
          })
        }
      }
      
      // Skip first row if it looks like a header row (contains "Team Name")
      if (i === 0 && useRawAccess && rawData.length > 0) {
        const firstCell = String(rawData[0] || "").toLowerCase()
        if (firstCell.includes("team") && firstCell.includes("name")) {
          console.log(`[Sync] syncTeams: Skipping header row:`, rawData.slice(0, 5))
          continue
        }
      }
      
      // Try to get values using all possible column names
      // Use database field names for getValue
      let teamData = {
        name: getValue(row, "name", rawData) || null,
        coach_name: getValue(row, "coach_name", rawData) || "Unknown Coach", // Default value for NOT NULL constraint
        division: getValue(row, "division", rawData) || null,
        conference: getValue(row, "conference", rawData) || null,
        wins: Number.parseInt(String(getValue(row, "wins", rawData) || "0")),
        losses: Number.parseInt(String(getValue(row, "losses", rawData) || "0")),
        differential: Number.parseInt(String(getValue(row, "differential", rawData) || "0")),
        strength_of_schedule: Number.parseFloat(String(getValue(row, "strength_of_schedule", rawData) || "0")),
      }

      // Debug: Log what we're trying to extract (only first few rows)
      if (processed === 0 && i < 3) {
        console.log(`[Sync] syncTeams: Row ${i + 1} - Attempting to extract team data:`, {
          name: teamData.name,
          coach_name: teamData.coach_name,
          rawData: rawData.slice(0, 5),
          availableHeaders: sheet.headerValues,
          columnMapping: mapping.column_mapping,
        })
      }

      if (!teamData.name || (typeof teamData.name === "string" && teamData.name.trim() === "")) {
        if (processed === 0 && i < 3) {
          console.log(`[Sync] syncTeams: Skipping row ${i + 1} with empty name. Raw data:`, rawData.slice(0, 5))
        }
        continue // Skip empty rows
      }
      
      // Skip if name looks like a header
      if (teamData.name && typeof teamData.name === "string" && 
          (teamData.name.toLowerCase().includes("team name") || 
           teamData.name.toLowerCase() === "name" ||
           teamData.name.toLowerCase().includes("header"))) {
        if (processed === 0 && i < 3) {
          console.log(`[Sync] syncTeams: Skipping row ${i + 1} - looks like header:`, teamData.name)
        }
        continue
      }

      // Upsert team
      const { error, data } = await supabase.from("teams").upsert(teamData, { onConflict: "name" })

      if (error) {
        console.error(`[Sync] syncTeams: Error upserting team "${teamData.name}":`, error.message)
        errors.push(`Team ${teamData.name}: ${error.message}`)
      } else {
        processed++
        if (processed <= 3) {
          console.log(`[Sync] syncTeams: Successfully synced team "${teamData.name}"`)
        }
      }
    } catch (error) {
      errors.push(`Row processing error: ${error instanceof Error ? error.message : "Unknown"}`)
    }
  }

  return { success: errors.length === 0, recordsProcessed: processed, errors }
}

async function syncDraftResults(sheet: any, supabase: any, mapping: SheetMapping): Promise<SyncResult> {
  let rows: any[] = []
  
  try {
    rows = await sheet.getRows()
    console.log(`[Sync] syncDraftResults: Found ${rows.length} rows in sheet`)
  } catch (error: any) {
    console.error(`[Sync] syncDraftResults: Error getting rows:`, error.message)
    return {
      success: false,
      recordsProcessed: 0,
      errors: [`Failed to read rows: ${error.message}`],
    }
  }

  if (rows.length === 0) {
    console.warn(`[Sync] syncDraftResults: No rows found in sheet. Headers:`, sheet.headerValues)
    return {
      success: true,
      recordsProcessed: 0,
      errors: ["No rows found in sheet"],
    }
  }

  const errors: string[] = []
  let processed = 0

  const getValue = (row: any, column: string) => {
    const mappedColumn = mapping.column_mapping?.[column] || column
    return row.get(mappedColumn) || row.get(column)
  }

  for (const row of rows) {
    try {
      const round = Number.parseInt(getValue(row, "Round") || "0")
      const teamName = getValue(row, "Team")
      const pokemonName = getValue(row, "Pokemon") || getValue(row, "Pick")
      const cost = Number.parseInt(getValue(row, "Cost") || getValue(row, "Points") || "10")

      if (!teamName || !pokemonName) continue

      // Get team ID
      const { data: team, error: teamError } = await supabase.from("teams").select("id").eq("name", teamName).single()

      if (teamError || !team) {
        errors.push(`Team not found: ${teamName}`)
        continue
      }

      // Check if Pokemon exists in pokemon_cache first
      let cachedPokemonData: any = null
      const { data: cachedPokemon } = await supabase
        .from("pokemon_cache")
        .select("pokemon_id, name, types")
        .eq("name", pokemonName.toLowerCase())
        .single()

      if (!cachedPokemon) {
        // Try to fetch from API and cache it
        const extendedData = await getPokemonDataExtended(pokemonName, false)
        if (!extendedData) {
          errors.push(`Pokemon not found in cache or API: ${pokemonName}. Please ensure Pokemon is cached first.`)
          continue
        }
        cachedPokemonData = extendedData
      } else {
        cachedPokemonData = cachedPokemon
      }

      // Extract types from cache (can be array or JSON string)
      let types: string[] = []
      if (Array.isArray(cachedPokemonData.types)) {
        types = cachedPokemonData.types
      } else if (typeof cachedPokemonData.types === "string") {
        try {
          types = JSON.parse(cachedPokemonData.types)
        } catch {
          types = cachedPokemonData.types.split(",")
        }
      }

      // Get or create Pokemon entry in pokemon table (for roster reference)
      // pokemon table has: id, name, type1, type2
      const { data: pokemon, error: pokemonError } = await supabase
        .from("pokemon")
        .upsert(
          {
            name: pokemonName.toLowerCase(),
            type1: types[0] || null,
            type2: types[1] || null,
          },
          { onConflict: "name" },
        )
        .select()
        .single()

      if (pokemonError || !pokemon) {
        errors.push(`Failed to create Pokemon entry: ${pokemonName} - ${pokemonError?.message}`)
        continue
      }

      // Add to roster
      const { error: rosterError } = await supabase.from("team_rosters").upsert(
        {
          team_id: team.id,
          pokemon_id: pokemon.id,
          draft_round: round,
          draft_order: processed + 1,
          draft_points: cost,
        },
        { onConflict: "team_id,pokemon_id" },
      )

      if (rosterError) {
        errors.push(`Roster entry: ${rosterError.message}`)
      } else {
        processed++
      }
    } catch (error) {
      errors.push(`Draft row error: ${error instanceof Error ? error.message : "Unknown"}`)
    }
  }

  return { success: errors.length === 0, recordsProcessed: processed, errors }
}

async function syncMatches(sheet: any, supabase: any, mapping: SheetMapping): Promise<SyncResult> {
  let rows: any[] = []
  
  try {
    rows = await sheet.getRows()
    console.log(`[Sync] syncMatches: Found ${rows.length} rows in sheet`)
  } catch (error: any) {
    console.error(`[Sync] syncMatches: Error getting rows:`, error.message)
    return {
      success: false,
      recordsProcessed: 0,
      errors: [`Failed to read rows: ${error.message}`],
    }
  }

  if (rows.length === 0) {
    console.warn(`[Sync] syncMatches: No rows found in sheet. Headers:`, sheet.headerValues)
    return {
      success: true,
      recordsProcessed: 0,
      errors: ["No rows found in sheet"],
    }
  }

  const errors: string[] = []
  let processed = 0

  for (const row of rows) {
    try {
      const week = Number.parseInt(row.get("Week") || "0")
      const team1Name = row.get("Team 1") || row.get("Home")
      const team2Name = row.get("Team 2") || row.get("Away")
      const score = row.get("Score") || row.get("Result")

      if (!team1Name || !team2Name) continue

      // Parse score (e.g., "6-4" means team1 won 6-4)
      let team1Score = 0
      let team2Score = 0
      let winnerId = null

      if (score && typeof score === "string" && score.includes("-")) {
        const [s1, s2] = score.split("-").map((s: string) => Number.parseInt(s.trim()))
        team1Score = s1 || 0
        team2Score = s2 || 0
      }

      // Get team IDs
      const { data: teams, error: teamsError } = await supabase
        .from("teams")
        .select("id, name")
        .in("name", [team1Name, team2Name])

      if (teamsError || !teams || teams.length !== 2) {
        errors.push(`Teams not found: ${team1Name} vs ${team2Name}`)
        continue
      }

      const team1 = teams.find((t: any) => t.name === team1Name)
      const team2 = teams.find((t: any) => t.name === team2Name)

      if (!team1 || !team2) {
        errors.push(`Teams not found: ${team1Name} vs ${team2Name}`)
        continue
      }

      if (team1Score > team2Score) winnerId = team1.id
      else if (team2Score > team1Score) winnerId = team2.id

      const differential = Math.abs(team1Score - team2Score)

      // Upsert match
      const { error: matchError } = await supabase.from("matches").upsert(
        {
          week,
          team1_id: team1.id,
          team2_id: team2.id,
          winner_id: winnerId,
          team1_score: team1Score,
          team2_score: team2Score,
          differential,
          status: winnerId ? "completed" : "scheduled",
        },
        { onConflict: "week,team1_id,team2_id" },
      )

      if (matchError) {
        errors.push(`Match week ${week}: ${matchError.message}`)
      } else {
        processed++
      }
    } catch (error) {
      errors.push(`Match row error: ${error instanceof Error ? error.message : "Unknown"}`)
    }
  }

  return { success: errors.length === 0, recordsProcessed: processed, errors }
}
