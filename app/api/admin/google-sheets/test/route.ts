import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getGoogleServiceAccountCredentials } from "@/lib/utils/google-sheets"

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { spreadsheet_id } = body

    if (!spreadsheet_id) {
      return NextResponse.json(
        { error: "Spreadsheet ID is required" },
        { status: 400 }
      )
    }

    // Get credentials from environment variables
    const credentials = getGoogleServiceAccountCredentials()
    if (!credentials) {
      return NextResponse.json(
        { error: "Google Sheets credentials not configured. Please set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY environment variables." },
        { status: 500 }
      )
    }

    const { email: service_account_email, privateKey: service_account_private_key } = credentials

    // Try to import and test Google Sheets connection
    try {
      // Dynamic import to avoid breaking if package isn't installed
      const { GoogleSpreadsheet } = await import("google-spreadsheet")
      const { JWT } = await import("google-auth-library")

      // Authenticate with service account (both Sheets and Drive scopes)
      // Note: privateKey already has newlines replaced in getGoogleServiceAccountCredentials()
      const serviceAccountAuth = new JWT({
        email: service_account_email,
        key: service_account_private_key,
        scopes: [
          "https://www.googleapis.com/auth/spreadsheets.readonly",
          "https://www.googleapis.com/auth/drive.readonly",
        ],
      })

      const doc = new GoogleSpreadsheet(spreadsheet_id, serviceAccountAuth)

      // Try to load spreadsheet info
      await doc.loadInfo()

      // Get list of sheets
      const sheetTitles = doc.sheetsByIndex.map((sheet: any) => sheet.title)

      return NextResponse.json({
        success: true,
        message: `Successfully connected to spreadsheet: "${doc.title}"`,
        spreadsheet_title: doc.title,
        sheets_found: sheetTitles,
        sheet_count: sheetTitles.length,
      })
    } catch (googleError: any) {
      // Handle specific Google API errors
      if (googleError.message?.includes("ENOTFOUND") || googleError.message?.includes("getaddrinfo")) {
        return NextResponse.json(
          {
            success: false,
            error: "Network error. Please check your internet connection.",
            details: googleError.message,
          },
          { status: 500 }
        )
      }

      if (googleError.message?.includes("401") || googleError.message?.includes("unauthorized")) {
        return NextResponse.json(
          {
            success: false,
            error: "Authentication failed. Please check your service account credentials and ensure the sheet is shared with the service account email.",
            details: googleError.message,
          },
          { status: 401 }
        )
      }

      if (googleError.message?.includes("404") || googleError.message?.includes("not found")) {
        return NextResponse.json(
          {
            success: false,
            error: "Spreadsheet not found. Please check the spreadsheet ID and ensure it's shared with the service account.",
            details: googleError.message,
          },
          { status: 404 }
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: googleError.message || "Failed to connect to Google Sheets",
          details: googleError.toString(),
        },
        { status: 500 }
      )
    }
  } catch (error) {
    // Handle import errors (package not installed)
    if (error instanceof Error && error.message.includes("Cannot find module")) {
      return NextResponse.json(
        {
          success: false,
          error: "Google Sheets package not installed. Please install required packages.",
          details: "Run: pnpm add google-spreadsheet google-auth-library",
        },
        { status: 503 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to test connection",
      },
      { status: 500 }
    )
  }
}
