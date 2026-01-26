/**
 * Setup Season 6 as the default current season for development
 * Creates Season 6, conferences, divisions, and 24 teams (unassigned coaches)
 * 
 * Run: npm run setup:season-6
 */

import { config } from "dotenv"
import { resolve } from "path"
import { createServiceRoleClient } from "@/lib/supabase/service"

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") })
config({ path: resolve(process.cwd(), ".env") })

const CONFERENCES = [
  {
    name: "Lance Conference",
    divisions: [
      { name: "Kanto", teamCount: 6 },
      { name: "Johto", teamCount: 6 },
    ],
  },
  {
    name: "Leon Conference",
    divisions: [
      { name: "Hoenn", teamCount: 6 },
      { name: "Sinnoh", teamCount: 6 },
    ],
  },
]

async function setupSeason6() {
  console.log("🚀 Setting up Season 6 as current season...\n")

  const supabase = createServiceRoleClient()

  try {
    // Step 1: Unset any existing current season
    console.log("📅 Step 1: Unsetting existing current seasons...")
    const { error: unsetError } = await supabase
      .from("seasons")
      .update({ is_current: false })
      .eq("is_current", true)

    if (unsetError) {
      console.error("   ⚠️  Warning: Failed to unset existing seasons:", unsetError.message)
    } else {
      console.log("   ✅ Unset existing current seasons")
    }
    console.log("")

    // Step 2: Check if Season 6 exists, create if not
    console.log("📅 Step 2: Creating/Getting Season 6...")
    let { data: season, error: seasonError } = await supabase
      .from("seasons")
      .select("id, name, season_id, is_current")
      .or("name.eq.Season 6,season_id.eq.AABPBL-Season-6-2026")
      .limit(1)
      .single()

    if (seasonError || !season) {
      console.log("   Creating Season 6...")
      const { data: newSeason, error: createError } = await supabase
        .from("seasons")
        .insert({
          name: "Season 6",
          season_id: "AABPBL-Season-6-2026",
          start_date: "2026-01-01",
          is_current: true,
        })
        .select("id, name, season_id")
        .single()

      if (createError || !newSeason) {
        console.error("   ❌ Failed to create Season 6:", createError)
        process.exit(1)
      }

      season = newSeason
      console.log(`   ✅ Created Season 6: ${season.name} (${season.id})`)
    } else {
      // Update to set as current
      const { error: updateError } = await supabase
        .from("seasons")
        .update({ is_current: true })
        .eq("id", season.id)

      if (updateError) {
        console.error("   ❌ Failed to update Season 6:", updateError)
        process.exit(1)
      }

      console.log(`   ✅ Using existing Season 6: ${season.name} (${season.id})`)
    }

    const seasonId = season.id
    console.log("")

    // Step 3: Create conferences for Season 6
    console.log("🏆 Step 3: Creating conferences...")
    const conferenceMap = new Map<string, string>()

    for (const conference of CONFERENCES) {
      // Check if conference exists
      const { data: existingConference } = await supabase
        .from("conferences")
        .select("id")
        .eq("name", conference.name)
        .eq("season_id", seasonId)
        .single()

      if (existingConference) {
        conferenceMap.set(conference.name, existingConference.id)
        console.log(`   ✅ Conference exists: ${conference.name}`)
        continue
      }

      const { data: newConference, error: confError } = await supabase
        .from("conferences")
        .insert({
          name: conference.name,
          season_id: seasonId,
        })
        .select("id")
        .single()

      if (confError || !newConference) {
        console.error(`   ❌ Failed to create conference ${conference.name}:`, confError)
        process.exit(1)
      }

      conferenceMap.set(conference.name, newConference.id)
      console.log(`   ✅ Created conference: ${conference.name}`)
    }
    console.log("")

    // Step 4: Create divisions
    console.log("📊 Step 4: Creating divisions...")
    const divisionMap = new Map<string, string>()

    for (const conference of CONFERENCES) {
      const conferenceId = conferenceMap.get(conference.name)
      if (!conferenceId) {
        console.error(`   ❌ Conference ID not found for ${conference.name}`)
        process.exit(1)
      }

      for (const division of conference.divisions) {
        // Check if division exists
        const { data: existingDivision } = await supabase
          .from("divisions")
          .select("id")
          .eq("name", division.name)
          .eq("conference_id", conferenceId)
          .eq("season_id", seasonId)
          .single()

        if (existingDivision) {
          divisionMap.set(division.name, existingDivision.id)
          console.log(`   ✅ Division exists: ${division.name}`)
          continue
        }

        const { data: newDivision, error: divError } = await supabase
          .from("divisions")
          .insert({
            name: division.name,
            conference_id: conferenceId,
            season_id: seasonId,
          })
          .select("id")
          .single()

        if (divError || !newDivision) {
          console.error(`   ❌ Failed to create division ${division.name}:`, divError)
          process.exit(1)
        }

        divisionMap.set(division.name, newDivision.id)
        console.log(`   ✅ Created division: ${division.name}`)
      }
    }
    console.log("")

    // Step 5: Create teams (24 total: 6 per division)
    console.log("👥 Step 5: Creating teams...")
    let teamCount = 0

    for (const conference of CONFERENCES) {
      for (const division of conference.divisions) {
        const divisionId = divisionMap.get(division.name)
        if (!divisionId) {
          console.error(`   ❌ Division ID not found for ${division.name}`)
          continue
        }

        // Check existing teams for this division
        const { data: existingTeams } = await supabase
          .from("teams")
          .select("id, name")
          .eq("division_id", divisionId)
          .eq("season_id", seasonId)

        const existingTeamNames = new Set(existingTeams?.map((t) => t.name) || [])

        // Create teams (6 per division)
        for (let i = 1; i <= division.teamCount; i++) {
          const teamName = `${division.name} Team ${i}`

          // Skip if team already exists
          if (existingTeamNames.has(teamName)) {
            console.log(`   ⏭️  Team exists: ${teamName}`)
            teamCount++
            continue
          }

          const { data: newTeam, error: teamError } = await supabase
            .from("teams")
            .insert({
              name: teamName,
              coach_name: "Unassigned", // Placeholder - will be updated when coach is assigned
              division: division.name, // Legacy field
              conference: conference.name, // Legacy field
              division_id: divisionId,
              season_id: seasonId,
              coach_id: null, // Unassigned - will be assigned via admin dashboard
            })
            .select("id, name")
            .single()

          if (teamError || !newTeam) {
            console.error(`   ❌ Failed to create team ${teamName}:`, teamError)
            continue
          }

          console.log(`   ✅ Created team: ${teamName}`)
          teamCount++
        }
      }
    }

    console.log(`\n   ✅ Total teams: ${teamCount}/24`)
    console.log("")

    // Step 6: Verify setup
    console.log("🔍 Step 6: Verifying setup...")
    const { data: currentSeason } = await supabase
      .from("seasons")
      .select("id, name, season_id, is_current")
      .eq("is_current", true)
      .single()

    if (!currentSeason || currentSeason.id !== seasonId) {
      console.error("   ❌ Season 6 is not set as current!")
      process.exit(1)
    }

    const { data: teams } = await supabase
      .from("teams")
      .select("id, name, coach_id")
      .eq("season_id", seasonId)

    const unassignedTeams = teams?.filter((t) => !t.coach_id) || []

    console.log(`   ✅ Current season: ${currentSeason.name} (${currentSeason.season_id})`)
    console.log(`   ✅ Total teams: ${teams?.length || 0}`)
    console.log(`   ✅ Unassigned teams: ${unassignedTeams.length}`)
    console.log("")

    console.log("🎉 Season 6 setup complete!")
    console.log("\n📝 Next steps:")
    console.log("   - Use the admin dashboard to assign coaches to teams")
    console.log("   - Teams are ready for coach assignment")
  } catch (error: any) {
    console.error("❌ Setup failed:", error)
    process.exit(1)
  }
}

// Run setup
setupSeason6()
  .then(() => {
    console.log("\n✅ Script completed successfully")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error)
    process.exit(1)
  })
