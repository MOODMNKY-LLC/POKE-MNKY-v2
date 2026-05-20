import { NextResponse } from "next/server"
import { syncLeagueData } from "@/lib/google-sheets-sync"
import { syncTeamPageRosters } from "@/lib/sync-team-page-rosters"
import { syncTeamSheetMatches } from "@/lib/sync-team-sheet-matches"
import { redisCache, CacheKeys } from "@/lib/cache/redis"
import { isRecommendedTeamsSyncSheet } from "@/lib/google-sheets-sheet-policy"
import { isBenignSheetSyncMessage } from "@/lib/google-sheets-sheet-utils"
import { createServerClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { extractImagesFromSheet, uploadImageToStorage } from "@/lib/google-sheets-image-extractor"
import { getGoogleServiceAccountCredentials } from "@/lib/utils/google-sheets"
import { GoogleSpreadsheet } from "google-spreadsheet"
import { JWT } from "google-auth-library"

export async function POST(request: Request) {
  try {
    // Check authentication
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // TODO: Add admin role check here

    // Use service role client for config lookup (bypasses RLS)
    const serviceSupabase = createServiceRoleClient()

    // Get Google Sheets configuration from database
    // For manual sync, we don't require enabled=true (manual sync works regardless)
    const { data: config, error: configError } = await serviceSupabase
      .from("google_sheets_config")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (configError || !config) {
      return NextResponse.json(
        {
          error: "Google Sheets sync not configured",
          message:
            "Please configure Google Sheets sync in the admin panel at /admin/google-sheets",
        },
        { status: 400 }
      )
    }

    if (!config.spreadsheet_id) {
      return NextResponse.json(
        {
          error: "Spreadsheet ID not configured",
          message: "Please set a spreadsheet ID in the configuration",
        },
        { status: 400 }
      )
    }

    // Get sheet mappings
    const { data: mappingsData, error: mappingsError } = await serviceSupabase
      .from("sheet_mappings")
      .select("*")
      .eq("config_id", config.id)
      .eq("enabled", true)
      .order("sync_order")

    if (mappingsError) {
      console.error("[Sync] Error fetching mappings:", mappingsError)
      return NextResponse.json(
        {
          error: "Failed to fetch sheet mappings",
          message: mappingsError.message || "Could not retrieve sheet mappings from database",
        },
        { status: 500 }
      )
    }

    // Check if we have any enabled mappings
    if (!mappingsData || mappingsData.length === 0) {
      return NextResponse.json(
        {
          error: "No enabled sheet mappings found",
          message: "Please enable at least one sheet mapping in the configuration",
        },
        { status: 400 }
      )
    }

    // Transform database mappings to sync function format
    const mappings = mappingsData
      .filter((m: any) => m.sheet_name && m.table_name) // Filter out invalid mappings
      .map((m: any) => ({
        sheet_name: m.sheet_name,
        table_name: m.table_name,
        range: m.range || "A:Z",
        enabled: m.enabled !== false, // Ensure boolean
        sync_order: m.sync_order || 0,
        column_mapping: (typeof m.column_mapping === "object" && m.column_mapping !== null) 
          ? m.column_mapping 
          : {},
      }))

    // Check again after filtering invalid mappings
    if (mappings.length === 0) {
      return NextResponse.json(
        {
          error: "No valid sheet mappings found",
          message: "Please configure at least one sheet mapping with both sheet name and table name",
        },
        { status: 400 }
      )
    }

    console.log(`[Sync] Starting sync for spreadsheet: ${config.spreadsheet_id}`)
    console.log(`[Sync] Found ${mappings.length} enabled mapping(s):`, mappings.map((m: any) => `${m.sheet_name} → ${m.table_name}`).join(", "))

    try {
      // Perform sync with stored config and mappings (credentials from env vars)
      const result = await syncLeagueData(
        config.spreadsheet_id,
        mappings,
      )

      let rosterSync = { teamsProcessed: 0, picksWritten: 0, errors: [] as string[] }
      let matchSync = { teamsProcessed: 0, matchesWritten: 0, errors: [] as string[] }
      const syncedTeamsTab = mappings.some(
        (m) => m.table_name === "teams" && isRecommendedTeamsSyncSheet(m.sheet_name)
      )
      if (syncedTeamsTab && result.recordsProcessed > 0) {
        try {
          const credentials = getGoogleServiceAccountCredentials()
          if (credentials) {
            const serviceAccountAuth = new JWT({
              email: credentials.email,
              key: credentials.privateKey,
              scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
            })
            const doc = new GoogleSpreadsheet(config.spreadsheet_id, serviceAccountAuth)
            await doc.loadInfo()
            const sheetTitles = doc.sheetsByIndex.map((s) => s.title)
            rosterSync = await syncTeamPageRosters(
              serviceSupabase,
              config.spreadsheet_id,
              sheetTitles
            )
            console.log(
              `[Sync] Team page rosters: ${rosterSync.picksWritten} picks across ${rosterSync.teamsProcessed} teams`
            )
            matchSync = await syncTeamSheetMatches(
              serviceSupabase,
              config.spreadsheet_id,
              sheetTitles
            )
            console.log(
              `[Sync] Team sheet matches: ${matchSync.matchesWritten} matches across ${matchSync.teamsProcessed} teams`
            )
          }
        } catch (rosterErr) {
          const msg =
            rosterErr instanceof Error ? rosterErr.message : "Team page roster/match sync failed"
          rosterSync.errors.push(msg)
          matchSync.errors.push(msg)
          console.error("[Sync] Team page roster/match sync:", msg)
        }
      }

      // Extract and upload images from sheets
      let imagesExtracted = 0
      const imageErrors: string[] = []

      try {
        const credentials = getGoogleServiceAccountCredentials()
        if (credentials) {
          const serviceAccountAuth = new JWT({
            email: credentials.email,
            key: credentials.privateKey,
            scopes: [
              "https://www.googleapis.com/auth/spreadsheets.readonly",
              "https://www.googleapis.com/auth/drive.readonly",
            ],
          })

          const doc = new GoogleSpreadsheet(config.spreadsheet_id, serviceAccountAuth)
          await doc.loadInfo()

          // Extract images only from the canonical Data tab (avoids Team 1–12 / empty sheets)
          for (const mapping of mappings) {
            if (
              mapping.table_name === "teams" &&
              isRecommendedTeamsSyncSheet(mapping.sheet_name)
            ) {
              try {
                const sheet = doc.sheetsByTitle[mapping.sheet_name] || 
                             doc.sheetsByIndex.find((s) => s.title === mapping.sheet_name)

                if (!sheet) continue

                const imageResult = await extractImagesFromSheet(
                  sheet,
                  config.spreadsheet_id,
                  serviceAccountAuth,
                  {
                    maxRows: 100,
                    associateWithTeamColumn: "name",
                  }
                )

                // Upload images to Supabase Storage and update team records
                for (const image of imageResult.images) {
                  if (image.teamName) {
                    try {
                      // Determine image type based on column or position
                      let imageType: "logo" | "banner" | "avatar" = "logo"
                      const columnLower = image.columnLetter.toLowerCase()
                      if (columnLower.includes("banner")) {
                        imageType = "banner"
                      } else if (columnLower.includes("avatar")) {
                        imageType = "avatar"
                      }

                      const publicUrl = await uploadImageToStorage(
                        image.imageUrl,
                        image.teamName,
                        imageType,
                        serviceSupabase
                      )

                      if (publicUrl) {
                        // Update team record with image URL
                        // For now, all images go to logo_url (banner_url and avatar_url columns don't exist yet)
                        await serviceSupabase
                          .from("teams")
                          .update({ logo_url: publicUrl })
                          .eq("name", image.teamName)

                        imagesExtracted++
                        console.log(`[Sync] Uploaded ${imageType} image for team "${image.teamName}": ${publicUrl}`)
                      }
                    } catch (imageError) {
                      imageErrors.push(`Failed to upload image for ${image.teamName}: ${imageError instanceof Error ? imageError.message : "Unknown error"}`)
                    }
                  }
                }

                if (imageResult.errors.length > 0) {
                  imageErrors.push(...imageResult.errors)
                }
              } catch (sheetError) {
                imageErrors.push(`Failed to extract images from "${mapping.sheet_name}": ${sheetError instanceof Error ? sheetError.message : "Unknown error"}`)
              }
            }
          }
        }
      } catch (imageExtractionError) {
        console.error("[Sync] Image extraction failed:", imageExtractionError)
        imageErrors.push(`Image extraction failed: ${imageExtractionError instanceof Error ? imageExtractionError.message : "Unknown error"}`)
      }

      const allErrors = [...result.errors, ...rosterSync.errors, ...matchSync.errors, ...imageErrors]

      // Update last sync timestamp (use service client)
      await serviceSupabase
        .from("google_sheets_config")
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: result.success ? (allErrors.length > 0 ? "partial" : "success") : "error",
        })
        .eq("id", config.id)

      const criticalErrors = allErrors.filter((e) => !isBenignSheetSyncMessage(e))
      const warningCount = allErrors.length - criticalErrors.length

      if (result.recordsProcessed > 0 && redisCache.isEnabled()) {
        await redisCache.del(CacheKeys.homepageBundle).catch((e) =>
          console.warn("[Sync] Homepage cache clear failed:", e)
        )
      }

      const responseMessage =
        result.recordsProcessed > 0
          ? `Successfully synced ${result.recordsProcessed} team record(s)${rosterSync.picksWritten > 0 ? ` and ${rosterSync.picksWritten} roster pick(s) from Team pages` : ""}${matchSync.matchesWritten > 0 ? ` and ${matchSync.matchesWritten} match(es) from Team schedules` : ""}${imagesExtracted > 0 ? ` and extracted ${imagesExtracted} image(s)` : ""}${
              warningCount > 0
                ? ` (${warningCount} optional sheet skipped — use "Select recommended" to sync Data only)`
                : ""
            }`
          : allErrors.length > 0
            ? `Sync completed with ${allErrors.length} issue(s) and no records written`
            : "Sync completed"

      return NextResponse.json({
        success: result.success,
        message: responseMessage,
        recordsProcessed: result.recordsProcessed,
        imagesExtracted,
        errors: allErrors.slice(0, 10),
        warnings: result.warnings?.slice(0, 10),
      })
    } catch (syncError) {
      console.error("[Sync] Sync error:", syncError)
      
      // Update config with error status
      const errorMessage = syncError instanceof Error ? syncError.message : "Unknown sync error"
      await serviceSupabase
        .from("google_sheets_config")
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: "error",
        })
        .eq("id", config.id)

      return NextResponse.json(
        { 
          success: false,
          error: errorMessage,
          message: `Sync failed: ${errorMessage}`,
          recordsProcessed: 0,
          errors: [errorMessage],
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("[Sync] Fatal error:", error)
    const errorMessage = error instanceof Error ? error.message : "Sync failed"
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        message: `Sync failed: ${errorMessage}`,
        recordsProcessed: 0,
        errors: [errorMessage],
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  // Return sync status/history
  try {
    const supabase = await createServerClient()
    const { data: logs, error } = await supabase
      .from("sync_log")
      .select("*")
      .order("synced_at", { ascending: false })
      .limit(10)

    if (error) throw error

    return NextResponse.json({ logs })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch logs" },
      { status: 500 },
    )
  }
}
