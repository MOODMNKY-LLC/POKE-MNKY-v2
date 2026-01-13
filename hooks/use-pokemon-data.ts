/**
 * Hook to fetch comprehensive Pokemon data
 */

"use client"

import { useState, useEffect } from "react"
import { getPokemon, type PokemonDisplayData } from "@/lib/pokemon-utils"

export function usePokemonData(pokemonId: number | string) {
  const [pokemon, setPokemon] = useState<PokemonDisplayData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchPokemon() {
      setLoading(true)
      setError(null)
      try {
        const data = await getPokemon(pokemonId)
        if (!cancelled) {
          if (data) {
            setPokemon(data)
          } else {
            setError("Pokemon not found")
          }
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to fetch Pokemon")
          setLoading(false)
        }
      }
    }

    fetchPokemon()

    return () => {
      cancelled = true
    }
  }, [pokemonId])

  return { pokemon, loading, error }
}
