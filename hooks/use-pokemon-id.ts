/**
 * Hook to fetch pokemon_id from Pokemon name
 * Used when pokemon_id is not available in draft_pool
 */

import { useState, useEffect } from "react"

export function usePokemonId(name: string | null | undefined): number | null {
  const [pokemonId, setPokemonId] = useState<number | null>(null)

  useEffect(() => {
    if (!name) {
      setPokemonId(null)
      return
    }

    // Normalize name for PokeAPI (lowercase, hyphenated)
    const normalizedName = name.toLowerCase().replace(/\s+/g, "-")

    // Fetch from PokeAPI
    fetch(`https://pokeapi.co/api/v2/pokemon/${normalizedName}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Pokemon not found: ${name}`)
        }
        return res.json()
      })
      .then((data) => {
        if (data.id) {
          setPokemonId(data.id)
        }
      })
      .catch((error) => {
        console.debug(`[usePokemonId] Failed to fetch ID for ${name}:`, error)
        setPokemonId(null)
      })
  }, [name])

  return pokemonId
}
