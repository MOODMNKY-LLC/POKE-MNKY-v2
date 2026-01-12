/**
 * Verify Pokemon sync status and proceed with next steps
 * Checks database state, verifies syncs, then runs draft pool extraction
 */

import * as dotenv from "dotenv"
import * as path from "path"
import { createServiceRoleClient } from "../lib/supabase/service"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

async function verifySyncAndProceed() {
  console.log("=".repeat(70))
  console.log("🔍 Verifying Pokemon Sync Status")
  console.log("=".repeat(70))

  const supabase = createServiceRoleClient()

  // Check Pokemon cache
  const { count: totalPokemon } = await supabase
    .from("pokemon_cache")
    .select("*", { count: "exact", head: true })

  const { count: gen8Count } = await supabase
    .from("pokemon_cache")
    .select("*", { count: "exact", head: true })
    .eq("generation", 8)

  const { count: gen9Count } = await supabase
    .from("pokemon_cache")
    .select("*", { count: "exact", head: true })
    .eq("generation", 9)

  const { count: withGeneration } = await supabase
    .from("pokemon_cache")
    .select("*", { count: "exact", head: true })
    .not("generation", "is", null)

  console.log(`\n📊 Pokemon Cache Status:`)
  console.log(`  Total Pokemon: ${totalPokemon || 0}`)
  console.log(`  Gen 8 Pokemon: ${gen8Count || 0}`)
  console.log(`  Gen 9 Pokemon: ${gen9Count || 0}`)
  console.log(`  With Generation Data: ${withGeneration || 0}`)

  // Check sync jobs
  const { data: recentJobs } = await supabase
    .from("sync_jobs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(5)

  console.log(`\n📋 Recent Sync Jobs:`)
  if (recentJobs && recentJobs.length > 0) {
    recentJobs.forEach((job: any) => {
      console.log(`  ${job.job_type} (${job.status}): ${job.pokemon_synced} synced, ${job.pokemon_failed} failed`)
      console.log(`    Started: ${new Date(job.started_at).toLocaleString()}`)
      if (job.completed_at) {
        console.log(`    Completed: ${new Date(job.completed_at).toLocaleString()}`)
      }
    })
  } else {
    console.log("  No sync jobs found")
  }

  // Check draft pool table
  const { data: draftPoolData, error: draftPoolError } = await supabase
    .from("draft_pool")
    .select("pokemon_name, point_value, is_available, generation")
    .limit(5)

  if (draftPoolError) {
    console.log(`\n⚠️  Draft Pool Table Status:`)
    console.log(`  Error: ${draftPoolError.message}`)
    if (draftPoolError.code === "PGRST205") {
      console.log(`  ⚠️  Schema cache needs refresh!`)
      console.log(`  Run: supabase stop && supabase start`)
    }
  } else {
    const { count: draftPoolCount } = await supabase
      .from("draft_pool")
      .select("*", { count: "exact", head: true })

    console.log(`\n📊 Draft Pool Status:`)
    console.log(`  Total Entries: ${draftPoolCount || 0}`)
    if (draftPoolData && draftPoolData.length > 0) {
      console.log(`  Sample Entries:`)
      draftPoolData.forEach((p: any) => {
        console.log(`    - ${p.pokemon_name} (${p.point_value}pts) ${p.is_available ? "✅" : "❌"} Gen ${p.generation || "?"}`)
      })
    }
  }

  // Check specific Pokemon from draft pool
  console.log(`\n🔍 Checking Draft Pool Pokemon in Cache:`)
  const draftPoolPokemon = [
    "flutter-mane",
    "gouging-fire",
    "mewtwo",
    "raging-bolt",
    "roaring-moon",
    "urshifu-rapid-strike",
    "urshifu-single-strike",
    "archaludon",
    "chi-yu",
    "chien-pao",
  ]

  const { data: pokemonData } = await supabase
    .from("pokemon_cache")
    .select("name, generation")
    .in("name", draftPoolPokemon)

  if (pokemonData) {
    console.log(`  Found ${pokemonData.length}/${draftPoolPokemon.length} Pokemon:`)
    pokemonData.forEach((p: any) => {
      console.log(`    ✅ ${p.name} (Gen ${p.generation})`)
    })

    const missing = draftPoolPokemon.filter(
      (name) => !pokemonData.some((p: any) => p.name === name)
    )
    if (missing.length > 0) {
      console.log(`  Missing:`)
      missing.forEach((name) => console.log(`    ❌ ${name}`))
    }
  }

  // Summary
  console.log("\n" + "=".repeat(70))
  console.log("📊 Summary")
  console.log("=".repeat(70))

  const syncStatus = totalPokemon && totalPokemon >= 1000 ? "✅ COMPLETE" : "⚠️ INCOMPLETE"
  const genStatus = gen8Count && gen9Count && gen8Count >= 90 && gen9Count >= 100 ? "✅ COMPLETE" : "⚠️ INCOMPLETE"
  const draftPoolStatus = draftPoolError?.code === "PGRST205" ? "⚠️ SCHEMA CACHE" : draftPoolData ? "✅ ACCESSIBLE" : "❌ EMPTY"

  console.log(`Pokemon Sync: ${syncStatus}`)
  console.log(`Gen 8-9 Data: ${genStatus}`)
  console.log(`Draft Pool Table: ${draftPoolStatus}`)

  // Recommendations
  console.log("\n" + "=".repeat(70))
  console.log("🎯 Next Steps")
  console.log("=".repeat(70))

  if (draftPoolError?.code === "PGRST205") {
    console.log("1. 🔴 CRITICAL: Refresh Supabase schema cache")
    console.log("   Run: supabase stop && supabase start")
    console.log("\n2. Then re-run draft pool parser:")
    console.log("   npx tsx scripts/test-draft-pool-parser.ts")
  } else if (!draftPoolData || draftPoolData.length === 0) {
    console.log("1. Run draft pool parser to extract Pokemon:")
    console.log("   npx tsx scripts/test-draft-pool-parser.ts")
  } else {
    console.log("1. ✅ Draft pool data exists!")
    console.log("2. Proceed with draft system testing")
  }

  if (totalPokemon && totalPokemon < 1000) {
    console.log("\n3. ⚠️  Pokemon sync incomplete - run full sync:")
    console.log("   npx tsx scripts/full-sync-pokemon.ts")
  }

  console.log("\n" + "=".repeat(70))
}

verifySyncAndProceed().catch((error) => {
  console.error("\n❌ Error:", error)
  process.exit(1)
})
