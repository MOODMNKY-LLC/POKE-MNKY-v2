import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getGoogleServiceAccountCredentials } from "@/lib/utils/google-sheets"
import { GoogleSpreadsheet } from "google-spreadsheet"
import { JWT } from "google-auth-library"
import { google } from "googleapis"

/**
 * Auto-detect sheets and intelligently map them to database tables
 * POST /api/admin/google-sheets/detect
 */
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
      return NextResponse.json({ error: "Spreadsheet ID is required" }, { status: 400 })
    }

    // Get credentials from environment variables
    const credentials = getGoogleServiceAccountCredentials()
    if (!credentials) {
      return NextResponse.json(
        { error: "Google Sheets credentials not configured" },
        { status: 500 }
      )
    }

    // Authenticate with Google Sheets and Drive (Drive needed for metadata and images)
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

    // Also use Google Sheets API v4 for images and comments
    const sheets = google.sheets({ version: "v4", auth: serviceAccountAuth })
    
    // Get spreadsheet metadata including images and comments
    const spreadsheetMetadata = await sheets.spreadsheets.get({
      spreadsheetId: spreadsheet_id,
      includeGridData: false,
    })

    // Detect all sheets and analyze their structure
    const detectedSheets = await Promise.all(
      doc.sheetsByIndex.map(async (sheet) => {
        let headers: string[] = []
        let rowCount = 0
        let headerWarning: string | null = null
        let hasHeaders = true

        try {
          // Try to load header row (first row)
          await sheet.loadHeaderRow()
          headers = sheet.headerValues || []
          
          // Check if headers are actually empty
          if (!headers || headers.length === 0 || headers.every(h => !h || h.trim() === "")) {
            hasHeaders = false
            headerWarning = "No headers found in first row"
          }
        } catch (headerError: any) {
          const errorMsg = headerError.message?.toLowerCase() || ""
          
          // Handle duplicate header error
          if (errorMsg.includes("duplicate header") || errorMsg.includes("duplicate")) {
            headerWarning = headerError.message
            
            // Fallback: Get first row manually and make headers unique
            try {
              await sheet.loadCells("A1:Z1")
              const firstRow: string[] = []
              for (let col = 0; col < 26; col++) {
                const cell = sheet.getCell(0, col)
                if (cell.value) {
                  firstRow.push(String(cell.value))
                } else {
                  break
                }
              }
              
              // Make headers unique by appending numbers to duplicates
              const seen = new Map<string, number>()
              headers = firstRow.map((header) => {
                const normalized = header.trim()
                if (!normalized) return ""
                
                const count = seen.get(normalized) || 0
                seen.set(normalized, count + 1)
                
                if (count === 0) {
                  return normalized
                } else {
                  return `${normalized} (${count + 1})`
                }
              }).filter(Boolean)
              
              if (headers.length === 0) {
                hasHeaders = false
                headerWarning = "No headers found in first row"
              }
            } catch (fallbackError) {
              console.error(`Failed to load headers for sheet "${sheet.title}":`, fallbackError)
              headers = []
              hasHeaders = false
              headerWarning = "Could not read headers from first row"
            }
          } 
          // Handle empty header row error
          else if (errorMsg.includes("no values") || errorMsg.includes("fill the first row") || errorMsg.includes("header row")) {
            hasHeaders = false
            headerWarning = "No headers found in first row - sheet may be empty or headers are missing"
            
            // Try to detect columns by checking if there's any data
            try {
              await sheet.loadCells("A1:Z10")
              const detectedColumns: string[] = []
              for (let col = 0; col < 26; col++) {
                let hasData = false
                for (let row = 0; row < Math.min(10, sheet.rowCount); row++) {
                  const cell = sheet.getCell(row, col)
                  if (cell.value && String(cell.value).trim() !== "") {
                    hasData = true
                    break
                  }
                }
                if (hasData) {
                  detectedColumns.push(`Column ${getColumnLetter(col + 1)}`)
                } else {
                  break
                }
              }
              headers = detectedColumns
            } catch (detectError) {
              // If we can't detect columns, just mark as no headers
              headers = []
            }
          } else {
            // Re-throw if it's a different error
            throw headerError
          }
        }

        rowCount = sheet.rowCount || 0

        // Only suggest table mapping if we have headers
        let suggestedTable = { table: "", confidence: 0, columnMapping: {} as Record<string, string> }
        if (hasHeaders && headers.length > 0) {
          suggestedTable = suggestTableMapping(sheet.title, headers)
        }

        // Count images and comments using Sheets API v4
        let imagesCount = 0
        let commentsCount = 0
        
        try {
          const sheetMetadata = spreadsheetMetadata.data.sheets?.find(
            (s) => s.properties?.title === sheet.title
          )
          
          const sheetId = sheetMetadata?.properties?.sheetId
          
          if (sheetId !== undefined) {
            // Count embedded objects (images, charts, etc.)
            try {
              const embeddedObjects = await sheets.spreadsheets.get({
                spreadsheetId: spreadsheet_id,
                includeGridData: false,
                ranges: [`${sheet.title}!A1:Z1000`],
              })
              
              const sheetData = embeddedObjects.data.sheets?.[0]
              if (sheetData) {
                // Count charts
                imagesCount += sheetData.charts?.length || 0
                
                // Count embedded objects (images)
                imagesCount += sheetData.embeddedObjects?.length || 0
              }
            } catch (imagesError) {
              // Images might not be accessible
              console.log(`Could not fetch images for sheet "${sheet.title}":`, imagesError)
            }
            
            // Get comments count
            try {
              const commentsResponse = await sheets.spreadsheets.comments.list({
                spreadsheetId: spreadsheet_id,
              })
              
              const sheetComments = commentsResponse.data.comments?.filter(
                (comment) => {
                  const anchor = comment.anchor
                  return anchor?.sheetId === sheetId || 
                         (anchor?.startRowIndex !== undefined && anchor?.startColumnIndex !== undefined)
                }
              ) || []
              commentsCount = sheetComments.length
            } catch (commentsError) {
              // Comments API might not be available or accessible
              console.log(`Could not fetch comments for sheet "${sheet.title}":`, commentsError)
            }
          }
        } catch (metadataError) {
          console.log(`Could not fetch metadata for sheet "${sheet.title}":`, metadataError)
        }

        return {
          sheet_name: sheet.title,
          sheet_index: sheet.index,
          headers,
          row_count: rowCount,
          suggested_table: suggestedTable.table,
          confidence: suggestedTable.confidence,
          column_mapping: suggestedTable.columnMapping,
          range: headers.length > 0 
            ? `A1:${getColumnLetter(headers.length)}${Math.min(rowCount + 1, 1000)}`
            : `A1:Z${Math.min(rowCount + 1, 1000)}`,
          warning: headerWarning,
          has_headers: hasHeaders,
          images_count: imagesCount,
          comments_count: commentsCount,
        }
      })
    )

    return NextResponse.json({
      success: true,
      spreadsheet_title: doc.title,
      spreadsheet_id,
      sheets: detectedSheets,
    })
  } catch (error: any) {
    console.error("Error detecting sheets:", error)

    if (error.message?.includes("401") || error.message?.includes("unauthorized")) {
      return NextResponse.json(
        { error: "Authentication failed. Please check credentials and ensure the sheet is shared with the service account." },
        { status: 401 }
      )
    }

    if (error.message?.includes("404") || error.message?.includes("not found")) {
      return NextResponse.json(
        { error: "Spreadsheet not found. Please check the spreadsheet ID." },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: error.message || "Failed to detect sheets" },
      { status: 500 }
    )
  }
}

/**
 * Convert column number to letter (1 -> A, 27 -> AA, etc.)
 */
function getColumnLetter(columnNumber: number): string {
  let result = ""
  while (columnNumber > 0) {
    columnNumber--
    result = String.fromCharCode(65 + (columnNumber % 26)) + result
    columnNumber = Math.floor(columnNumber / 26)
  }
  return result || "A"
}

/**
 * Intelligently suggest table mapping based on sheet name and column headers
 */
function suggestTableMapping(
  sheetName: string,
  headers: string[]
): { table: string; confidence: number; columnMapping: Record<string, string> } {
  const normalizedName = sheetName.toLowerCase().trim()
  const normalizedHeaders = headers.map((h) => h.toLowerCase().trim())

  // Pattern matching for common sheet names
  const patterns: Array<{
    keywords: string[]
    table: string
    confidence: number
    columnHints: Record<string, string[]>
  }> = [
    {
      keywords: ["standings", "ranking", "leaderboard", "rank"],
      table: "teams",
      confidence: 0.9,
      columnHints: {
        name: ["team", "team name", "name"],
        coach_name: ["coach", "coach name"],
        wins: ["wins", "w"],
        losses: ["losses", "l", "loss"],
        differential: ["differential", "diff", "difference"],
        division: ["division", "div"],
        conference: ["conference", "conf"],
      },
    },
    {
      keywords: ["draft", "roster", "picks", "draft results"],
      table: "team_rosters",
      confidence: 0.9,
      columnHints: {
        team_id: ["team", "team name"],
        pokemon_id: ["pokemon", "pick", "pokémon"],
        draft_round: ["round", "pick number"],
        draft_order: ["order", "pick order"],
        draft_points: ["cost", "points", "price"],
      },
    },
    {
      keywords: ["match", "battle", "week", "game", "results"],
      table: "matches",
      confidence: 0.85,
      columnHints: {
        team1_id: ["team 1", "team1", "team a", "home team"],
        team2_id: ["team 2", "team2", "team b", "away team"],
        winner_id: ["winner", "winning team"],
        week: ["week", "week number"],
        team1_score: ["score 1", "team 1 score", "home score"],
        team2_score: ["score 2", "team 2 score", "away score"],
      },
    },
  ]

  // Find best match
  let bestMatch = { table: "", confidence: 0, columnMapping: {} as Record<string, string> }

  for (const pattern of patterns) {
    const nameMatch = pattern.keywords.some((keyword) => normalizedName.includes(keyword))
    if (nameMatch) {
      const columnMapping: Record<string, string> = {}

      // Map columns based on hints
      for (const [dbColumn, hints] of Object.entries(pattern.columnHints)) {
        const matchedHeader = normalizedHeaders.find((h) =>
          hints.some((hint) => h.includes(hint) || hint.includes(h))
        )
        if (matchedHeader) {
          const originalHeader = headers[normalizedHeaders.indexOf(matchedHeader)]
          columnMapping[originalHeader] = dbColumn
        }
      }

      if (pattern.confidence > bestMatch.confidence) {
        bestMatch = {
          table: pattern.table,
          confidence: pattern.confidence,
          columnMapping,
        }
      }
    }
  }

  // If no match found, default to empty
  if (bestMatch.table === "") {
    return { table: "", confidence: 0, columnMapping: {} }
  }

  return bestMatch
}
