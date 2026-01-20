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
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { spreadsheet_id, sheet_name, action } = body // action: 'create' | 'add'

    if (!spreadsheet_id) {
      return NextResponse.json({ error: "Spreadsheet ID is required" }, { status: 400 })
    }

    if (!sheet_name) {
      return NextResponse.json({ error: "Sheet name is required" }, { status: 400 })
    }

    // Get current season
    const serviceSupabase = createServiceRoleClient()
    const { data: season } = await serviceSupabase
      .from("seasons")
      .select("id, name")
      .eq("is_current", true)
      .single()

    if (!season) {
      return NextResponse.json({ error: "No active season found" }, { status: 404 })
    }

    const seasonId = season.id

    // Fetch draft pool data (including Tera banned status if column exists)
    const { data: draftPoolData, error: poolError } = await serviceSupabase
      .from("draft_pool")
      .select("pokemon_name, pokemon_id, point_value, status, generation, is_tera_banned, tera_captain_eligible")
      .eq("season_id", seasonId)
      .order("point_value", { ascending: false })
      .order("pokemon_id", { ascending: true })

    if (poolError) {
      return NextResponse.json(
        { error: `Failed to fetch draft pool: ${poolError.message}` },
        { status: 500 }
      )
    }

    // Get credentials
    const credentials = getGoogleServiceAccountCredentials()
    if (!credentials) {
      return NextResponse.json(
        { error: "Google Sheets credentials not configured" },
        { status: 500 }
      )
    }

    // Authenticate with Google Sheets (need write access)
    const serviceAccountAuth = new JWT({
      email: credentials.email,
      key: credentials.privateKey,
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets", // Write access
        "https://www.googleapis.com/auth/drive.readonly",
      ],
    })

    const doc = new GoogleSpreadsheet(spreadsheet_id, serviceAccountAuth)
    await doc.loadInfo()

    const sheets = google.sheets({ version: "v4", auth: serviceAccountAuth })

    // Group Pokémon by point value and status
    const pokemonByPointValue = new Map<number, Array<{ name: string; status: string }>>()
    const bannedPokemon: string[] = []
    const teraBannedPokemon: string[] = []

    draftPoolData?.forEach((entry: any) => {
      if (entry.status === "banned") {
        bannedPokemon.push(entry.pokemon_name)
      } else if (entry.status === "available" || !entry.status) {
        // Check if Tera banned (check both is_tera_banned and tera_captain_eligible)
        const isTeraBanned = 
          entry.is_tera_banned === true || 
          entry.tera_captain_eligible === false
        
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
    if (!sheet) {
      if (action === "create") {
        sheet = await doc.addSheet({ title: sheet_name })
      } else {
        return NextResponse.json(
          { error: `Sheet "${sheet_name}" not found. Use action: "create" to create a new sheet.` },
          { status: 404 }
        )
      }
    }

    // Clear existing sheet data (optional - you may want to preserve some structure)
    await sheet.clear()

    // Build the sheet structure matching Draft Board format
    const maxRows = Math.max(
      ...Array.from(pokemonByPointValue.values()).map((arr) => arr.length),
      bannedPokemon.length,
      teraBannedPokemon.length,
      10 // Minimum rows for headers
    )

    // Initialize empty grid (rows 0-3 for headers, row 4+ for data)
    const grid: (string | null)[][] = Array(maxRows + 5)
      .fill(null)
      .map(() => Array(73).fill(null))

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
    let currentRow = 4
    for (let pointValue = 20; pointValue >= 1; pointValue--) {
      const headerCol = 8 + (20 - pointValue) * 3
      const pokemonCol = headerCol + 1
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
    for (let startRow = 0; startRow < grid.length; startRow += batchSize) {
      const endRow = Math.min(startRow + batchSize, grid.length)
      const batch = grid.slice(startRow, endRow)
      const range = `${sheet_name}!A${startRow + 1}:${lastColumn}${endRow}`

      values.push({
        range,
        values: batch,
      })
    }

    // Batch update the sheet
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

    return NextResponse.json({
      success: true,
      message: `Successfully exported ${draftPoolData?.length || 0} Pokémon to sheet "${sheet_name}"`,
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
        created_by: user.id,
        created_by_email: user.email,
        created_at: new Date().toISOString(),
      },
    })
  } catch (error: any) {
    console.error("[Export Sheets API] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to export to Google Sheets" },
      { status: 500 }
    )
  }
}
