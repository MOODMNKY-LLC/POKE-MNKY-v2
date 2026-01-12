/**
 * Google Sheets Image Extractor
 * Extracts images (team logos, banners, avatars) from Google Sheets cells
 */

import { google } from "googleapis"
import { JWT } from "google-auth-library"
import { GoogleSpreadsheetWorksheet } from "google-spreadsheet"

export interface ExtractedImage {
  row: number
  column: number
  columnLetter: string
  imageUrl: string
  contentType?: string
  width?: number
  height?: number
  teamName?: string // If we can associate with team name
}

export interface ImageExtractionResult {
  images: ExtractedImage[]
  totalFound: number
  errors: string[]
}

/**
 * Extract images from a Google Sheet
 * Looks for images in cells that might contain team logos, banners, or avatars
 */
export async function extractImagesFromSheet(
  sheet: GoogleSpreadsheetWorksheet,
  spreadsheetId: string,
  auth: JWT,
  options?: {
    maxRows?: number
    columnsToCheck?: string[] // e.g., ["A", "B", "C"] or ["Logo", "Banner", "Avatar"]
    associateWithTeamColumn?: string // Column name/index to associate images with team names
  }
): Promise<ImageExtractionResult> {
  const images: ExtractedImage[] = []
  const errors: string[] = []
  const sheets = google.sheets({ version: "v4", auth })

  try {
    // Get sheet metadata to find sheet ID
    const spreadsheetMetadata = await sheets.spreadsheets.get({
      spreadsheetId,
      includeGridData: false,
    })

    const sheetMetadata = spreadsheetMetadata.data.sheets?.find(
      (s) => s.properties?.title === sheet.title
    )

    const sheetId = sheetMetadata?.properties?.sheetId
    if (sheetId === undefined) {
      errors.push(`Could not find sheet ID for "${sheet.title}"`)
      return { images, totalFound: 0, errors }
    }

    // Get embedded objects (images) from the sheet
    const maxRows = options?.maxRows || Math.min(sheet.rowCount, 1000)
    const range = `${sheet.title}!A1:Z${maxRows}`

    try {
      const response = await sheets.spreadsheets.get({
        spreadsheetId,
        ranges: [range],
        includeGridData: true,
      })

      const gridData = response.data.sheets?.[0]?.data?.[0]
      if (!gridData) {
        return { images, totalFound: 0, errors }
      }

      // Extract images from embedded objects
      const embeddedObjects = gridData.embeddedObjects || []
      
      for (const embeddedObject of embeddedObjects) {
        try {
          // Get image properties
          const imageProperties = embeddedObject.imageProperties
          const position = embeddedObject.position

          if (!position || !imageProperties) {
            continue
          }

          const rowIndex = position.overlayPosition?.anchorCell?.rowIndex ?? 0
          const columnIndex = position.overlayPosition?.anchorCell?.columnIndex ?? 0
          const columnLetter = getColumnLetter(columnIndex + 1)

          // Get image URL (embedded images are stored in Google Drive)
          // We need to construct the URL or extract it from the embedded object
          let imageUrl: string | null = null

          // Try to get image URL from embedded object
          if (embeddedObject.imageProperties?.contentUri) {
            imageUrl = embeddedObject.imageProperties.contentUri
          } else if (embeddedObject.imageProperties?.sourceUri) {
            imageUrl = embeddedObject.imageProperties.sourceUri
          }

          // If we have a team name column, try to associate the image
          let teamName: string | undefined
          if (options?.associateWithTeamColumn && gridData.rowData) {
            const teamColumnIndex = typeof options.associateWithTeamColumn === "string"
              ? parseInt(options.associateWithTeamColumn) - 1
              : sheet.headerValues?.indexOf(options.associateWithTeamColumn) ?? -1

            if (teamColumnIndex >= 0 && gridData.rowData[rowIndex]) {
              const teamCell = gridData.rowData[rowIndex].values?.[teamColumnIndex]
              if (teamCell?.effectiveValue?.stringValue) {
                teamName = teamCell.effectiveValue.stringValue
              }
            }
          }

          if (imageUrl) {
            images.push({
              row: rowIndex + 1, // 1-indexed
              column: columnIndex + 1, // 1-indexed
              columnLetter,
              imageUrl,
              contentType: imageProperties.contentUri ? "image/png" : undefined,
              width: imageProperties.size?.width?.magnitude,
              height: imageProperties.size?.height?.magnitude,
              teamName,
            })
          }
        } catch (imageError) {
          errors.push(`Error extracting image: ${imageError instanceof Error ? imageError.message : "Unknown error"}`)
        }
      }

      // Also check for images in cell values (formulas that return images)
      // This is less common but some sheets use IMAGE() formulas
      if (gridData.rowData) {
        for (let rowIndex = 0; rowIndex < gridData.rowData.length; rowIndex++) {
          const row = gridData.rowData[rowIndex]
          if (!row.values) continue

          for (let colIndex = 0; colIndex < row.values.length; colIndex++) {
            const cell = row.values[colIndex]
            
            // Check if cell has an image formula
            if (cell.userEnteredValue?.formulaValue) {
              const formula = cell.userEnteredValue.formulaValue
              // IMAGE() formula format: =IMAGE("url")
              const imageMatch = formula.match(/IMAGE\(["']([^"']+)["']\)/i)
              if (imageMatch && imageMatch[1]) {
                const columnLetter = getColumnLetter(colIndex + 1)
                
                // Try to get team name if available
                let teamName: string | undefined
                if (options?.associateWithTeamColumn) {
                  const teamColumnIndex = typeof options.associateWithTeamColumn === "string"
                    ? parseInt(options.associateWithTeamColumn) - 1
                    : sheet.headerValues?.indexOf(options.associateWithTeamColumn) ?? -1

                  if (teamColumnIndex >= 0 && gridData.rowData[rowIndex]) {
                    const teamCell = gridData.rowData[rowIndex].values?.[teamColumnIndex]
                    if (teamCell?.effectiveValue?.stringValue) {
                      teamName = teamCell.effectiveValue.stringValue
                    }
                  }
                }

                images.push({
                  row: rowIndex + 1,
                  column: colIndex + 1,
                  columnLetter,
                  imageUrl: imageMatch[1],
                  teamName,
                })
              }
            }
          }
        }
      }

    } catch (extractError) {
      errors.push(`Failed to extract images: ${extractError instanceof Error ? extractError.message : "Unknown error"}`)
    }

    return {
      images,
      totalFound: images.length,
      errors,
    }
  } catch (error) {
    errors.push(`Image extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    return { images, totalFound: 0, errors }
  }
}

/**
 * Convert column number to letter (1 -> A, 27 -> AA)
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
 * Upload extracted image to Supabase Storage and return public URL
 * For now, all images (logos, banners, avatars) are stored as logo_url
 * Future: Add banner_url and avatar_url columns to teams table
 */
export async function uploadImageToStorage(
  imageUrl: string,
  teamName: string,
  imageType: "logo" | "banner" | "avatar",
  supabase: any
): Promise<string | null> {
  try {
    // Fetch image from Google Sheets
    // Handle both direct URLs and Google Drive URLs
    let fetchUrl = imageUrl
    
    // If it's a Google Drive file ID, construct the download URL
    if (imageUrl.includes("drive.google.com") || imageUrl.match(/^[a-zA-Z0-9_-]{20,}$/)) {
      const fileId = imageUrl.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1] || imageUrl
      fetchUrl = `https://drive.google.com/uc?export=download&id=${fileId}`
    }

    const imageResponse = await fetch(fetchUrl)
    if (!imageResponse.ok) {
      // Try alternative method for Google Drive images
      if (imageUrl.includes("drive.google.com")) {
        const fileId = imageUrl.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1]
        if (fileId) {
          fetchUrl = `https://lh3.googleusercontent.com/d/${fileId}`
          const retryResponse = await fetch(fetchUrl)
          if (!retryResponse.ok) {
            throw new Error(`Failed to fetch image: ${imageResponse.statusText}`)
          }
        } else {
          throw new Error(`Failed to fetch image: ${imageResponse.statusText}`)
        }
      } else {
        throw new Error(`Failed to fetch image: ${imageResponse.statusText}`)
      }
    }

    const imageBlob = await imageResponse.blob()
    const imageBuffer = await imageResponse.arrayBuffer()

    // Generate filename
    const sanitizedTeamName = teamName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()
    const extension = imageBlob.type.split("/")[1] || "png"
    const filename = `${sanitizedTeamName}_${imageType}.${extension}`

    // Upload to Supabase Storage (create bucket if needed)
    const { data, error } = await supabase.storage
      .from("team-assets")
      .upload(filename, imageBuffer, {
        contentType: imageBlob.type,
        upsert: true,
      })

    if (error) {
      // If bucket doesn't exist, try to create it (this might fail if user doesn't have permissions)
      if (error.message?.includes("Bucket not found")) {
        console.warn(`[Image Upload] Bucket "team-assets" not found. Please create it in Supabase Storage.`)
        return null
      }
      throw error
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("team-assets")
      .getPublicUrl(filename)

    return urlData.publicUrl
  } catch (error) {
    console.error(`[Image Upload] Failed to upload image for ${teamName}:`, error)
    return null
  }
}
