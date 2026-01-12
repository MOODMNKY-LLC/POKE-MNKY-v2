export interface SyncResult {
  success: boolean
  recordsProcessed: number
  errors: string[]
}

// Mock sync function for preview/development
export async function syncLeagueData(): Promise<SyncResult> {
  console.log("[v0] Google Sheets sync is disabled - using mock data")

  return {
    success: false,
    recordsProcessed: 0,
    errors: [
      "Google Sheets sync requires node-google-spreadsheet package. Install it when ready to deploy with real data sync.",
    ],
  }
}

/* PRODUCTION IMPLEMENTATION - Uncomment when ready to use real Google Sheets sync
 *
 * Prerequisites:
 * 1. Install package: npm install node-google-spreadsheet
 * 2. Set environment variables:
 *    - GOOGLE_SHEETS_ID
 *    - GOOGLE_SERVICE_ACCOUNT_EMAIL
 *    - GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
 * 3. Share your Google Sheet with the service account email
 *
 * Then uncomment the code below and remove the mock function above
 */

/*
import { GoogleSpreadsheet } from "node-google-spreadsheet"

const SHEET_ID = process.env.GOOGLE_SHEETS_ID || ""
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || ""
const SERVICE_ACCOUNT_PRIVATE_KEY = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "").replace(/\\n/g, "\n")

export async function syncLeagueData(): Promise<SyncResult> {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const doc = new GoogleSpreadsheet(SHEET_ID)
  const errors: string[] = []
  let recordsProcessed = 0

  await doc.useServiceAccountAuth({
    client_email: SERVICE_ACCOUNT_EMAIL,
    private_key: SERVICE_ACCOUNT_PRIVATE_KEY,
  })

  try {
    await doc.loadInfo()
    console.log("[v0] Loaded sheet:", doc.title)

    // Sync teams from "Master Data Sheet" or "Standings" tab
    const teamsSheet = doc.sheetsByTitle["Standings"] || doc.sheetsByTitle["Master Data Sheet"]
    if (teamsSheet) {
      const teamsResult = await syncTeams(teamsSheet, supabase)
      recordsProcessed += teamsResult.recordsProcessed
      errors.push(...teamsResult.errors)
    }

    // Sync draft results
    const draftSheet = doc.sheetsByTitle["Draft Results"] || doc.sheetsByTitle["Draft"]
    if (draftSheet) {
      const draftResult = await syncDraftResults(draftSheet, supabase)
      recordsProcessed += draftResult.recordsProcessed
      errors.push(...draftResult.errors)
    }

    // Sync match results
    const matchesSheet = doc.sheetsByTitle["Week Battles"] || doc.sheetsByTitle["Schedule"]
    if (matchesSheet) {
      const matchesResult = await syncMatches(matchesSheet, supabase)
      recordsProcessed += matchesResult.recordsProcessed
      errors.push(...matchesResult.errors)
    }

    // Sync MVP/stats
    const statsSheet = doc.sheetsByTitle["MVP"] || doc.sheetsByTitle["Top Performers"]
    if (statsSheet) {
      const statsResult = await syncStats(statsSheet, supabase)
      recordsProcessed += statsResult.recordsProcessed
      errors.push(...statsResult.errors)
    }

    // Log sync
    await supabase.from("sync_log").insert({
      sync_type: "full",
      status: errors.length > 0 ? "partial" : "success",
      records_processed: recordsProcessed,
      error_message: errors.length > 0 ? errors.join("; ") : null,
    })

    return {
      success: errors.length === 0,
      recordsProcessed,
      errors,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    await supabase.from("sync_log").insert({
      sync_type: "full",
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

async function syncTeams(sheet: any, supabase: any): Promise<SyncResult> {
  const rows = await sheet.getRows()
  const errors: string[] = []
  let processed = 0

  for (const row of rows) {
    try {
      // Parse team data from row
      const teamData = {
        name: row.get("Team") || row.get("Team Name"),
        coach_name: row.get("Coach") || row.get("Coach Name"),
        division: row.get("Division"),
        conference: row.get("Conference"),
        wins: Number.parseInt(row.get("Wins") || row.get("W") || "0"),
        losses: Number.parseInt(row.get("Losses") || row.get("L") || "0"),
        differential: Number.parseInt(row.get("Differential") || row.get("Diff") || "0"),
        strength_of_schedule: Number.parseFloat(row.get("SoS") || row.get("Strength of Schedule") || "0"),
      }

      if (!teamData.name) continue // Skip empty rows

      // Upsert team
      const { error } = await supabase.from("teams").upsert(teamData, { onConflict: "name" })

      if (error) {
        errors.push(`Team ${teamData.name}: ${error.message}`)
      } else {
        processed++
      }
    } catch (error) {
      errors.push(`Row processing error: ${error instanceof Error ? error.message : "Unknown"}`)
    }
  }

  return { success: errors.length === 0, recordsProcessed: processed, errors }
}

async function syncDraftResults(sheet: any, supabase: any): Promise<SyncResult> {
  const rows = await sheet.getRows()
  const errors: string[] = []
  let processed = 0

  for (const row of rows) {
    try {
      const round = Number.parseInt(row.get("Round") || "0")
      const teamName = row.get("Team")
      const pokemonName = row.get("Pokemon") || row.get("Pick")
      const cost = Number.parseInt(row.get("Cost") || row.get("Points") || "10")

      if (!teamName || !pokemonName) continue

      // Get team ID
      const { data: team } = await supabase.from("teams").select("id").eq("name", teamName).single()

      if (!team) {
        errors.push(`Team not found: ${teamName}`)
        continue
      }

      // Get or create Pokemon
      const { data: pokemon, error: pokemonError } = await supabase
        .from("pokemon")
        .upsert({ name: pokemonName }, { onConflict: "name" })
        .select()
        .single()

      if (pokemonError) {
        errors.push(`Pokemon ${pokemonName}: ${pokemonError.message}`)
        continue
      }

      // Add to roster
      const { error } = await supabase.from("team_rosters").upsert(
        {
          team_id: team.id,
          pokemon_id: pokemon.id,
          draft_round: round,
          draft_order: processed + 1,
          draft_points: cost,
        },
        { onConflict: "team_id,pokemon_id" },
      )

      if (error) {
        errors.push(`Roster entry: ${error.message}`)
      } else {
        processed++
      }
    } catch (error) {
      errors.push(`Draft row error: ${error instanceof Error ? error.message : "Unknown"}`)
    }
  }

  return { success: errors.length === 0, recordsProcessed: processed, errors }
}

async function syncMatches(sheet: any, supabase: any): Promise<SyncResult> {
  const rows = await sheet.getRows()
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

      if (score && score.includes("-")) {
        const [s1, s2] = score.split("-").map((s: string) => Number.parseInt(s.trim()))
        team1Score = s1
        team2Score = s2
      }

      // Get team IDs
      const { data: teams } = await supabase.from("teams").select("id, name").in("name", [team1Name, team2Name])

      const team1 = teams?.find((t: any) => t.name === team1Name)
      const team2 = teams?.find((t: any) => t.name === team2Name)

      if (!team1 || !team2) {
        errors.push(`Teams not found: ${team1Name} vs ${team2Name}`)
        continue
      }

      if (team1Score > team2Score) winnerId = team1.id
      else if (team2Score > team1Score) winnerId = team2.id

      const differential = Math.abs(team1Score - team2Score)

      // Upsert match
      const { error } = await supabase.from("matches").upsert({
        week,
        team1_id: team1.id,
        team2_id: team2.id,
        winner_id: winnerId,
        team1_score: team1Score,
        team2_score: team2Score,
        differential,
        status: winnerId ? "completed" : "scheduled",
      })

      if (error) {
        errors.push(`Match week ${week}: ${error.message}`)
      } else {
        processed++
      }
    } catch (error) {
      errors.push(`Match row error: ${error instanceof Error ? error.message : "Unknown"}`)
    }
  }

  return { success: errors.length === 0, recordsProcessed: processed, errors }
}

async function syncStats(sheet: any, supabase: any): Promise<SyncResult> {
  // TODO: Implement MVP/stats sync
  return { success: true, recordsProcessed: 0, errors: [] }
}
*/
