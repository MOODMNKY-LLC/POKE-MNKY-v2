import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { getGoogleServiceAccountCredentials } from "@/lib/utils/google-sheets"
import { GoogleSpreadsheet } from "google-spreadsheet"
import { JWT } from "google-auth-library"
import { google } from "googleapis"

/**
 * POST /api/admin/pokemon/export-sheets-table
 * Export draft pool to Google Sheets in table format matching the admin panel
 * Includes: Dex, Name, Base Stats, Types, Generation, Tier, Points, Available
 */
export async function POST(request: NextRequest) {
  console.log("[Export Sheets Table API] POST request received")
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { spreadsheet_id, sheet_name, action, season_id } = body

    if (!spreadsheet_id) {
      return NextResponse.json({ error: "Spreadsheet ID is required" }, { status: 400 })
    }

    if (!sheet_name) {
      return NextResponse.json({ error: "Sheet name is required" }, { status: 400 })
    }

    // Get season
    const serviceSupabase = createServiceRoleClient()
    let season: any = null
    
    console.log("[Export Sheets Table API] Looking up season, season_id provided:", season_id)
    
    if (season_id) {
      // Try to fetch with season_id column, fallback if column doesn't exist
      const { data: seasonData, error: seasonError } = await serviceSupabase
        .from("seasons")
        .select("id, name, season_id")
        .eq("id", season_id)
        .single()

      if (seasonError && seasonError.code === '42703') {
        // Column doesn't exist, fallback to basic query
        console.log("[Export Sheets Table API] season_id column not found, fetching without it")
        const { data: fallbackData, error: fallbackError } = await serviceSupabase
          .from("seasons")
          .select("id, name")
          .eq("id", season_id)
          .single()
        
        if (fallbackError) {
          console.error("[Export Sheets Table API] Fallback query failed:", fallbackError)
        } else {
          season = fallbackData ? { ...fallbackData, season_id: null } : null
        }
      } else if (seasonError) {
        console.error("[Export Sheets Table API] Error fetching season:", seasonError)
        // Continue to try current season fallback
      } else {
        season = seasonData
        console.log("[Export Sheets Table API] Found season:", season?.id, season?.name)
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
          console.error("[Export Sheets Table API] Fallback current season query failed:", fallbackError)
        } else {
          season = fallbackData ? { ...fallbackData, season_id: null } : null
        }
      } else if (!currentSeasonError) {
        season = currentSeason
        console.log("[Export Sheets Table API] Found current season:", season?.id, season?.name)
      } else {
        console.error("[Export Sheets Table API] Error fetching current season:", currentSeasonError)
      }
    }

    if (!season) {
      console.error("[Export Sheets Table API] No season found. season_id provided:", season_id)
      // Debug: List available seasons
      const { data: allSeasons } = await serviceSupabase
        .from("seasons")
        .select("id, name, is_current")
        .limit(5)
      console.log("[Export Sheets Table API] Available seasons:", allSeasons)
      
      return NextResponse.json({ 
        error: "No season found",
        details: season_id ? `Season ID ${season_id} not found` : "No current season found",
        available_seasons: allSeasons || [],
      }, { status: 404 })
    }

    const seasonId = season.id
    console.log("[Export Sheets Table API] Using season:", seasonId, season.name, "season_id provided:", season_id)
    
    // Fetch draft pool data with enriched information (same as admin panel)
    console.log("[Export Sheets Table API] Fetching draft pool data for season:", seasonId)
    const { data: draftPoolData, error: poolError } = await serviceSupabase
      .from("draft_pool")
      .select("pokemon_id, pokemon_name, point_value, status, generation, is_tera_banned, tera_captain_eligible")
      .eq("season_id", seasonId)
      .order("pokemon_id", { ascending: true })

    if (poolError) {
      console.error("[Export Sheets Table API] Failed to fetch draft pool:", poolError)
      return NextResponse.json(
        { error: `Failed to fetch draft pool: ${poolError.message}` },
        { status: 500 }
      )
    }

    if (!draftPoolData || draftPoolData.length === 0) {
      return NextResponse.json(
        { error: "No Pokémon found in draft pool" },
        { status: 404 }
      )
    }

    const pokemonIds = draftPoolData.map(p => p.pokemon_id)

    // Fetch enriched data (types, base stats, tier) - same as admin panel API
    const { data: pokepediaTypesData } = await serviceSupabase
      .from("pokepedia_pokemon")
      .select("id, types, base_stats, species_name")
      .in("id", pokemonIds)

    const { data: showdownTiersData } = await serviceSupabase
      .from("pokemon_showdown")
      .select("dex_num, tier")
      .in("dex_num", pokemonIds)

    // Build maps for quick lookup
    const typesMap = new Map<number, string[]>()
    const statsMap = new Map<number, { hp: number; attack: number; defense: number; "special-attack": number; "special-defense": number; speed: number }>()
    const tiersMap = new Map<number, string | null>()

    pokepediaTypesData?.forEach((entry) => {
      if (entry.types && Array.isArray(entry.types) && entry.types.length > 0) {
        typesMap.set(entry.id, entry.types)
      }
      if (entry.base_stats && typeof entry.base_stats === 'object') {
        const stats = entry.base_stats as any
        statsMap.set(entry.id, {
          hp: stats.hp || 0,
          attack: stats.attack || 0,
          defense: stats.defense || 0,
          "special-attack": stats["special-attack"] || 0,
          "special-defense": stats["special-defense"] || 0,
          speed: stats.speed || 0,
        })
      }
    })

    showdownTiersData?.forEach((entry) => {
      tiersMap.set(entry.dex_num, entry.tier || null)
    })

    // Get credentials
    const credentials = getGoogleServiceAccountCredentials()
    if (!credentials) {
      return NextResponse.json(
        { error: "Google Sheets credentials not configured" },
        { status: 500 }
      )
    }

    const serviceAccountAuth = new JWT({
      email: credentials.email,
      key: credentials.privateKey,
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive.readonly",
      ],
    })

    const doc = new GoogleSpreadsheet(spreadsheet_id, serviceAccountAuth)
    await doc.loadInfo()
    const sheets = google.sheets({ version: "v4", auth: serviceAccountAuth })

    // Create or get sheet
    let sheet = doc.sheetsByTitle[sheet_name]
    let actualSheetName = sheet_name
    
    if (action === "create") {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
      actualSheetName = `${sheet_name} ${timestamp}`
      
      let counter = 1
      let finalSheetName = actualSheetName
      while (doc.sheetsByTitle[finalSheetName]) {
        finalSheetName = `${actualSheetName} (${counter})`
        counter++
      }
      actualSheetName = finalSheetName
      
      sheet = await doc.addSheet({ title: actualSheetName })
    } else {
      if (!sheet) {
        return NextResponse.json(
          { error: `Sheet "${sheet_name}" not found. Use action: "create" to create a new sheet.` },
          { status: 404 }
        )
      }
      try {
        await sheet.clear()
      } catch (clearError: any) {
        if (!clearError.message?.includes("protected")) {
          throw clearError
        }
      }
    }

    // Build table data
    const headers = [
      "Dex",
      "Name",
      "HP",
      "Atk",
      "Def",
      "SpA",
      "SpD",
      "Spe",
      "Type 1",
      "Type 2",
      "Generation",
      "Tier",
      "Points",
      "Available",
    ]

    const rows: any[][] = []

    // Add metadata row
    const exportDate = new Date().toLocaleString('en-US', { 
      timeZone: 'America/New_York',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    rows.push([
      `Exported: ${exportDate}`,
      `Season: ${season.name || season.season_id || seasonId}`,
      `Total: ${draftPoolData.length}`,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ])

    // Add header row
    rows.push(headers)

    // Add data rows
    draftPoolData.forEach((entry) => {
      const types = typesMap.get(entry.pokemon_id) || []
      const stats = statsMap.get(entry.pokemon_id) || { hp: 0, attack: 0, defense: 0, "special-attack": 0, "special-defense": 0, speed: 0 }
      const tier = tiersMap.get(entry.pokemon_id) || null
      const available = entry.status === "available" || !entry.status

      rows.push([
        entry.pokemon_id,
        entry.pokemon_name,
        stats.hp,
        stats.attack,
        stats.defense,
        stats["special-attack"],
        stats["special-defense"],
        stats.speed,
        types[0] || "",
        types[1] || "",
        entry.generation || "",
        tier || "",
        entry.point_value,
        available ? "TRUE" : "FALSE", // Google Sheets checkbox format
      ])
    })

    // Write data to sheet
    const escapedSheetName = actualSheetName.includes(' ') || actualSheetName.includes("'") || actualSheetName.includes('!')
      ? `'${actualSheetName.replace(/'/g, "''")}'`
      : actualSheetName

    await sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheet_id,
      range: `${escapedSheetName}!A1`,
      valueInputOption: "RAW",
      requestBody: {
        values: rows,
      },
    })

    // Apply formatting
    const formattingRequests: any[] = []

    // Format metadata row (row 1) - gray background, italic
    formattingRequests.push({
      updateCells: {
        range: {
          sheetId: sheet.sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: 3,
        },
        rows: [{
          values: Array(3).fill({
            userEnteredFormat: {
              backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
              textFormat: { italic: true, fontSize: 9 },
            },
          }),
        }],
        fields: "userEnteredFormat",
      },
    })

    // Format header row (row 2) - bold, colored background, centered
    formattingRequests.push({
      updateCells: {
        range: {
          sheetId: sheet.sheetId,
          startRowIndex: 1,
          endRowIndex: 2,
          startColumnIndex: 0,
          endColumnIndex: headers.length,
        },
        rows: [{
          values: headers.map(() => ({
            userEnteredFormat: {
              backgroundColor: { red: 0.2, green: 0.4, blue: 0.8 },
              textFormat: { bold: true, foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 } },
              horizontalAlignment: "CENTER",
            },
          })),
        }],
        fields: "userEnteredFormat",
      },
    })

    // Format data rows - alternating row colors, borders
    const dataStartRow = 2
    const dataEndRow = rows.length
    
    formattingRequests.push({
      updateCells: {
        range: {
          sheetId: sheet.sheetId,
          startRowIndex: dataStartRow,
          endRowIndex: dataEndRow,
          startColumnIndex: 0,
          endColumnIndex: headers.length,
        },
        rows: Array(dataEndRow - dataStartRow).fill(null).map((_, rowIdx) => ({
          values: headers.map((_, colIdx) => ({
            userEnteredFormat: {
              backgroundColor: rowIdx % 2 === 0 
                ? { red: 1.0, green: 1.0, blue: 1.0 }
                : { red: 0.98, green: 0.98, blue: 0.98 },
              borders: {
                top: { style: "SOLID", width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
                bottom: { style: "SOLID", width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
                left: { style: "SOLID", width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
                right: { style: "SOLID", width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
              },
            },
          })),
        })),
        fields: "userEnteredFormat",
      },
    })

    // Format Type columns with colors (Type 1 and Type 2)
    const typeColors: Record<string, { r: number; g: number; b: number }> = {
      normal: { r: 0.66, g: 0.65, b: 0.48 },
      fire: { r: 0.93, g: 0.51, b: 0.19 },
      water: { r: 0.39, g: 0.56, b: 0.88 },
      electric: { r: 0.97, g: 0.82, b: 0.17 },
      grass: { r: 0.48, g: 0.78, b: 0.30 },
      ice: { r: 0.59, g: 0.85, b: 0.84 },
      fighting: { r: 0.76, g: 0.18, b: 0.18 },
      poison: { r: 0.64, g: 0.24, b: 0.63 },
      ground: { r: 0.89, g: 0.75, b: 0.39 },
      flying: { r: 0.66, g: 0.56, b: 0.95 },
      psychic: { r: 0.98, g: 0.33, b: 0.50 },
      bug: { r: 0.65, g: 0.73, b: 0.10 },
      rock: { r: 0.71, g: 0.63, b: 0.21 },
      ghost: { r: 0.45, g: 0.34, b: 0.59 },
      dragon: { r: 0.44, g: 0.21, b: 0.99 },
      dark: { r: 0.44, g: 0.34, b: 0.28 },
      steel: { r: 0.72, g: 0.72, b: 0.81 },
      fairy: { r: 0.84, g: 0.52, b: 0.68 },
    }

    // Apply type colors to Type 1 and Type 2 columns (columns I and J, index 8 and 9)
    for (let rowIdx = dataStartRow; rowIdx < dataEndRow; rowIdx++) {
      const type1 = rows[rowIdx]?.[8]?.toLowerCase() || ""
      const type2 = rows[rowIdx]?.[9]?.toLowerCase() || ""
      
      if (type1 && typeColors[type1]) {
        formattingRequests.push({
          updateCells: {
            range: {
              sheetId: sheet.sheetId,
              startRowIndex: rowIdx,
              endRowIndex: rowIdx + 1,
              startColumnIndex: 8,
              endColumnIndex: 9,
            },
            rows: [{
              values: [{
                userEnteredFormat: {
                  backgroundColor: typeColors[type1],
                  textFormat: { bold: true, foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 } },
                  horizontalAlignment: "CENTER",
                },
              }],
            }],
            fields: "userEnteredFormat",
          },
        })
      }
      
      if (type2 && typeColors[type2]) {
        formattingRequests.push({
          updateCells: {
            range: {
              sheetId: sheet.sheetId,
              startRowIndex: rowIdx,
              endRowIndex: rowIdx + 1,
              startColumnIndex: 9,
              endColumnIndex: 10,
            },
            rows: [{
              values: [{
                userEnteredFormat: {
                  backgroundColor: typeColors[type2],
                  textFormat: { bold: true, foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 } },
                  horizontalAlignment: "CENTER",
                },
              }],
            }],
            fields: "userEnteredFormat",
          },
        })
      }
    }

    // Set column widths
    const columnWidths = [
      { startIndex: 0, endIndex: 1, width: 50 },   // Dex
      { startIndex: 1, endIndex: 2, width: 120 }, // Name
      { startIndex: 2, endIndex: 8, width: 60 },  // Stats (HP, Atk, Def, SpA, SpD, Spe)
      { startIndex: 8, endIndex: 10, width: 80 }, // Types
      { startIndex: 10, endIndex: 11, width: 80 }, // Generation
      { startIndex: 11, endIndex: 12, width: 80 }, // Tier
      { startIndex: 12, endIndex: 13, width: 70 }, // Points
      { startIndex: 13, endIndex: 14, width: 80 }, // Available
    ]

    columnWidths.forEach(({ startIndex, endIndex, width }) => {
      formattingRequests.push({
        updateDimensionProperties: {
          range: {
            sheetId: sheet.sheetId,
            dimension: "COLUMNS",
            startIndex,
            endIndex,
          },
          properties: {
            pixelSize: width,
          },
          fields: "pixelSize",
        },
      })
    })

    // Freeze header rows and first column
    formattingRequests.push({
      updateSheetProperties: {
        properties: {
          sheetId: sheet.sheetId,
          gridProperties: {
            frozenRowCount: 2,
            frozenColumnCount: 1,
          },
        },
        fields: "gridProperties.frozenRowCount,gridProperties.frozenColumnCount",
      },
    })

    // Convert Available column to checkboxes (column N, index 13)
    formattingRequests.push({
      repeatCell: {
        range: {
          sheetId: sheet.sheetId,
          startRowIndex: dataStartRow,
          endRowIndex: dataEndRow,
          startColumnIndex: 13,
          endColumnIndex: 14,
        },
        cell: {
          dataValidation: {
            condition: {
              type: "BOOLEAN",
            },
            showCustomUi: true,
          },
        },
        fields: "dataValidation",
      },
    })

    // Apply all formatting
    if (formattingRequests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: spreadsheet_id,
        requestBody: {
          requests: formattingRequests,
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully exported ${draftPoolData.length} Pokémon to table format in sheet "${actualSheetName}"`,
      sheet_name: actualSheetName,
      sheet_url: `https://docs.google.com/spreadsheets/d/${spreadsheet_id}/edit#gid=${sheet.sheetId}`,
      stats: {
        total: draftPoolData.length,
        available: draftPoolData.filter(p => p.status === "available" || !p.status).length,
        banned: draftPoolData.filter(p => p.status === "banned").length,
      },
      metadata: {
        season_id: seasonId,
        season_name: season.name || null,
        season_identifier: season.season_id || null,
        created_by: user.id,
        created_by_email: user.email,
        created_at: new Date().toISOString(),
      },
    })
  } catch (error: any) {
    console.error("[Export Sheets Table API] Error:", error)
    return NextResponse.json(
      { 
        error: error.message || "Failed to export to Google Sheets",
        details: process.env.NODE_ENV === 'development' ? {
          message: error.message,
          stack: error.stack,
        } : undefined,
      },
      { status: 500 }
    )
  }
}
