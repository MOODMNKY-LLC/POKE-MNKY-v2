/**
 * Create Current Season in Local Supabase
 * 
 * Creates a season with is_current = true for local development
 */

import { config } from "dotenv"
import { createClient } from "@supabase/supabase-js"

config({ path: ".env.local" })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing Supabase configuration")
  process.exit(1)
}

async function main() {
  console.log("🔧 Creating Current Season in Local Supabase\n")
  console.log("=".repeat(60))
  console.log(`Supabase URL: ${SUPABASE_URL}\n`)

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    // Check existing seasons
    const { data: existingSeasons } = await supabase
      .from("seasons")
      .select("id, name, is_current")

    if (existingSeasons && existingSeasons.length > 0) {
      console.log("📋 Existing seasons found:")
      existingSeasons.forEach((s) => {
        console.log(`   - ${s.name} (${s.is_current ? "🟢 CURRENT" : "⚪"})`)
      })
      console.log()

      // Check if there's already a current season
      const currentSeason = existingSeasons.find((s) => s.is_current)
      if (currentSeason) {
        console.log(`✅ Current season already exists: ${currentSeason.name}`)
        console.log(`   ID: ${currentSeason.id}`)
        return
      }
    }

    // Create new season
    const seasonName = process.argv[2] || "Season 6"
    const startDate = process.argv[3] || new Date().toISOString().split("T")[0]

    console.log(`Creating season: ${seasonName}`)
    console.log(`Start date: ${startDate}`)
    console.log(`Is current: true\n`)

    const { data: newSeason, error: createError } = await supabase
      .from("seasons")
      .insert({
        name: seasonName,
        start_date: startDate,
        is_current: true,
      })
      .select()
      .single()

    if (createError) {
      console.error("❌ Error creating season:", createError.message)
      console.error("   Code:", createError.code)
      console.error("   Details:", createError.details)
      process.exit(1)
    }

    console.log("✅ Season created successfully!")
    console.log("\n📊 New Season Details:")
    console.log("-".repeat(60))
    console.log(`   Name: ${newSeason.name}`)
    console.log(`   ID: ${newSeason.id}`)
    console.log(`   Start Date: ${newSeason.start_date}`)
    console.log(`   Is Current: ${newSeason.is_current ? "✅ Yes" : "❌ No"}`)
    console.log("\n✅ This season ID will be used in the n8n workflow!")
    console.log(`\n💡 Season ID: ${newSeason.id}`)

  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`)
    if (error.stack) {
      console.error(error.stack)
    }
    process.exit(1)
  }
}

main()
