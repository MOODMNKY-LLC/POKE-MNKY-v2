import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getGoogleServiceAccountCredentials } from "@/lib/utils/google-sheets"
import { GoogleSpreadsheet } from "google-spreadsheet"
import { JWT } from "google-auth-library"
import { google } from "googleapis"

/**
 * POST /api/admin/pokemon/export-sheets/check
 * Check if a sheet exists and return information about it
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { spreadsheet_id, sheet_name } = body

    if (!spreadsheet_id) {
      return NextResponse.json({ error: "Spreadsheet ID is required" }, { status: 400 })
    }

    if (!sheet_name) {
      return NextResponse.json({ error: "Sheet name is required" }, { status: 400 })
    }

    // Get credentials
    const credentials = getGoogleServiceAccountCredentials()
    if (!credentials) {
      return NextResponse.json(
        { error: "Google Sheets credentials not configured" },
        { status: 500 }
      )
    }

    // Authenticate with Google Sheets
    const serviceAccountAuth = new JWT({
      email: credentials.email,
      key: credentials.privateKey,
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets.readonly",
        "https://www.googleapis.com/auth/drive.readonly",
      ],
    })

    const doc = new GoogleSpreadsheet(spreadsheet_id, serviceAccountAuth)
    await doc.loadInfo()

    // Check if sheet exists
    const sheet = doc.sheetsByTitle[sheet_name]
    
    if (!sheet) {
      return NextResponse.json({
        exists: false,
        message: `Sheet "${sheet_name}" does not exist`,
      })
    }

    // Get sheet info
    await sheet.loadCells("A1:Z100") // Load first 100 rows to check for data
    
    // Count rows with data (check first column)
    let rowCount = 0
    for (let row = 0; row < 100; row++) {
      const cell = sheet.getCell(row, 0)
      if (cell.value !== null && cell.value !== "") {
        rowCount = row + 1
      }
    }

    // Get more accurate row count by checking the sheet's actual row count
    const actualRowCount = sheet.rowCount

    return NextResponse.json({
      exists: true,
      sheet_name: sheet_name,
      row_count: actualRowCount,
      approximate_data_rows: rowCount,
      last_modified: sheet.modified ? new Date(sheet.modified).toLocaleString() : "Unknown",
      message: `Sheet "${sheet_name}" exists with approximately ${actualRowCount} rows`,
    })
  } catch (error: any) {
    console.error("[Export Sheets Check API] Error:", error)
    return NextResponse.json(
      { 
        error: error.message || "Failed to check sheet",
        exists: false,
      },
      { status: 500 }
    )
  }
}
