import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { PokemonClient } from "pokenode-ts"

const pokemonClient = new PokemonClient()

/**
 * Helper: Calculate generation from pokemon_id
 */
function getGenerationFromId(pokemonId: number): number {
  if (pokemonId <= 151) return 1
  if (pokemonId <= 251) return 2
  if (pokemonId <= 386) return 3
  if (pokemonId <= 493) return 4
  if (pokemonId <= 649) return 5
  if (pokemonId <= 721) return 6
  if (pokemonId <= 809) return 7
  if (pokemonId <= 905) return 8
  return 9
}

/**
 * Helper: Convert generation number to Roman numeral
 */
function generationToRoman(generation: number): string {
  const romanNumerals: Record<number, string> = {
    1: 'I',
    2: 'II',
    3: 'III',
    4: 'IV',
    5: 'V',
    6: 'VI',
    7: 'VII',
    8: 'VIII',
    9: 'IX',
  }
  return romanNumerals[generation] || generation.toString()
}

/**
 * Helper: Map tier to point value (matches database function)
 */
function mapTierToPointValue(tier: string | null): number {
  if (!tier) return 5
  
  switch (tier) {
    case 'Uber':
    case 'AG':
      return 20
    case 'OU':
      return 19
    case 'UUBL':
    case 'OUBL':
      return 18
    case 'UU':
      return 17
    case 'RUBL':
      return 16
    case 'RU':
      return 15
    case 'NUBL':
      return 14
    case 'NU':
      return 13
    case 'PUBL':
      return 12
    case 'PU':
      return 11
    case 'ZUBL':
      return 10
    case 'ZU':
      return 9
    case 'LC':
      return 8
    case 'NFE':
      return 7
    case 'Untiered':
      return 6
    default:
      return 5
  }
}

/**
 * GET /api/admin/pokemon
 * Fetch all Pokémon from PokeAPI and current draft_pool status
 */
export async function GET(request: NextRequest) {
  try {
    console.log("[Admin Pokemon API] GET request received at:", request.url)
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      console.error("[Admin Pokemon API] Auth error:", authError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!user) {
      console.log("[Admin Pokemon API] Unauthorized - no user")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[Admin Pokemon API] User authenticated:", user.id)

    // Get season_id from query params, or use current season
    const serviceSupabase = createServiceRoleClient()
    const { searchParams } = new URL(request.url)
    const requestedSeasonId = searchParams.get("season_id")

    let season
    if (requestedSeasonId) {
      // Use requested season (season_id column may not exist yet)
      const { data: seasonData, error: seasonError } = await serviceSupabase
        .from("seasons")
        .select("id, name, season_id")
        .eq("id", requestedSeasonId)
        .single()
      
      if (seasonError && seasonError.code === '42703') {
        // Column doesn't exist, fallback to basic query
        const { data: fallbackData } = await serviceSupabase
          .from("seasons")
          .select("id, name")
          .eq("id", requestedSeasonId)
          .single()
        season = fallbackData ? { ...fallbackData, season_id: null } : null
      } else {
        season = seasonData
      }
    } else {
      // Get current season as fallback (season_id column may not exist yet)
      const { data: seasonData, error: seasonError } = await serviceSupabase
        .from("seasons")
        .select("id, name, season_id")
        .eq("is_current", true)
        .single()
      
      if (seasonError && seasonError.code === '42703') {
        // Column doesn't exist, fallback to basic query
        const { data: fallbackData } = await serviceSupabase
          .from("seasons")
          .select("id, name")
          .eq("is_current", true)
          .single()
        season = fallbackData ? { ...fallbackData, season_id: null } : null
      } else {
        season = seasonData
      }
    }

    if (!season) {
      console.error("[Admin Pokemon API] No season found")
      return NextResponse.json({ error: "No season found" }, { status: 404 })
    }

    console.log("[Admin Pokemon API] Using season:", season.id, season.name)

    // Fetch all Pokémon from PokeAPI using PokemonClient (just names/IDs)
    console.log("[Admin Pokemon API] Fetching Pokémon list from PokeAPI...")
    const pokemonList = await pokemonClient.listPokemons(0, 10000) // Fetch all Pokémon
    
    console.log(`[Admin Pokemon API] Found ${pokemonList.count} Pokémon in PokeAPI`)

    // Extract all pokemon IDs
    const pokemonIds = pokemonList.results
      .map((result) => parseInt(result.url.split('/').filter(Boolean).pop() || '0'))
      .filter((id) => id > 0)

    console.log(`[Admin Pokemon API] Processing ${pokemonIds.length} Pokémon IDs`)

    // Fetch current draft_pool status for the season
    const { data: draftPoolData } = await serviceSupabase
      .from("draft_pool")
      .select("pokemon_name, pokemon_id, point_value, status")
      .eq("season_id", season.id)

    // Create a map of current draft_pool status by pokemon_id
    const draftPoolMap = new Map<number, { point_value: number; status: string }>()
    
    // Also try mapping by name for Pokémon without pokemon_id
    const draftPoolByName = new Map<string, { point_value: number; status: string }>()
    
    draftPoolData?.forEach((entry) => {
      if (entry.pokemon_id) {
        draftPoolMap.set(entry.pokemon_id, {
          point_value: entry.point_value,
          status: entry.status,
        })
      }
      draftPoolByName.set(entry.pokemon_name.toLowerCase(), {
        point_value: entry.point_value,
        status: entry.status,
      })
    })

    // OPTIMIZATION: Batch fetch types and tiers from database (single queries)
    console.log("[Admin Pokemon API] Batch fetching types and tiers from database...")
    
    // Batch fetch types from pokemon_cache (fallback to pokepedia_pokemon if needed)
    const { data: cacheTypesData } = await serviceSupabase
      .from("pokemon_cache")
      .select("pokemon_id, types")
      .in("pokemon_id", pokemonIds)
    
    const typesMap = new Map<number, string[]>()
    cacheTypesData?.forEach((entry) => {
      // Only store non-empty arrays to avoid storing empty arrays that block PokeAPI fallback
      if (entry.types && Array.isArray(entry.types) && entry.types.length > 0) {
        typesMap.set(entry.pokemon_id, entry.types)
      }
    })
    
    // Also try pokepedia_pokemon as fallback
    const { data: pokepediaTypesData } = await serviceSupabase
      .from("pokepedia_pokemon")
      .select("id, types")
      .in("id", pokemonIds)
    
    pokepediaTypesData?.forEach((entry) => {
      // Only store non-empty arrays to avoid storing empty arrays that block PokeAPI fallback
      if (entry.types && Array.isArray(entry.types) && entry.types.length > 0 && !typesMap.has(entry.id)) {
        typesMap.set(entry.id, entry.types)
      }
    })

    // Batch fetch tiers from pokemon_showdown
    const { data: showdownTiersData } = await serviceSupabase
      .from("pokemon_showdown")
      .select("dex_num, tier")
      .in("dex_num", pokemonIds)
    
    const tiersMap = new Map<number, string | null>()
    showdownTiersData?.forEach((entry) => {
      tiersMap.set(entry.dex_num, entry.tier || null)
    })

    // Batch fetch base stats from pokepedia_pokemon
    const { data: pokepediaStatsData } = await serviceSupabase
      .from("pokepedia_pokemon")
      .select("id, base_stats, species_name")
      .in("id", pokemonIds)
    
    const statsMap = new Map<number, { hp: number; attack: number; defense: number; "special-attack": number; "special-defense": number; speed: number }>()
    const speciesMap = new Map<number, string>()
    
    pokepediaStatsData?.forEach((entry) => {
      if (entry.base_stats && typeof entry.base_stats === 'object') {
        const stats = entry.base_stats as any
        statsMap.set(entry.id, {
          hp: stats.hp || 0,
          attack: stats.attack || 0,
          defense: stats.defense || 0,
          "special-attack": stats["special-attack"] || 0,
          "special-defense": stats["special-defense"] || 0,
          speed: stats.speed || 0,
        })
      }
      if (entry.species_name) {
        speciesMap.set(entry.id, entry.species_name)
      }
    })

    console.log(`[Admin Pokemon API] Loaded ${typesMap.size} types, ${statsMap.size} stats, ${speciesMap.size} species, and ${tiersMap.size} tiers from database`)

    // Find Pokémon missing types, stats, or species (for fallback PokeAPI fetch)
    const missingTypesIds = pokemonIds.filter((id) => !typesMap.has(id))
    const missingStatsIds = pokemonIds.filter((id) => !statsMap.has(id))
    const missingSpeciesIds = pokemonIds.filter((id) => !speciesMap.has(id))
    const missingDataIds = Array.from(new Set([...missingTypesIds, ...missingStatsIds, ...missingSpeciesIds]))
    
    // Always fetch missing types, stats, and species from PokeAPI (with proper rate limiting)
    if (missingDataIds.length > 0) {
      console.log(`[Admin Pokemon API] Fetching ${missingDataIds.length} missing data (types/stats/species) from PokeAPI...`)
      
      // Process in batches of 20 to avoid overwhelming the API
      const batchSize = 20
      let fetchedTypesCount = 0
      let fetchedStatsCount = 0
      let fetchedSpeciesCount = 0
      for (let i = 0; i < missingDataIds.length; i += batchSize) {
        const batch = missingDataIds.slice(i, i + batchSize)
        const batchPromises = batch.map(async (pokemonId) => {
          try {
            const pokemonData = await pokemonClient.getPokemonById(pokemonId)
            
            // Fetch types if missing
            if (!typesMap.has(pokemonId)) {
              try {
                // pokenode-ts structure: types is array of { slot: number, type: { name: string, url: string } }
                const types = pokemonData.types?.map((t: any) => t.type?.name).filter(Boolean) || []
                
                if (types.length > 0) {
                  typesMap.set(pokemonId, types)
                  fetchedTypesCount++
                  if (pokemonId <= 3) {
                    console.log(`[Admin Pokemon API] Successfully fetched types for ${pokemonId}:`, types)
                  }
                } else {
                  console.warn(`[Admin Pokemon API] No types extracted for ${pokemonId}, pokemonData.types:`, pokemonData.types)
                }
              } catch (typeError) {
                console.warn(`[Admin Pokemon API] Error extracting types for ${pokemonId}:`, typeError)
              }
            }
            
            // Fetch base stats if missing
            if (!statsMap.has(pokemonId) && pokemonData.stats) {
              const stats: any = {}
              pokemonData.stats.forEach((stat: any) => {
                const statName = stat.stat.name
                if (statName === 'hp') stats.hp = stat.base_stat
                else if (statName === 'attack') stats.attack = stat.base_stat
                else if (statName === 'defense') stats.defense = stat.base_stat
                else if (statName === 'special-attack') stats["special-attack"] = stat.base_stat
                else if (statName === 'special-defense') stats["special-defense"] = stat.base_stat
                else if (statName === 'speed') stats.speed = stat.base_stat
              })
              
              if (Object.keys(stats).length === 6) {
                statsMap.set(pokemonId, {
                  hp: stats.hp || 0,
                  attack: stats.attack || 0,
                  defense: stats.defense || 0,
                  "special-attack": stats["special-attack"] || 0,
                  "special-defense": stats["special-defense"] || 0,
                  speed: stats.speed || 0,
                })
                fetchedStatsCount++
              }
            }
            
            // Fetch species name if missing
            if (!speciesMap.has(pokemonId) && pokemonData.species) {
              try {
                // Get species URL and extract species ID (not pokemon ID)
                // Form variants (like those with IDs 10301+) share the base species
                const speciesUrl = pokemonData.species.url || pokemonData.species.name
                let speciesId: number | null = null
                
                if (typeof speciesUrl === 'string') {
                  // Extract ID from URL like "https://pokeapi.co/api/v2/pokemon-species/1/"
                  const match = speciesUrl.match(/pokemon-species\/(\d+)/)
                  if (match) {
                    speciesId = parseInt(match[1])
                  } else if (speciesUrl.includes('/')) {
                    // Fallback: try to parse from path
                    const parts = speciesUrl.split('/').filter(Boolean)
                    const lastPart = parts[parts.length - 1]
                    const parsed = parseInt(lastPart)
                    if (!isNaN(parsed)) {
                      speciesId = parsed
                    }
                  }
                }
                
                // Only fetch if we have a valid species ID and it's different from pokemon ID
                // (form variants use base species ID, not their own ID)
                if (speciesId && speciesId !== pokemonId) {
                  try {
                    const speciesData = await pokemonClient.getPokemonSpeciesById(speciesId)
                    // The genus field contains the species category (e.g., "Seed Pokémon")
                    if (speciesData.genera) {
                      const englishGenus = speciesData.genera.find((g: any) => g.language.name === 'en')
                      if (englishGenus) {
                        speciesMap.set(pokemonId, englishGenus.genus)
                        fetchedSpeciesCount++
                      }
                    }
                  } catch (speciesFetchError: any) {
                    // Silently skip 404 errors (some form variants don't have species entries)
                    if (speciesFetchError?.response?.status !== 404 && speciesFetchError?.status !== 404) {
                      console.warn(`[Admin Pokemon API] Failed to fetch species ${speciesId} for Pokémon ${pokemonId}:`, speciesFetchError.message || speciesFetchError)
                    }
                  }
                } else if (speciesId === pokemonId) {
                  // If species ID equals pokemon ID, try fetching directly (for base forms)
                  try {
                    const speciesData = await pokemonClient.getPokemonSpeciesById(pokemonId)
                    if (speciesData.genera) {
                      const englishGenus = speciesData.genera.find((g: any) => g.language.name === 'en')
                      if (englishGenus) {
                        speciesMap.set(pokemonId, englishGenus.genus)
                        fetchedSpeciesCount++
                      }
                    }
                  } catch (speciesFetchError: any) {
                    // Silently skip 404 errors for form variants
                    if (speciesFetchError?.response?.status !== 404 && speciesFetchError?.status !== 404) {
                      console.warn(`[Admin Pokemon API] Failed to fetch species for Pokémon ${pokemonId}:`, speciesFetchError.message || speciesFetchError)
                    }
                  }
                }
              } catch (speciesError: any) {
                // Silently skip 404 errors (form variants don't have separate species entries)
                // Only log non-404 errors
                if (speciesError?.response?.status !== 404 && speciesError?.status !== 404) {
                  console.warn(`[Admin Pokemon API] Failed to process species for Pokémon ${pokemonId}:`, speciesError.message || speciesError)
                }
              }
            }
          } catch (error) {
            console.warn(`[Admin Pokemon API] Failed to fetch data for Pokémon ${pokemonId}:`, error)
          }
        })
        await Promise.all(batchPromises)
        
        // Small delay between batches to respect rate limits
        if (i + batchSize < missingDataIds.length) {
          await new Promise((resolve) => setTimeout(resolve, 200)) // Increased delay for better rate limiting
        }
      }
      
      console.log(`[Admin Pokemon API] Fetched ${fetchedTypesCount} types, ${fetchedStatsCount} stats, and ${fetchedSpeciesCount} species from PokeAPI`)
    } else {
      console.log(`[Admin Pokemon API] All ${pokemonIds.length} Pokémon have types, stats, and species from database`)
    }

    // Process Pokémon list (use database data + any PokeAPI fallbacks)
    const pokemonData = pokemonList.results.map((result) => {
      // Extract pokemon_id from URL
      const pokemonId = parseInt(result.url.split('/').filter(Boolean).pop() || '0')
      if (!pokemonId) return null

      const name = result.name
      const generation = getGenerationFromId(pokemonId)
      
      // Get current draft_pool status
      const draftPoolEntry = draftPoolMap.get(pokemonId) || draftPoolByName.get(name.toLowerCase())
      
      // Get tier from batch-fetched map
      const tier = tiersMap.get(pokemonId) || null

      // Get types from batch-fetched map (fallback to empty array)
      let types = typesMap.get(pokemonId) || []
      
      // Ensure types is always an array
      if (!Array.isArray(types)) {
        types = []
      }
      
      // If types are still missing after batch fetch, log for debugging
      // The batch fetch should have caught them - if not, they'll be empty
      if (types.length === 0 && pokemonId <= 10) {
        console.warn(`[Admin Pokemon API] Types missing for ${pokemonId} (${name}) - typesMap.has=${typesMap.has(pokemonId)}, typesMap.size=${typesMap.size}`)
      }
      
      // Debug logging for first few Pokémon
      if (pokemonId <= 3) {
        console.log(`[Admin Pokemon API] Pokémon ${pokemonId} (${name}): types=${JSON.stringify(types)}, typesLength=${types.length}, typesMap.has=${typesMap.has(pokemonId)}`)
      }

      // Get base stats from batch-fetched map
      let baseStats = statsMap.get(pokemonId) || null
      
      // Debug logging for base stats
      if (pokemonId <= 3) {
        console.log(`[Admin Pokemon API] Pokémon ${pokemonId} (${name}): baseStats=${JSON.stringify(baseStats)}, statsMap.has=${statsMap.has(pokemonId)}`)
      }

      // Get species name from batch-fetched map
      const speciesName = speciesMap.get(pokemonId) || null

      // If we have draft_pool entry, use its point_value; otherwise derive from tier or default to 5
      const pointValue = draftPoolEntry?.point_value || (tier ? mapTierToPointValue(tier) : 5)
      // Default to false (unavailable) - only available if explicitly set in draft_pool
      const available = draftPoolEntry?.status === 'available'

      // Format Dex string: "#{id} - {species} (Gen {roman})"
      const dexFormat = speciesName 
        ? `#${pokemonId} - ${speciesName} (Gen ${generationToRoman(generation)})`
        : `#${pokemonId} (Gen ${generationToRoman(generation)})`

      return {
        pokemon_id: pokemonId,
        name: name.charAt(0).toUpperCase() + name.slice(1), // Capitalize first letter
        generation,
        types: Array.isArray(types) && types.length > 0 ? types : [], // Ensure types is always an array
        tier: tier || null,
        point_value: pointValue,
        available,
        current_status: draftPoolEntry?.status || null,
        base_stats: baseStats,
        species_name: speciesName,
        dex_format: dexFormat,
      }
    })

    // Filter out null entries
    const validPokemon = pokemonData.filter((p): p is NonNullable<typeof p> => p !== null)

    // Debug: Check types for first few Pokémon
    const sampleWithTypes = validPokemon.slice(0, 5).map(p => ({
      id: p.pokemon_id,
      name: p.name,
      types: p.types,
      typesLength: p.types?.length || 0,
    }))
    console.log(`[Admin Pokemon API] Sample Pokémon types:`, sampleWithTypes)
    console.log(`[Admin Pokemon API] Returning ${validPokemon.length} Pokémon with draft pool status`)

    return NextResponse.json(
      {
        success: true,
        pokemon: validPokemon,
        total: validPokemon.length,
        season_id: season.id,
        season_name: season.name,
        season_identifier: season.season_id,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600", // Cache for 5 minutes
        },
      }
    )
  } catch (error: any) {
    console.error("[Admin Pokemon API] Error:", error)
    console.error("[Admin Pokemon API] Error stack:", error.stack)
    return NextResponse.json(
      { 
        error: error.message || "Failed to fetch Pokémon data",
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
