import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { getGoogleServiceAccountCredentials } from "@/lib/utils/google-sheets"
import { GoogleSpreadsheet } from "google-spreadsheet"
import { JWT } from "google-auth-library"
import { google } from "googleapis"

/**
 * POST /api/admin/pokemon/export-sheets
 * Export draft pool to Google Sheets in the configured Draft Board format
 * Enhanced with formatting, metadata, and better structure
 */
export async function POST(request: NextRequest) {
  console.log("[Export Sheets API] POST request received")
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { spreadsheet_id, sheet_name, action, season_id } = body // action: 'create' | 'add'

    if (!spreadsheet_id) {
      return NextResponse.json({ error: "Spreadsheet ID is required" }, { status: 400 })
    }

    if (!sheet_name) {
      return NextResponse.json({ error: "Sheet name is required" }, { status: 400 })
    }

    // Get season (use provided season_id or current season)
    const serviceSupabase = createServiceRoleClient()
    let season: any = null
    
    console.log("[Export Sheets API] Looking up season, season_id provided:", season_id)
    
    if (season_id) {
      // Try to fetch with season_id column, fallback if column doesn't exist
      const { data: seasonData, error: seasonError } = await serviceSupabase
        .from("seasons")
        .select("id, name, season_id")
        .eq("id", season_id)
        .single()

      if (seasonError && seasonError.code === '42703') {
        // Column doesn't exist, fallback to basic query
        console.log("[Export Sheets API] season_id column not found, fetching without it")
        const { data: fallbackData, error: fallbackError } = await serviceSupabase
          .from("seasons")
          .select("id, name")
          .eq("id", season_id)
          .single()
        
        if (fallbackError) {
          console.error("[Export Sheets API] Fallback query failed:", fallbackError)
        } else {
          season = fallbackData ? { ...fallbackData, season_id: null } : null
        }
      } else if (seasonError) {
        console.error("[Export Sheets API] Error fetching season:", seasonError)
        // Continue to try current season fallback
      } else {
        season = seasonData
        console.log("[Export Sheets API] Found season:", season?.id, season?.name)
      }
    }
    
    if (!season) {
      // Try to get current season (with fallback for missing season_id column)
      const { data: currentSeason, error: currentSeasonError } = await serviceSupabase
        .from("seasons")
        .select("id, name, season_id")
        .eq("is_current", true)
        .single()
      
      if (currentSeasonError && currentSeasonError.code === '42703') {
        // Column doesn't exist, fallback to basic query
        const { data: fallbackData, error: fallbackError } = await serviceSupabase
          .from("seasons")
          .select("id, name")
          .eq("is_current", true)
          .single()
        
        if (fallbackError) {
          console.error("[Export Sheets API] Fallback current season query failed:", fallbackError)
        } else {
          season = fallbackData ? { ...fallbackData, season_id: null } : null
        }
      } else if (!currentSeasonError) {
        season = currentSeason
        console.log("[Export Sheets API] Found current season:", season?.id, season?.name)
      } else {
        console.error("[Export Sheets API] Error fetching current season:", currentSeasonError)
      }
    }

    if (!season) {
      console.error("[Export Sheets API] No season found. season_id provided:", season_id)
      // Debug: List available seasons
      const { data: allSeasons } = await serviceSupabase
        .from("seasons")
        .select("id, name, is_current")
        .limit(5)
      console.log("[Export Sheets API] Available seasons:", allSeasons)
      
      return NextResponse.json({ 
        error: "No season found",
        details: season_id ? `Season ID ${season_id} not found` : "No current season found",
        available_seasons: allSeasons || [],
      }, { status: 404 })
    }

    const seasonId = season.id

    // Fetch draft pool data (including Tera banned status if column exists)
    console.log("[Export Sheets API] Fetching draft pool data for season:", seasonId)
    
    // Try to fetch with tera_captain_eligible, fallback if column doesn't exist
    let draftPoolData: any[] | null = null
    let poolError: any = null
    
    // First attempt: try with all columns
    const { data: dataWithTera, error: errorWithTera } = await serviceSupabase
      .from("draft_pool")
      .select("pokemon_name, pokemon_id, point_value, status, generation, is_tera_banned, tera_captain_eligible")
      .eq("season_id", seasonId)
      .order("point_value", { ascending: false })
      .order("pokemon_id", { ascending: true })

    if (errorWithTera && errorWithTera.code === '42703') {
      // Column doesn't exist, try without tera_captain_eligible
      console.log("[Export Sheets API] tera_captain_eligible column not found, fetching without it")
      const { data: dataWithoutTera, error: errorWithoutTera } = await serviceSupabase
        .from("draft_pool")
        .select("pokemon_name, pokemon_id, point_value, status, generation, is_tera_banned")
        .eq("season_id", seasonId)
        .order("point_value", { ascending: false })
        .order("pokemon_id", { ascending: true })
      
      draftPoolData = dataWithoutTera
      poolError = errorWithoutTera
    } else {
      draftPoolData = dataWithTera
      poolError = errorWithTera
    }

    if (poolError) {
      console.error("[Export Sheets API] Failed to fetch draft pool:", poolError)
      return NextResponse.json(
        { error: `Failed to fetch draft pool: ${poolError.message}` },
        { status: 500 }
      )
    }

    console.log("[Export Sheets API] Fetched", draftPoolData?.length || 0, "Pokémon from draft pool")

    // Get credentials
    const credentials = getGoogleServiceAccountCredentials()
    if (!credentials) {
      console.error("[Export Sheets API] Google Sheets credentials not configured")
      return NextResponse.json(
        { error: "Google Sheets credentials not configured" },
        { status: 500 }
      )
    }

    console.log("[Export Sheets API] Authenticating with Google Sheets...")
    // Authenticate with Google Sheets (need write access)
    const serviceAccountAuth = new JWT({
      email: credentials.email,
      key: credentials.privateKey,
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets", // Write access
        "https://www.googleapis.com/auth/drive.readonly",
      ],
    })

    console.log("[Export Sheets API] Loading spreadsheet info...")
    const doc = new GoogleSpreadsheet(spreadsheet_id, serviceAccountAuth)
    try {
      await doc.loadInfo()
      console.log("[Export Sheets API] Spreadsheet loaded:", doc.title)
    } catch (loadError: any) {
      console.error("[Export Sheets API] Failed to load spreadsheet:", loadError)
      throw new Error(`Failed to access spreadsheet: ${loadError.message}`)
    }

    const sheets = google.sheets({ version: "v4", auth: serviceAccountAuth })

    // Group Pokémon by point value and status
    const pokemonByPointValue = new Map<number, Array<{ name: string; status: string }>>()
    const bannedPokemon: string[] = []
    const teraBannedPokemon: string[] = []

    draftPoolData?.forEach((entry: any) => {
      if (entry.status === "banned") {
        bannedPokemon.push(entry.pokemon_name)
      } else if (entry.status === "available" || !entry.status) {
        // Check if Tera banned (check both is_tera_banned and tera_captain_eligible if it exists)
        const isTeraBanned = 
          entry.is_tera_banned === true || 
          (entry.tera_captain_eligible !== undefined && entry.tera_captain_eligible === false)
        
        if (isTeraBanned) {
          teraBannedPokemon.push(entry.pokemon_name)
        }
        
        // Add to point value map (available Pokémon, including Tera banned)
        const pointValue = entry.point_value || 5
        if (!pokemonByPointValue.has(pointValue)) {
          pokemonByPointValue.set(pointValue, [])
        }
        pokemonByPointValue.get(pointValue)!.push({
          name: entry.pokemon_name,
          status: entry.status || "available",
        })
      }
    })

    // Create or get sheet
    let sheet = doc.sheetsByTitle[sheet_name]
    let actualSheetName = sheet_name
    
    if (action === "create") {
      // Always create a new sheet with a unique name (append timestamp to avoid overwriting)
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5) // Format: 2026-01-20T12-30-45
      actualSheetName = `${sheet_name} ${timestamp}`
      
      // Check if this name already exists and append a counter if needed
      let counter = 1
      let finalSheetName = actualSheetName
      while (doc.sheetsByTitle[finalSheetName]) {
        finalSheetName = `${actualSheetName} (${counter})`
        counter++
      }
      actualSheetName = finalSheetName
      
      console.log(`[Export Sheets API] Creating new sheet: "${actualSheetName}"`)
      sheet = await doc.addSheet({ title: actualSheetName })
    } else {
      // Action is "add" - use existing sheet or error if not found
      if (!sheet) {
        return NextResponse.json(
          { error: `Sheet "${sheet_name}" not found. Use action: "create" to create a new sheet.` },
          { status: 404 }
        )
      }
      // Clear existing sheet data when using "add" action
      console.log(`[Export Sheets API] Clearing existing sheet: "${sheet_name}"`)
      try {
        await sheet.clear()
      } catch (clearError: any) {
        // If clearing fails due to protection, try to clear via API
        if (clearError.message?.includes("protected")) {
          console.warn("[Export Sheets API] Could not clear sheet due to protection, will overwrite via batchUpdate")
          // Continue - batchUpdate will overwrite the data
        } else {
          throw clearError
        }
      }
    }

    // Build the sheet structure matching Draft Board format
    const maxRows = Math.max(
      ...Array.from(pokemonByPointValue.values()).map((arr) => arr.length),
      bannedPokemon.length,
      teraBannedPokemon.length,
      10 // Minimum rows for headers
    )

    // Initialize empty grid (rows 0-3 for headers, row 4+ for data)
    // Add row 0 for metadata
    const grid: (string | null)[][] = Array(maxRows + 5)
      .fill(null)
      .map(() => Array(73).fill(null))

    // Row 0: Metadata (export info)
    const exportDate = new Date().toLocaleString('en-US', { 
      timeZone: 'America/New_York',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    grid[0][0] = `Exported: ${exportDate}`
    grid[0][1] = `Season: ${season.name || season.season_id || seasonId}`
    grid[0][2] = `Total Pokémon: ${draftPoolData?.length || 0}`
    grid[0][3] = `Available: ${Array.from(pokemonByPointValue.values()).reduce((sum, arr) => sum + arr.length, 0)}`
    grid[0][4] = `Banned: ${bannedPokemon.length}`
    grid[0][5] = `Tera Banned: ${teraBannedPokemon.length}`

    // Row 2: Headers
    grid[2][2] = "Banned"
    grid[2][5] = "Tera Banned"
    grid[2][70] = "Drafted"
    grid[2][72] = "Pts Left"

    // Row 3: Point value headers (columns 8, 11, 14, ... every 3 columns)
    for (let pointValue = 20; pointValue >= 1; pointValue--) {
      const headerCol = 8 + (20 - pointValue) * 3
      grid[3][headerCol] = `${pointValue} Points`
    }

    // Column 3: Banned Pokémon (starting row 4)
    bannedPokemon.forEach((name, index) => {
      grid[4 + index][3] = name
    })

    // Column 6: Tera Banned Pokémon (starting row 4)
    teraBannedPokemon.forEach((name, index) => {
      grid[4 + index][6] = name
    })

    // Point value columns: Pokémon names (starting row 4)
    // Pokémon are placed in the same column as their point value header
    let currentRow = 4
    for (let pointValue = 20; pointValue >= 1; pointValue--) {
      const headerCol = 8 + (20 - pointValue) * 3
      const pokemonCol = headerCol // Same column as header (was headerCol + 1)
      const pokemon = pokemonByPointValue.get(pointValue) || []

      pokemon.forEach((p, index) => {
        const row = 4 + index
        grid[row][pokemonCol] = p.name
        if (row > currentRow) {
          currentRow = row
        }
      })
    }

    // Convert grid to A1 notation ranges for batch update
    const values: Array<{ range: string; values: (string | null)[][] }> = []

    // Helper function to convert column index to letter (A=0, B=1, ..., Z=25, AA=26, etc.)
    function columnToLetter(column: number): string {
      let result = ""
      while (column >= 0) {
        result = String.fromCharCode(65 + (column % 26)) + result
        column = Math.floor(column / 26) - 1
      }
      return result
    }

    // Update entire sheet in batches
    const batchSize = 1000
    const lastColumn = columnToLetter(72) // Column 72 (73rd column, 0-indexed)
    
    // Escape sheet name for A1 notation (wrap in single quotes if contains spaces or special chars)
    // Google Sheets requires sheet names with spaces to be wrapped in single quotes
    const escapedSheetName = actualSheetName.includes(' ') || actualSheetName.includes("'") || actualSheetName.includes('!')
      ? `'${actualSheetName.replace(/'/g, "''")}'` // Escape single quotes by doubling them
      : actualSheetName
    
    for (let startRow = 0; startRow < grid.length; startRow += batchSize) {
      const endRow = Math.min(startRow + batchSize, grid.length)
      const batch = grid.slice(startRow, endRow)
      const range = `${escapedSheetName}!A${startRow + 1}:${lastColumn}${endRow}`

      values.push({
        range,
        values: batch,
      })
    }

    // Batch update the sheet with data
    console.log("[Export Sheets API] Updating sheet with", values.length, "batches...")
    try {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: spreadsheet_id,
        requestBody: {
          valueInputOption: "RAW",
          data: values.map((v) => ({
            range: v.range,
            values: v.values,
          })),
        },
      })
      console.log("[Export Sheets API] Sheet data update successful")
    } catch (updateError: any) {
      console.error("[Export Sheets API] Failed to update sheet:", updateError)
      
      // Check if error is due to protected cells
      if (updateError.message?.includes("protected cell") || updateError.message?.includes("protected range")) {
        // Try to remove protection or provide helpful error message
        const errorMessage = `Failed to update Google Sheet: The sheet contains protected cells or ranges that prevent writing. ` +
          `Please remove protection from the sheet "${actualSheetName}" or contact the spreadsheet owner. ` +
          `You can remove protection by: Right-clicking the sheet → "Protect sheet" → Remove protection.`
        throw new Error(errorMessage)
      }
      
      throw new Error(`Failed to update Google Sheet: ${updateError.message}`)
    }

    // Apply formatting using batchUpdate (separate from values update)
    console.log("[Export Sheets API] Applying formatting...")
    try {
      const formattingRequests: any[] = []

      // Helper to create cell format requests
      const createCellFormat = (row: number, col: number, format: any) => ({
        updateCells: {
          range: {
            sheetId: sheet.sheetId,
            startRowIndex: row,
            endRowIndex: row + 1,
            startColumnIndex: col,
            endColumnIndex: col + 1,
          },
          rows: [{
            values: [{
              userEnteredFormat: format,
            }],
          }],
          fields: "userEnteredFormat",
        },
      })

      // Format Row 0 (metadata) - Gray background, italic
      for (let col = 0; col < 6; col++) {
        formattingRequests.push({
          updateCells: {
            range: {
              sheetId: sheet.sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: col,
              endColumnIndex: col + 1,
            },
            rows: [{
              values: [{
                userEnteredFormat: {
                  backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
                  textFormat: { italic: true, fontSize: 9 },
                },
              }],
            }],
            fields: "userEnteredFormat",
          },
        })
      }

      // Format Row 2 (headers) - Bold, colored backgrounds
      const headerFormats = [
        { col: 2, bg: { red: 1.0, green: 0.8, blue: 0.8 } }, // Banned - Light red
        { col: 5, bg: { red: 1.0, green: 0.9, blue: 0.7 } }, // Tera Banned - Light orange
        { col: 70, bg: { red: 0.8, green: 0.9, blue: 1.0 } }, // Drafted - Light blue
        { col: 72, bg: { red: 0.8, green: 0.9, blue: 1.0 } }, // Pts Left - Light blue
      ]

      headerFormats.forEach(({ col, bg }) => {
        formattingRequests.push({
          updateCells: {
            range: {
              sheetId: sheet.sheetId,
              startRowIndex: 2,
              endRowIndex: 3,
              startColumnIndex: col,
              endColumnIndex: col + 1,
            },
            rows: [{
              values: [{
                userEnteredFormat: {
                  backgroundColor: bg,
                  textFormat: { bold: true },
                  horizontalAlignment: "CENTER",
                },
              }],
            }],
            fields: "userEnteredFormat",
          },
        })
      })

      // Format Row 3 (point value headers) - Bold, centered, colored
      for (let pointValue = 20; pointValue >= 1; pointValue--) {
        const headerCol = 8 + (20 - pointValue) * 3
        // Color gradient: Higher points = darker, lower points = lighter
        const intensity = pointValue / 20
        formattingRequests.push({
          updateCells: {
            range: {
              sheetId: sheet.sheetId,
              startRowIndex: 3,
              endRowIndex: 4,
              startColumnIndex: headerCol,
              endColumnIndex: headerCol + 1,
            },
            rows: [{
              values: [{
                userEnteredFormat: {
                  backgroundColor: {
                    red: 0.7 + (0.3 * intensity),
                    green: 0.85 + (0.15 * intensity),
                    blue: 0.9 + (0.1 * intensity),
                  },
                  textFormat: { bold: true },
                  horizontalAlignment: "CENTER",
                },
              }],
            }],
            fields: "userEnteredFormat",
          },
        })
      }

      // Freeze rows 0-3 and column A
      formattingRequests.push({
        updateSheetProperties: {
          properties: {
            sheetId: sheet.sheetId,
            gridProperties: {
              frozenRowCount: 4,
              frozenColumnCount: 1,
            },
          },
          fields: "gridProperties.frozenRowCount,gridProperties.frozenColumnCount",
        },
      })

      // Apply all formatting in batch
      if (formattingRequests.length > 0) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: spreadsheet_id,
          requestBody: {
            requests: formattingRequests,
          },
        })
        console.log("[Export Sheets API] Formatting applied successfully")
      }
    } catch (formatError: any) {
      // Formatting errors are non-critical, log but don't fail
      console.warn("[Export Sheets API] Failed to apply formatting (non-critical):", formatError.message)
    }

    return NextResponse.json({
      success: true,
      message: `Successfully exported ${draftPoolData?.length || 0} Pokémon to sheet "${actualSheetName}"`,
      sheet_name: actualSheetName,
      sheet_url: `https://docs.google.com/spreadsheets/d/${spreadsheet_id}/edit#gid=${sheet.sheetId}`,
      stats: {
        total: draftPoolData?.length || 0,
        available: Array.from(pokemonByPointValue.values()).reduce((sum, arr) => sum + arr.length, 0),
        banned: bannedPokemon.length,
        tera_banned: teraBannedPokemon.length,
      },
      metadata: {
        season_id: seasonId,
        season_name: season.name || null,
        season_identifier: season.season_id || null,
        created_by: user.id,
        created_by_email: user.email,
        created_at: new Date().toISOString(),
        export_date: new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }),
      },
    })
  } catch (error: any) {
    console.error("[Export Sheets API] Error:", error)
    console.error("[Export Sheets API] Error stack:", error.stack)
    console.error("[Export Sheets API] Error details:", {
      message: error.message,
      code: error.code,
      response: error.response?.data,
    })
    return NextResponse.json(
      { 
        error: error.message || "Failed to export to Google Sheets",
        details: process.env.NODE_ENV === 'development' ? {
          message: error.message,
          code: error.code,
          stack: error.stack,
          response: error.response?.data,
        } : undefined,
      },
      { status: 500 }
    )
  }
}
