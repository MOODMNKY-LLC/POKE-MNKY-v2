/**
 * Pokemon Evolution Chain Utilities
 * Functions to fetch and parse evolution chain data
 */

import { createBrowserClient } from "@/lib/supabase/client"

const supabase = createBrowserClient()

export interface EvolutionLink {
  id: number
  name: string
  order: number
}

/**
 * Parse evolution chain recursively to extract Pokemon IDs
 */
function parseEvolutionChain(chainLink: any, result: EvolutionLink[] = []): EvolutionLink[] {
  if (!chainLink || !chainLink.species) return result

  const speciesId = extractIdFromUrl(chainLink.species.url)
  if (speciesId) {
    result.push({
      id: speciesId,
      name: chainLink.species.name,
      order: result.length,
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
 * Extract ID from PokeAPI URL
 */
function extractIdFromUrl(url: string | null | undefined): number | null {
  if (!url) return null
  const match = url.match(/\/(\d+)\/?$/)
  return match ? parseInt(match[1], 10) : null
}

/**
 * Get evolution chain for a Pokemon
 */
export async function getPokemonEvolutionChain(pokemonId: number): Promise<EvolutionLink[]> {
  try {
    // Try to get species_id from pokemon_comprehensive first
    let speciesId: number | null = null

    const { data: pokemonData } = await supabase
      .from("pokemon_comprehensive")
      .select("species_id")
      .eq("pokemon_id", pokemonId)
      .single()

    if (pokemonData?.species_id) {
      speciesId = pokemonData.species_id
    } else {
      // Fallback: For base forms, species_id often equals pokemon_id
      // Try pokemon_species directly
      const { data: speciesData } = await supabase
        .from("pokemon_species")
        .select("species_id, evolution_chain_id")
        .eq("species_id", pokemonId)
        .single()

      if (speciesData?.species_id) {
        speciesId = speciesData.species_id
      } else {
        // Last resort: assume pokemon_id = species_id for base forms
        speciesId = pokemonId
      }
    }

    if (!speciesId) return []

    // Get species evolution_chain_id
    const { data: speciesData } = await supabase
      .from("pokemon_species")
      .select("evolution_chain_id")
      .eq("species_id", speciesId)
      .single()

    if (!speciesData?.evolution_chain_id) return []

    // Get evolution chain
    const { data: chainData } = await supabase
      .from("evolution_chains")
      .select("chain_data")
      .eq("evolution_chain_id", speciesData.evolution_chain_id)
      .single()

    if (!chainData?.chain_data) return []

    // Parse chain - returns species IDs
    const chain = parseEvolutionChain(chainData.chain_data)
    
    // Convert species IDs to Pokemon IDs
    // For most Pokemon, the default form's pokemon_id matches species_id
    const pokemonIds: EvolutionLink[] = []
    
    // Batch fetch Pokemon IDs for all species in the chain
    const speciesIds = chain.map((link) => link.id)
    const { data: pokemonList } = await supabase
      .from("pokemon_comprehensive")
      .select("pokemon_id, species_id, is_default")
      .in("species_id", speciesIds)
      .eq("is_default", true)

    // Create a map of species_id -> pokemon_id
    const speciesToPokemonMap = new Map<number, number>()
    pokemonList?.forEach((p) => {
      if (p.species_id && p.pokemon_id) {
        speciesToPokemonMap.set(p.species_id, p.pokemon_id)
      }
    })

    // Convert chain links to use Pokemon IDs
    for (const link of chain) {
      const pokemonId = speciesToPokemonMap.get(link.id) || link.id // Fallback to species_id if not found
      pokemonIds.push({
        id: pokemonId,
        name: link.name,
        order: link.order,
      })
    }

    return pokemonIds
  } catch (error) {
    console.error("Error fetching evolution chain:", error)
    return []
  }
}

/**
 * Get starter Pokemon by generation
 */
export const STARTER_POKEMON_BY_GENERATION: Record<number, Array<{ name: string; id: number }>> = {
  1: [
    { name: "bulbasaur", id: 1 },
    { name: "charmander", id: 4 },
    { name: "squirtle", id: 7 },
  ],
  2: [
    { name: "chikorita", id: 152 },
    { name: "cyndaquil", id: 155 },
    { name: "totodile", id: 158 },
  ],
  3: [
    { name: "treecko", id: 252 },
    { name: "torchic", id: 255 },
    { name: "mudkip", id: 258 },
  ],
  4: [
    { name: "turtwig", id: 387 },
    { name: "chimchar", id: 390 },
    { name: "piplup", id: 393 },
  ],
  5: [
    { name: "snivy", id: 495 },
    { name: "tepig", id: 498 },
    { name: "oshawott", id: 501 },
  ],
  6: [
    { name: "chespin", id: 650 },
    { name: "fennekin", id: 653 },
    { name: "froakie", id: 656 },
  ],
  7: [
    { name: "rowlet", id: 722 },
    { name: "litten", id: 725 },
    { name: "popplio", id: 728 },
  ],
  8: [
    { name: "grookey", id: 810 },
    { name: "scorbunny", id: 813 },
    { name: "sobble", id: 816 },
  ],
  9: [
    { name: "sprigatito", id: 906 },
    { name: "fuecoco", id: 909 },
    { name: "quaxly", id: 912 },
  ],
}
