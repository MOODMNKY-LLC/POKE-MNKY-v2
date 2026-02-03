/**
 * Check Current Season in Local Supabase
 * 
 * Queries the local Supabase instance to see if there's a season with is_current = true
 */

import { config } from "dotenv"
import { createClient } from "@supabase/supabase-js"

config({ path: ".env.local" })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing Supabase configuration")
  console.error("   SUPABASE_URL:", SUPABASE_URL ? "✅" : "❌")
  console.error("   SUPABASE_SERVICE_ROLE_KEY:", SUPABASE_SERVICE_ROLE_KEY ? "✅" : "❌")
  process.exit(1)
}

async function main() {
  console.log("🔍 Checking Local Supabase for Current Season\n")
  console.log("=".repeat(60))
  console.log(`Supabase URL: ${SUPABASE_URL}\n`)

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    // Check if seasons table exists
    console.log("1️⃣ Checking if 'seasons' table exists...")
    const { data: tableCheck, error: tableError } = await supabase
      .from("seasons")
      .select("id")
      .limit(1)

    if (tableError) {
      console.error("   ❌ Error accessing seasons table:", tableError.message)
      console.error("   Code:", tableError.code)
      console.error("   Details:", tableError.details)
      process.exit(1)
    }

    console.log("   ✅ Seasons table exists\n")

    // Get all seasons
    console.log("2️⃣ Fetching all seasons...")
    const { data: allSeasons, error: allError } = await supabase
      .from("seasons")
      .select("id, name, is_current, start_date, end_date, created_at")
      .order("created_at", { ascending: false })

    if (allError) {
      console.error("   ❌ Error fetching seasons:", allError.message)
      process.exit(1)
    }

    console.log(`   ✅ Found ${allSeasons?.length || 0} season(s)\n`)

    if (!allSeasons || allSeasons.length === 0) {
      console.log("⚠️  No seasons found in database!")
      console.log("\n💡 To create a season, run:")
      console.log("   INSERT INTO seasons (name, start_date, is_current) VALUES ('Season 6', '2026-01-01', true);")
      return
    }

    // Display all seasons
    console.log("📋 All Seasons:")
    console.log("-".repeat(60))
    allSeasons.forEach((season, idx) => {
      const current = season.is_current ? "🟢 CURRENT" : "⚪"
      console.log(`   ${idx + 1}. ${current} ${season.name || "Unnamed"}`)
      console.log(`      ID: ${season.id}`)
      console.log(`      Start: ${season.start_date || "N/A"}`)
      console.log(`      End: ${season.end_date || "N/A"}`)
      console.log()
    })

    // Check for current season
    console.log("3️⃣ Checking for current season (is_current = true)...")
    const { data: currentSeason, error: currentError } = await supabase
      .from("seasons")
      .select("id, name, is_current, start_date, end_date")
      .eq("is_current", true)
      .maybeSingle()

    if (currentError) {
      console.error("   ❌ Error querying current season:", currentError.message)
      process.exit(1)
    }

    if (!currentSeason) {
      console.log("   ⚠️  No current season found!")
      console.log("\n💡 To set a season as current, run:")
      console.log(`   UPDATE seasons SET is_current = true WHERE id = '${allSeasons[0].id}';`)
      console.log("\n   Or set by name:")
      console.log(`   UPDATE seasons SET is_current = true WHERE name = 'Season 6';`)
    } else {
      console.log("   ✅ Current season found!")
      console.log("\n📊 Current Season Details:")
      console.log("-".repeat(60))
      console.log(`   Name: ${currentSeason.name}`)
      console.log(`   ID: ${currentSeason.id}`)
      console.log(`   Start Date: ${currentSeason.start_date || "N/A"}`)
      console.log(`   End Date: ${currentSeason.end_date || "N/A"}`)
      console.log(`   Is Current: ${currentSeason.is_current ? "✅ Yes" : "❌ No"}`)
      console.log("\n✅ This season ID will be used in the n8n workflow!")
    }

  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`)
    if (error.stack) {
      console.error(error.stack)
    }
    process.exit(1)
  }
}

main()
