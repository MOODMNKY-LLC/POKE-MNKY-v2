/**
 * Re-sync league teams from the Google Sheet "Data" tab into local Supabase.
 * Usage: pnpm tsx scripts/resync-teams-data-tab.ts
 */
import * as dotenv from "dotenv"
import * as path from "path"
import { createServiceRoleClient } from "../lib/supabase/service"
import { syncLeagueData } from "../lib/google-sheets-sync"
import { syncTeamPageRosters } from "../lib/sync-team-page-rosters"
import { syncTeamSheetMatches } from "../lib/sync-team-sheet-matches"
import { redisCache, CacheKeys } from "../lib/cache/redis"
import { GoogleSpreadsheet } from "google-spreadsheet"
import { JWT } from "google-auth-library"
import { getGoogleServiceAccountCredentials } from "../lib/utils/google-sheets"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

async function main() {
  const supabase = createServiceRoleClient()

  const { data: config, error: configError } = await supabase
    .from("google_sheets_config")
    .select("id, spreadsheet_id")
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (configError || !config?.spreadsheet_id) {
    console.error("No google_sheets_config.spreadsheet_id — save config in Admin → Google Sheets first.")
    process.exit(1)
  }

  const { data: mappings } = await supabase
    .from("sheet_mappings")
    .select("sheet_name, table_name, enabled, sync_order")
    .eq("config_id", config.id)
    .eq("enabled", true)
    .eq("table_name", "teams")

  const dataOnly =
    mappings?.filter((m) => m.sheet_name === "Data" || m.sheet_name?.toLowerCase() === "data") ??
    []
  const sheetMappings =
    dataOnly.length > 0
      ? dataOnly
      : [{ sheet_name: "Data", table_name: "teams", enabled: true, sync_order: 1 }]

  console.log("[resync-teams] Spreadsheet:", config.spreadsheet_id)
  console.log("[resync-teams] Mappings:", sheetMappings.map((m) => m.sheet_name).join(", "))

  const result = await syncLeagueData(config.spreadsheet_id, sheetMappings)

  const credentials = getGoogleServiceAccountCredentials()
  let rosterResult = { teamsProcessed: 0, picksWritten: 0, errors: [] as string[] }
  let matchResult = { teamsProcessed: 0, matchesWritten: 0, errors: [] as string[] }
  if (credentials) {
    const auth = new JWT({
      email: credentials.email,
      key: credentials.privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    })
    const doc = new GoogleSpreadsheet(config.spreadsheet_id, auth)
    await doc.loadInfo()
    const titles = doc.sheetsByIndex.map((s) => s.title)
    rosterResult = await syncTeamPageRosters(supabase, config.spreadsheet_id, titles)
    matchResult = await syncTeamSheetMatches(supabase, config.spreadsheet_id, titles)
  }

  console.log("[resync-teams] Teams:", {
    success: result.success,
    recordsProcessed: result.recordsProcessed,
    errors: result.errors.slice(0, 5),
  })
  console.log("[resync-teams] Rosters:", rosterResult)
  console.log("[resync-teams] Matches:", matchResult)

  if (redisCache.isEnabled()) {
    await redisCache.del(CacheKeys.homepageBundle)
    console.log("[resync-teams] Cleared homepage Redis cache")
  }

  const { data: sample } = await supabase
    .from("teams")
    .select("name, division, conference, wins, losses, differential, season_id")
    .order("name")
    .limit(3)

  const { count: pickCount } = await supabase
    .from("draft_picks")
    .select("id", { count: "exact", head: true })

  const { count: matchCount } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })

  console.log("[resync-teams] Sample teams:", sample)
  console.log("[resync-teams] draft_picks count:", pickCount)
  console.log("[resync-teams] matches count:", matchCount)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
