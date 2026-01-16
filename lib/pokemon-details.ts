/**
 * Comprehensive Pokemon Details Utilities
 * Fetches additional Pokemon data from PokeAPI for detailed Pokédex display
 */

const OFFICIAL_POKEAPI_URL = "https://pokeapi.co/api/v2"

export interface PokemonSpeciesData {
  id: number
  name: string
  gender_rate: number // -1 = genderless, 0-8 = female ratio (0 = 0% female, 8 = 100% female)
  egg_groups: Array<{ name: string; url: string }>
  flavor_text_entries: Array<{
    flavor_text: string
    language: { name: string; url: string }
    version: { name: string; url: string }
  }>
  evolution_chain: { url: string }
  genera: Array<{ genus: string; language: { name: string } }>
}

export interface EvolutionChainData {
  id: number
  chain: {
    species: { name: string; url: string }
    evolves_to: Array<{
      species: { name: string; url: string }
      evolves_to: Array<{
        species: { name: string; url: string }
        evolves_to: any[]
      }>
    }>
  }
}

export interface MoveDetail {
  id: number
  name: string
  type: { name: string }
  power: number | null
  accuracy: number | null
  pp: number | null
  effect_entries: Array<{
    effect: string
    short_effect: string
    language: { name: string }
  }>
  damage_class: { name: string }
  priority: number
}

export interface PokemonMove {
  move: { name: string; url: string }
  version_group_details: Array<{
    level_learned_at: number
    move_learn_method: { name: string }
    version_group: { name: string }
  }>
}

/**
 * Extract ID from PokeAPI URL
 */
function extractIdFromUrl(url: string | null | undefined): number | null {
  if (!url) return null
  const match = url.match(/\/(\d+)\/?$/)
  return match ? parseInt(match[1], 10) : null
}

/**
 * Fetch Pokemon Species data from PokeAPI
 */
export async function getPokemonSpeciesData(pokemonId: number): Promise<PokemonSpeciesData | null> {
  try {
    // First get the Pokemon to find species URL
    const pokemonResponse = await fetch(`${OFFICIAL_POKEAPI_URL}/pokemon/${pokemonId}`)
    if (!pokemonResponse.ok) return null
    
    const pokemonData = await pokemonResponse.json()
    const speciesUrl = pokemonData.species?.url
    if (!speciesUrl) return null
    
    // Fetch species data
    const speciesResponse = await fetch(speciesUrl)
    if (!speciesResponse.ok) return null
    
    return await speciesResponse.json()
  } catch (error) {
    console.error(`[Pokemon Details] Error fetching species data for Pokemon ${pokemonId}:`, error)
    return null
  }
}

/**
 * Fetch Evolution Chain data from PokeAPI
 */
export async function getEvolutionChainData(evolutionChainUrl: string): Promise<EvolutionChainData | null> {
  try {
    const response = await fetch(evolutionChainUrl)
    if (!response.ok) return null
    return await response.json()
  } catch (error) {
    console.error(`[Pokemon Details] Error fetching evolution chain:`, error)
    return null
  }
}

/**
 * Parse evolution chain recursively to extract Pokemon names and IDs
 */
function parseEvolutionChain(chainLink: any, result: Array<{ id: number; name: string }> = []): Array<{ id: number; name: string }> {
  if (!chainLink || !chainLink.species) return result

  const speciesId = extractIdFromUrl(chainLink.species.url)
  if (speciesId) {
    result.push({
      id: speciesId,
      name: chainLink.species.name,
    })
  }

  // Recursively process evolves_to
  if (chainLink.evolves_to && chainLink.evolves_to.length > 0) {
    for (const nextLink of chainLink.evolves_to) {
      parseEvolutionChain(nextLink, result)
    }
  }

  return result
}

/**
 * Get evolution chain for a Pokemon (returns array of {id, name})
 */
export async function getPokemonEvolutionChain(pokemonId: number): Promise<Array<{ id: number; name: string }>> {
  try {
    const speciesData = await getPokemonSpeciesData(pokemonId)
    if (!speciesData?.evolution_chain?.url) return []

    const chainData = await getEvolutionChainData(speciesData.evolution_chain.url)
    if (!chainData?.chain) return []

    return parseEvolutionChain(chainData.chain)
  } catch (error) {
    console.error(`[Pokemon Details] Error getting evolution chain for Pokemon ${pokemonId}:`, error)
    return []
  }
}

/**
 * Get gender ratio as percentage string
 */
export function getGenderRatio(gender_rate: number): string {
  if (gender_rate === -1) return "Genderless"
  
  // gender_rate is 0-8, where 8 = 100% female
  const femalePercent = (gender_rate / 8) * 100
  const malePercent = 100 - femalePercent
  
  if (femalePercent === 0) return "100% male"
  if (malePercent === 0) return "100% female"
  
  return `${malePercent.toFixed(1)}% male, ${femalePercent.toFixed(1)}% female`
}

/**
 * Get English flavor text (latest version)
 */
export function getFlavorText(speciesData: PokemonSpeciesData | null): string {
  if (!speciesData?.flavor_text_entries) return ""
  
  // Find English flavor text entries, prefer latest version
  const englishEntries = speciesData.flavor_text_entries
    .filter(entry => entry.language.name === "en")
    .sort((a, b) => {
      // Sort by version name (latest first)
      return b.version.name.localeCompare(a.version.name)
    })
  
  if (englishEntries.length > 0) {
    // Clean up flavor text (remove newlines, fix spacing)
    return englishEntries[0].flavor_text.replace(/\f/g, " ").replace(/\n/g, " ").trim()
  }
  
  return ""
}

/**
 * Fetch move details from PokeAPI
 */
export async function getMoveDetails(moveUrl: string): Promise<MoveDetail | null> {
  try {
    const response = await fetch(moveUrl)
    if (!response.ok) return null
    return await response.json()
  } catch (error) {
    console.error(`[Pokemon Details] Error fetching move details:`, error)
    return null
  }
}

/**
 * Organize Pokemon moves by learn method
 */
export interface OrganizedMoves {
  levelUp: Array<{
    level: number
    move: MoveDetail | null
    moveName: string
  }>
  machine: Array<{
    move: MoveDetail | null
    moveName: string
  }>
  egg: Array<{
    move: MoveDetail | null
    moveName: string
  }>
  tutor: Array<{
    move: MoveDetail | null
    moveName: string
  }>
}

/**
 * Organize Pokemon moves by learn method and fetch details
 */
export async function organizePokemonMoves(moves: PokemonMove[]): Promise<OrganizedMoves> {
  const organized: OrganizedMoves = {
    levelUp: [],
    machine: [],
    egg: [],
    tutor: [],
  }

  // Process moves in parallel (with reasonable concurrency)
  const movePromises = moves.map(async (moveEntry) => {
    const moveDetails = await getMoveDetails(moveEntry.move.url)
    
    // Group by learn method
    for (const versionDetail of moveEntry.version_group_details) {
      const method = versionDetail.move_learn_method.name
      const moveName = moveEntry.move.name
      
      if (method === "level-up") {
        organized.levelUp.push({
          level: versionDetail.level_learned_at,
          move: moveDetails,
          moveName,
        })
      } else if (method === "machine") {
        organized.machine.push({
          move: moveDetails,
          moveName,
        })
      } else if (method === "egg") {
        organized.egg.push({
          move: moveDetails,
          moveName,
        })
      } else if (method === "tutor") {
        organized.tutor.push({
          move: moveDetails,
          moveName,
        })
      }
    }
  })

  await Promise.allSettled(movePromises)

  // Sort level-up moves by level
  organized.levelUp.sort((a, b) => a.level - b.level)
  
  // Remove duplicates (same move learned multiple ways)
  const seen = new Set<string>()
  organized.machine = organized.machine.filter(m => {
    if (seen.has(m.moveName)) return false
    seen.add(m.moveName)
    return true
  })
  
  seen.clear()
  organized.egg = organized.egg.filter(m => {
    if (seen.has(m.moveName)) return false
    seen.add(m.moveName)
    return true
  })
  
  seen.clear()
  organized.tutor = organized.tutor.filter(m => {
    if (seen.has(m.moveName)) return false
    seen.add(m.moveName)
    return true
  })

  return organized
}
