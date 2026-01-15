/**
 * Hook to batch fetch multiple Pokemon data at once
 * Optimizes performance by fetching all Pokemon in a single query
 */

"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { adaptPokepediaToDisplayData, parseJsonbField } from "@/lib/pokepedia-adapter"
import type { PokemonDisplayData } from "@/lib/pokemon-utils"

export function usePokemonBatch(pokemonIds: number[]) {
  const [pokemonMap, setPokemonMap] = useState<Map<number, PokemonDisplayData>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (pokemonIds.length === 0) {
      setLoading(false)
      return
    }

    let cancelled = false

    async function fetchBatch() {
      setLoading(true)
      setError(null)
      
      try {
        const supabase = createBrowserClient()
        
        // Batch fetch all Pokemon in a single query
        const { data, error: queryError } = await supabase
          .from("pokepedia_pokemon")
          .select("*")
          .in("id", pokemonIds)

        if (queryError) {
          throw new Error(`Failed to fetch Pokemon batch: ${queryError.message}`)
        }

        if (!cancelled && data) {
          const map = new Map<number, PokemonDisplayData>()
          
          // Process each Pokemon
          data.forEach((row) => {
            try {
              const adapted = adaptPokepediaToDisplayData({
                ...row,
                types: parseJsonbField<string[]>(row.types) || row.types,
                base_stats: parseJsonbField<typeof row.base_stats>(row.base_stats) || row.base_stats,
                abilities: parseJsonbField<typeof row.abilities>(row.abilities) || row.abilities,
              })
              map.set(row.id, adapted)
            } catch (adaptError) {
              console.error(`Error adapting Pokemon ${row.id}:`, adaptError)
            }
          })
          
          setPokemonMap(map)
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to fetch Pokemon batch")
          setLoading(false)
        }
      }
    }

    fetchBatch()

    return () => {
      cancelled = true
    }
  }, [pokemonIds.join(",")]) // Re-fetch if IDs change

  return { pokemonMap, loading, error }
}
