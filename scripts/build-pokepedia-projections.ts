/**
 * Build Poképedia Projection Tables
 * 
 * Extracts data from pokeapi_resources JSONB and builds fast query tables
 * (pokepedia_pokemon) for UI performance.
 * 
 * Usage:
 *   pnpm tsx scripts/build-pokepedia-projections.ts [--limit=100]
 */

import { createClient } from "@supabase/supabase-js"

interface PokemonProjection {
  id: number
  name: string
  species_name: string | null
  height: number | null
  weight: number | null
  base_experience: number | null
  is_default: boolean | null
  sprite_front_default_path: string | null
  sprite_official_artwork_path: string | null
  // New fields
  types: any[] | null
  type_primary: string | null
  type_secondary: string | null
  base_stats: any | null
  total_base_stat: number | null
  abilities: any[] | null
  ability_primary: string | null
  ability_hidden: string | null
  order: number | null
  generation: number | null
  cry_latest_path: string | null
  cry_legacy_path: string | null
  moves_count: number | null
  forms_count: number | null
}

/**
 * Extract sprite path from sprites object
 * Priority: official-artwork > front_default
 */
function extractSpritePath(sprites: any): {
  frontDefault: string | null
  officialArtwork: string | null
} {
  if (!sprites) {
    return { frontDefault: null, officialArtwork: null }
  }

  const frontDefault = sprites.front_default || null
  const officialArtwork =
    sprites.other?.official_artwork?.front_default || null

  return { frontDefault, officialArtwork }
}

/**
 * Convert sprite URL to storage path
 * Example: https://raw.githubusercontent.com/PokeAPI/sprites/.../1.png
 *          -> sprites/pokemon/other/official-artwork/1.png
 */
function urlToStoragePath(url: string | null): string | null {
  if (!url) return null

  // Extract path from GitHub raw URL
  const match = url.match(/sprites\/(.+)$/)
  if (match) {
    return `sprites/${match[1]}`
  }

  // Fallback: return as-is if not a GitHub URL
  return url
}

/**
 * Build pokepedia_pokemon projection from JSONB data
 */
async function buildPokemonProjection(
  supabase: any,
  limit?: number
): Promise<{ processed: number; inserted: number; errors: number }> {
  console.log("📊 Building pokepedia_pokemon projection...")
  console.log("")

  // Fetch Pokemon resources with pagination (Supabase default limit is 1000)
  const resources: any[] = []
  let from = 0
  const pageSize = 1000
  let hasMore = true

  while (hasMore) {
    let query = supabase
      .from("pokeapi_resources")
      .select("resource_key, name, data")
      .eq("resource_type", "pokemon")
      .order("resource_key", { ascending: true })
      .range(from, from + pageSize - 1)

    if (limit && resources.length + pageSize > limit) {
      query = query.limit(limit - resources.length)
      hasMore = false
    }

    const { data: page, error: fetchError } = await query

    if (fetchError) {
      throw new Error(`Failed to fetch resources: ${fetchError.message}`)
    }

    if (!page || page.length === 0) {
      hasMore = false
    } else {
      resources.push(...page)
      from += pageSize
      if (limit && resources.length >= limit) {
        hasMore = false
      } else if (page.length < pageSize) {
        hasMore = false
      }
    }
  }

  const fetchError = null

  if (fetchError) {
    throw new Error(`Failed to fetch resources: ${fetchError.message}`)
  }

  if (resources.length === 0) {
    console.log("⚠️  No Pokemon resources found in pokeapi_resources")
    console.log("   Run import scripts first:")
    console.log("   pnpm tsx scripts/import-api-data.ts --endpoint=pokemon")
    console.log("   or")
    console.log("   pnpm tsx scripts/import-ditto-data.ts --endpoint=pokemon")
    return { processed: 0, inserted: 0, errors: 0 }
  }

  console.log(`📦 Processing ${resources.length} Pokemon resources...`)

  const projections: PokemonProjection[] = []
  let errors = 0

  for (const resource of resources) {
    try {
      const data = resource.data
      const id = parseInt(resource.resource_key)

      if (isNaN(id)) {
        console.warn(`⚠️  Skipping invalid ID: ${resource.resource_key}`)
        errors++
        continue
      }

      // Extract sprite paths
      const { frontDefault, officialArtwork } = extractSpritePath(data.sprites)
      const spriteFrontDefaultPath = urlToStoragePath(frontDefault)
      const spriteOfficialArtworkPath = urlToStoragePath(officialArtwork)

      // Get species name
      const speciesName = data.species?.name || null

      // Extract types
      const types = data.types?.map((t: any) => t.type.name) || []
      const typePrimary = types[0] || null
      const typeSecondary = types[1] || null

      // Extract base stats
      const baseStats: any = {}
      let totalBaseStat = 0
      if (data.stats && Array.isArray(data.stats)) {
        for (const stat of data.stats) {
          const statName = stat.stat.name
          const baseStat = stat.base_stat
          baseStats[statName] = baseStat
          totalBaseStat += baseStat
        }
      }

      // Extract abilities
      const abilities = data.abilities?.map((a: any) => ({
        name: a.ability.name,
        is_hidden: a.is_hidden || false,
        slot: a.slot || null,
      })) || []
      const primaryAbility = abilities.find((a: any) => !a.is_hidden && a.slot === 1)?.name || abilities[0]?.name || null
      const hiddenAbility = abilities.find((a: any) => a.is_hidden)?.name || null

      // Extract order
      const order = data.order || null

      // Calculate generation from order
      // More accurate: Gen 1: 1-151, Gen 2: 152-251, Gen 3: 252-386, Gen 4: 387-493,
      // Gen 5: 494-649, Gen 6: 650-721, Gen 7: 722-809, Gen 8: 810-905, Gen 9: 906+
      let generation: number | null = null
      if (order !== null && order > 0) {
        if (order <= 151) generation = 1
        else if (order <= 251) generation = 2
        else if (order <= 386) generation = 3
        else if (order <= 493) generation = 4
        else if (order <= 649) generation = 5
        else if (order <= 721) generation = 6
        else if (order <= 809) generation = 7
        else if (order <= 905) generation = 8
        else generation = 9
      } else if (id > 0) {
        // Fallback to ID if order not available
        if (id <= 151) generation = 1
        else if (id <= 251) generation = 2
        else if (id <= 386) generation = 3
        else if (id <= 493) generation = 4
        else if (id <= 649) generation = 5
        else if (id <= 721) generation = 6
        else if (id <= 809) generation = 7
        else if (id <= 905) generation = 8
        else generation = 9
      }

      // Extract cry paths (convert URLs to storage paths)
      const cryLatest = data.cries?.latest
      const cryLegacy = data.cries?.legacy
      const cryLatestPath = cryLatest
        ? cryLatest.replace("https://raw.githubusercontent.com/PokeAPI/cries/main/", "")
        : null
      const cryLegacyPath = cryLegacy
        ? cryLegacy.replace("https://raw.githubusercontent.com/PokeAPI/cries/main/", "")
        : null

      // Count moves and forms
      const movesCount = data.moves?.length || null
      const formsCount = data.forms?.length || null

      const projection: PokemonProjection = {
        id,
        name: data.name || resource.name || `pokemon-${id}`,
        species_name: speciesName,
        height: data.height || null,
        weight: data.weight || null,
        base_experience: data.base_experience || null,
        is_default: data.is_default ?? null,
        sprite_front_default_path: spriteFrontDefaultPath,
        sprite_official_artwork_path: spriteOfficialArtworkPath,
        // New fields
        types: types.length > 0 ? types : null,
        type_primary: typePrimary,
        type_secondary: typeSecondary,
        base_stats: Object.keys(baseStats).length > 0 ? baseStats : null,
        total_base_stat: totalBaseStat > 0 ? totalBaseStat : null,
        abilities: abilities.length > 0 ? abilities : null,
        ability_primary: primaryAbility,
        ability_hidden: hiddenAbility,
        order,
        generation,
        cry_latest_path: cryLatestPath,
        cry_legacy_path: cryLegacyPath,
        moves_count: movesCount,
        forms_count: formsCount,
      }

      projections.push(projection)
    } catch (error) {
      console.error(`❌ Error processing ${resource.resource_key}:`, error)
      errors++
    }
  }

  // Bulk upsert projections
  if (projections.length > 0) {
    console.log(`💾 Upserting ${projections.length} Pokemon projections...`)

    const { error: upsertError } = await supabase
      .from("pokepedia_pokemon")
      .upsert(projections, {
        onConflict: "id",
        ignoreDuplicates: false,
      })

    if (upsertError) {
      throw new Error(`Failed to upsert projections: ${upsertError.message}`)
    }

    console.log(`✅ Successfully upserted ${projections.length} Pokemon`)
  }

  return {
    processed: resources.length,
    inserted: projections.length,
    errors,
  }
}

async function main() {
  console.log("=".repeat(70))
  console.log("🏗️  Build Poképedia Projection Tables")
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

  // Parse command line arguments
  const args = process.argv.slice(2)
  const limitArg = args.find((a) => a.startsWith("--limit="))
  const limit = limitArg ? parseInt(limitArg.split("=")[1]) : undefined

  if (limit) {
    console.log(`📋 Limit: ${limit} Pokemon`)
    console.log("")
  }

  try {
    // Build Pokemon projection
    const pokemonStats = await buildPokemonProjection(supabase, limit)

    // Summary
    console.log("")
    console.log("=".repeat(70))
    console.log("📊 Projection Build Summary")
    console.log("=".repeat(70))
    console.log(`Pokemon processed: ${pokemonStats.processed}`)
    console.log(`Pokemon inserted/updated: ${pokemonStats.inserted}`)
    console.log(`Errors: ${pokemonStats.errors}`)
    console.log("")
    console.log("✅ Projection build complete!")
    console.log("")
    console.log("Next steps:")
    console.log("1. Query pokepedia_pokemon for fast UI queries")
    console.log("2. Mirror sprites: pnpm tsx scripts/mirror-sprites-to-storage.ts")
    console.log("")
  } catch (error) {
    console.error("❌ Fatal error:", error)
    process.exit(1)
  }
}

main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
