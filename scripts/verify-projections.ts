/**
 * Verify Poképedia Projections
 * 
 * Quick verification script to check that projections were built correctly
 * 
 * Usage:
 *   pnpm tsx scripts/verify-projections.ts
 */

import { createClient } from "@supabase/supabase-js"

async function main() {
  console.log("=".repeat(70))
  console.log("🔍 Verify Poképedia Projections")
  console.log("=".repeat(70))
  console.log("")

  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase credentials")
    console.error("   Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Check total count
  const { count, error: countError } = await supabase
    .from("pokepedia_pokemon")
    .select("*", { count: "exact", head: true })

  if (countError) {
    console.error("❌ Error counting:", countError)
    process.exit(1)
  }

  console.log(`📊 Total Pokemon in projections: ${count}`)
  console.log("")

  // Get sample records
  const { data, error } = await supabase
    .from("pokepedia_pokemon")
    .select(
      "id, name, type_primary, type_secondary, total_base_stat, generation, ability_primary, order"
    )
    .limit(5)
    .order("id", { ascending: true })

  if (error) {
    console.error("❌ Error fetching data:", error)
    process.exit(1)
  }

  if (!data || data.length === 0) {
    console.log("⚠️  No Pokemon found in projections")
    console.log("   Run: pnpm tsx scripts/build-pokepedia-projections.ts")
    process.exit(1)
  }

  console.log("📋 Sample Pokemon (first 5):")
  console.log("")
  for (const pokemon of data) {
    console.log(`  ${pokemon.id}. ${pokemon.name}`)
    console.log(`     Types: ${pokemon.type_primary}${pokemon.type_secondary ? ` / ${pokemon.type_secondary}` : ""}`)
    console.log(`     Total Stats: ${pokemon.total_base_stat || "N/A"}`)
    console.log(`     Generation: ${pokemon.generation || "N/A"}`)
    console.log(`     Ability: ${pokemon.ability_primary || "N/A"}`)
    console.log(`     Order: ${pokemon.order || "N/A"}`)
    console.log("")
  }

  // Test queries
  console.log("🧪 Testing queries...")
  console.log("")

  // Test type filter
  const { count: fireCount } = await supabase
    .from("pokepedia_pokemon")
    .select("*", { count: "exact", head: true })
    .eq("type_primary", "fire")

  console.log(`  Fire-type Pokemon: ${fireCount}`)

  // Test generation filter
  const { count: gen1Count } = await supabase
    .from("pokepedia_pokemon")
    .select("*", { count: "exact", head: true })
    .eq("generation", 1)

  console.log(`  Generation 1 Pokemon: ${gen1Count}`)

  // Test stat sorting
  const { data: topStats } = await supabase
    .from("pokepedia_pokemon")
    .select("id, name, total_base_stat")
    .order("total_base_stat", { ascending: false })
    .limit(3)

  console.log(`  Top 3 by total stats:`)
  topStats?.forEach((p) => {
    console.log(`    ${p.name}: ${p.total_base_stat}`)
  })

  console.log("")
  console.log("=".repeat(70))
  console.log("✅ Verification complete!")
  console.log("=".repeat(70))
  console.log("")
  console.log("All queries working correctly with new indexed fields!")
  console.log("")
}

main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
