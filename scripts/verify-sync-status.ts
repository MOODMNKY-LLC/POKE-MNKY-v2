/**
 * Verify Poképedia Sync Status
 * 
 * Checks current state of data in Supabase and identifies what's missing.
 * 
 * Usage:
 *   pnpm tsx scripts/verify-sync-status.ts
 */

import { createClient } from "@supabase/supabase-js"

async function main() {
  console.log("=".repeat(70))
  console.log("🔍 Poképedia Sync Status Verification")
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

  // Initialize resourceCounts at top level
  const resourceCounts: Record<string, number> = {}

  // 1. Check pokeapi_resources counts
  console.log("📊 Checking pokeapi_resources...")
  const { count: totalResources, error: countError } = await supabase
    .from("pokeapi_resources")
    .select("*", { count: "exact", head: true })

  if (countError) {
    console.error(`❌ Error counting resources:`, countError)
  } else {
    console.log(`   Total resources: ${totalResources || 0}`)
  }

  // Get resource counts by type (with pagination to get all)
  const allResources: any[] = []
  let from = 0
  const pageSize = 1000
  let hasMore = true

  while (hasMore) {
    const { data: page, error: pageError } = await supabase
      .from("pokeapi_resources")
      .select("resource_type")
      .range(from, from + pageSize - 1)

    if (pageError) {
      console.error(`❌ Error fetching resources:`, pageError)
      hasMore = false
    } else if (!page || page.length === 0) {
      hasMore = false
    } else {
      allResources.push(...page)
      from += pageSize
      if (page.length < pageSize) {
        hasMore = false
      }
    }
  }

  const resources = allResources
  const resourcesError = null

  if (resourcesError) {
    console.error(`❌ Error fetching resources:`, resourcesError)
  } else {
    resources?.forEach((r) => {
      resourceCounts[r.resource_type] = (resourceCounts[r.resource_type] || 0) + 1
    })

    console.log("")
    console.log("   Top endpoints by count:")
    Object.entries(resourceCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .forEach(([type, count]) => {
        console.log(`     ${type}: ${count}`)
      })
  }

  // 2. Check pokepedia_pokemon projections
  console.log("")
  console.log("📊 Checking pokepedia_pokemon projections...")
  const { count: pokemonCount, error: pokemonError } = await supabase
    .from("pokepedia_pokemon")
    .select("*", { count: "exact", head: true })

  if (pokemonError) {
    console.error(`❌ Error counting Pokemon:`, pokemonError)
  } else {
    console.log(`   Pokemon projections: ${pokemonCount || 0}`)
    const expectedPokemon = 1025 // PokeAPI has ~1,025 Pokemon
    if ((pokemonCount || 0) < expectedPokemon) {
      console.log(`   ⚠️  Expected ~${expectedPokemon} Pokemon, found ${pokemonCount}`)
    }
  }

  // 3. Check pokepedia_assets (sprites)
  console.log("")
  console.log("📊 Checking pokepedia_assets (sprites)...")
  const { count: assetsCount, error: assetsError } = await supabase
    .from("pokepedia_assets")
    .select("*", { count: "exact", head: true })

  if (assetsError) {
    console.error(`❌ Error counting assets:`, assetsError)
  } else {
    console.log(`   Total assets: ${assetsCount || 0}`)
  }

  // Get asset counts by kind
  const { data: assets, error: assetsDataError } = await supabase
    .from("pokepedia_assets")
    .select("asset_kind")

  if (assetsDataError) {
    console.error(`❌ Error fetching assets:`, assetsDataError)
  } else {
    const assetCounts: Record<string, number> = {}
    assets?.forEach((a) => {
      assetCounts[a.asset_kind] = (assetCounts[a.asset_kind] || 0) + 1
    })

    if (Object.keys(assetCounts).length > 0) {
      console.log("")
      console.log("   Assets by kind:")
      Object.entries(assetCounts).forEach(([kind, count]) => {
        console.log(`     ${kind}: ${count}`)
      })
    }
  }

  // 4. Check storage buckets
  console.log("")
  console.log("📊 Checking Supabase Storage buckets...")
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

  if (bucketsError) {
    console.error(`❌ Error listing buckets:`, bucketsError)
  } else {
    const spriteBucket = buckets?.find((b) => b.name === "pokedex-sprites")
    const criesBucket = buckets?.find((b) => b.name === "pokedex-cries")

    if (spriteBucket) {
      console.log(`   ✅ pokedex-sprites bucket exists`)
      // Try to list a few files
      const { data: spriteFiles, error: spriteListError } = await supabase.storage
        .from("pokedex-sprites")
        .list("", { limit: 5 })

      if (spriteListError) {
        console.log(`   ⚠️  Error listing sprite files: ${spriteListError.message}`)
      } else {
        console.log(`   📁 Sample files found: ${spriteFiles?.length || 0}`)
        if (spriteFiles && spriteFiles.length > 0) {
          console.log(`      Example: ${spriteFiles[0].name}`)
        }
      }
    } else {
      console.log(`   ❌ pokedex-sprites bucket not found`)
    }

    if (criesBucket) {
      console.log(`   ✅ pokedex-cries bucket exists`)
    } else {
      console.log(`   ⚠️  pokedex-cries bucket not found (optional)`)
    }
  }

  // 5. Check for missing endpoints
  console.log("")
  console.log("📊 Checking for missing endpoints...")
  const expectedEndpoints = [
    "ability",
    "berry",
    "berry-firmness",
    "berry-flavor",
    "characteristic",
    "contest-effect",
    "contest-type",
    "egg-group",
    "encounter-condition",
    "encounter-condition-value",
    "encounter-method",
    "evolution-chain",
    "evolution-trigger",
    "generation",
    "gender",
    "growth-rate",
    "item",
    "item-attribute",
    "item-category",
    "item-fling-effect",
    "item-pocket",
    "language",
    "location",
    "location-area",
    "machine",
    "move",
    "move-ailment",
    "move-battle-style",
    "move-category",
    "move-damage-class",
    "move-learn-method",
    "move-target",
    "nature",
    "pal-park-area",
    "pokeathlon-stat",
    "pokedex",
    "pokemon",
    "pokemon-color",
    "pokemon-form",
    "pokemon-habitat",
    "pokemon-shape",
    "pokemon-species",
    "region",
    "stat",
    "super-contest-effect",
    "type",
    "version",
    "version-group",
  ]

  const missingEndpoints: string[] = []
  const foundEndpoints = new Set(Object.keys(resourceCounts || {}))

  expectedEndpoints.forEach((endpoint) => {
    if (!foundEndpoints.has(endpoint)) {
      missingEndpoints.push(endpoint)
    }
  })

  if (missingEndpoints.length > 0) {
    console.log(`   ⚠️  Missing endpoints: ${missingEndpoints.join(", ")}`)
  } else {
    console.log(`   ✅ All expected endpoints present`)
  }

  // Summary
  console.log("")
  console.log("=".repeat(70))
  console.log("📊 Summary")
  console.log("=".repeat(70))
  console.log(`Total resources: ${totalResources || 0}`)
  console.log(`Pokemon projections: ${pokemonCount || 0}`)
  console.log(`Assets (sprites/cries): ${assetsCount || 0}`)
  console.log(`Endpoints covered: ${Object.keys(resourceCounts).length}/${expectedEndpoints.length}`)
  console.log("")

  // Recommendations
  console.log("💡 Recommendations:")
  if ((pokemonCount || 0) < 1000) {
    console.log("   ⚠️  Import more Pokemon from api-data or ditto")
  }
  if ((assetsCount || 0) === 0) {
    console.log("   ⚠️  Run sprite mirroring: pnpm tsx scripts/mirror-sprites-to-storage.ts")
  }
  if (missingEndpoints.length > 0) {
    console.log(`   ⚠️  Import missing endpoints: ${missingEndpoints.join(", ")}`)
  }
  if ((pokemonCount || 0) >= 1000 && (assetsCount || 0) > 0 && missingEndpoints.length === 0) {
    console.log("   ✅ Sync appears complete!")
  }
  console.log("")
}

main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
