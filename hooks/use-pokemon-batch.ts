/**
 * Hook to batch fetch multiple Pokemon data at once
 * Optimizes performance by fetching all Pokemon in a single query
 */

"use client"

import { useState, useEffect } from "react"
import { getPokemon } from "@/lib/pokemon-utils"
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
        // CLIENT-SIDE: Skip Supabase entirely, fetch directly from official PokeAPI
        // This aligns with our architecture: client-side uses official API via pokenode-ts
        console.log("[usePokemonBatch] Client-side: Fetching directly from official PokeAPI for", pokemonIds.length, "Pokemon")
        
        // Fetch each Pokemon individually using getPokemon (which uses official API on client-side)
        const map = new Map<number, PokemonDisplayData>()
        const fetchPromises = pokemonIds.map(async (id) => {
          try {
            const pokemon = await getPokemon(id)
            if (pokemon) {
              map.set(id, pokemon)
              console.log(`[usePokemonBatch] Successfully fetched Pokemon ${id}: ${pokemon.name}`)
            } else {
              console.debug(`[usePokemonBatch] No data returned for Pokemon ${id}`)
            }
          } catch (err) {
            console.debug(`[usePokemonBatch] Failed to fetch Pokemon ${id}:`, err)
          }
        })

        await Promise.allSettled(fetchPromises)
        
        console.log(`[usePokemonBatch] Complete. Fetched ${map.size} out of ${pokemonIds.length} Pokemon`)
        
        if (!cancelled) {
          setPokemonMap(map)
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          console.error("[usePokemonBatch] Unexpected error:", err)
          // Try fallback to individual fetches
          try {
            const map = new Map<number, PokemonDisplayData>()
            const fetchPromises = pokemonIds.map(async (id) => {
              try {
                const pokemon = await getPokemon(id)
                if (pokemon) {
                  map.set(id, pokemon)
                }
              } catch (fetchErr) {
                console.debug(`[usePokemonBatch] Failed to fetch Pokemon ${id}:`, fetchErr)
              }
            })

            await Promise.allSettled(fetchPromises)
            
            if (!cancelled) {
              setPokemonMap(map)
              setLoading(false)
            }
          } catch (fallbackErr) {
            if (!cancelled) {
              setError(err instanceof Error ? err.message : "Failed to fetch Pokemon batch")
              setLoading(false)
            }
          }
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
