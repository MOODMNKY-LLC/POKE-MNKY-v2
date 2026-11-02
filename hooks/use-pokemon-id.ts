/**
 * Hook to fetch pokemon_id from Pokemon name
 * Used when pokemon_id is not available in draft_pool.
 * Goes through /api/pokemon/[name] (DB-first server read) — never pokeapi.co from the browser.
 */

import { useState, useEffect } from "react"

export function usePokemonId(name: string | null | undefined): number | null {
  const [pokemonId, setPokemonId] = useState<number | null>(null)

  useEffect(() => {
    if (!name) {
      setPokemonId(null)
      return
    }

    const normalizedName = name.toLowerCase().replace(/\s+/g, "-")
    let cancelled = false

    fetch(`/api/pokemon/${encodeURIComponent(normalizedName)}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Pokemon not found: ${name}`)
        }
        return res.json() as Promise<{ pokemon_id?: number }>
      })
      .then((data) => {
        if (!cancelled && data.pokemon_id) {
          setPokemonId(data.pokemon_id)
        }
      })
      .catch((error) => {
        console.debug(`[usePokemonId] Failed to fetch ID for ${name}:`, error)
        if (!cancelled) setPokemonId(null)
      })

    return () => {
      cancelled = true
    }
  }, [name])

  return pokemonId
}
