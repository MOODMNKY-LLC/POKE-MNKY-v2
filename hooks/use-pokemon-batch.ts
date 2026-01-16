/**
 * Hook to batch fetch multiple Pokemon data at once
 * Optimizes performance with:
 * - In-memory cache to prevent re-fetching
 * - Supabase cache check before API calls
 * - Batch fetching from Supabase
 * - Parallel API calls with rate limiting
 */

"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { getPokemon, parsePokemonFromCache, type PokemonDisplayData } from "@/lib/pokemon-utils"

// In-memory cache to prevent re-fetching the same Pokemon
const pokemonDataCache = new Map<number, PokemonDisplayData | null>()

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
    const abortController = new AbortController()

    async function fetchBatch() {
      setLoading(true)
      setError(null)
      
      try {
        const map = new Map<number, PokemonDisplayData>()
        const supabase = createClient()
        
        // Step 1: Check in-memory cache first
        const uncachedIds: number[] = []
        pokemonIds.forEach(id => {
          const cached = pokemonDataCache.get(id)
          if (cached !== undefined) {
            map.set(id, cached)
          } else {
            uncachedIds.push(id)
          }
        })

        if (uncachedIds.length === 0) {
          console.log(`[usePokemonBatch] All ${pokemonIds.length} Pokemon found in memory cache`)
          if (!cancelled && !abortController.signal.aborted) {
            setPokemonMap(map)
            setLoading(false)
          }
          return
        }

        console.log(`[usePokemonBatch] Checking Supabase cache for ${uncachedIds.length} Pokemon...`)
        
        // Step 2: Batch fetch from Supabase cache
        const { data: cachedPokemon, error: cacheError } = await supabase
          .from("pokemon_cache")
          .select("*")
          .in("pokemon_id", uncachedIds)
          .gt("expires_at", new Date().toISOString())

        if (cacheError) {
          console.debug("[usePokemonBatch] Cache query error:", cacheError)
        }

        // Process cached Pokemon
        const cacheHitIds = new Set<number>()
        if (cachedPokemon && cachedPokemon.length > 0) {
          cachedPokemon.forEach((cached: any) => {
            try {
              const parsed = parsePokemonFromCache(cached)
              if (parsed) {
                map.set(cached.pokemon_id, parsed)
                pokemonDataCache.set(cached.pokemon_id, parsed)
                cacheHitIds.add(cached.pokemon_id)
              }
            } catch (parseError) {
              console.debug(`[usePokemonBatch] Error parsing cached Pokemon ${cached.pokemon_id}:`, parseError)
            }
          })
          console.log(`[usePokemonBatch] Found ${cacheHitIds.size} Pokemon in Supabase cache`)
        }

        // Step 3: Fetch missing Pokemon from PokeAPI (in batches to avoid rate limiting)
        const missingIds = uncachedIds.filter(id => !cacheHitIds.has(id))
        
        if (missingIds.length > 0) {
          console.log(`[usePokemonBatch] Fetching ${missingIds.length} Pokemon from PokeAPI...`)
          
          // Fetch in batches of 6 with small delays to avoid rate limiting
          // Use requestIdleCallback or setTimeout to prevent blocking the main thread
          const batchSize = 6
          for (let i = 0; i < missingIds.length; i += batchSize) {
            if (cancelled || abortController.signal.aborted) break

            const batch = missingIds.slice(i, i + batchSize)
            
            // Process batch asynchronously to prevent blocking
            await new Promise<void>((resolve) => {
              // Use setTimeout to yield to the event loop
              setTimeout(async () => {
                const results = await Promise.allSettled(
                  batch.map(async (id) => {
                    try {
                      const pokemon = await getPokemon(id)
                      return { id, pokemon }
                    } catch (error) {
                      throw { id, error }
                    }
                  })
                )

                results.forEach((result) => {
                  if (cancelled || abortController.signal.aborted) return

                  if (result.status === 'fulfilled') {
                    const { id, pokemon } = result.value
                    if (pokemon) {
                      map.set(id, pokemon)
                      pokemonDataCache.set(id, pokemon)
                    } else {
                      pokemonDataCache.set(id, null)
                    }
                  } else {
                    const { id, error } = result.reason
                    console.debug(`[usePokemonBatch] Failed to fetch Pokemon ${id}:`, error)
                    pokemonDataCache.set(id, null)
                  }
                })
                
                resolve()
              }, 0)
            })

            // Small delay between batches to avoid rate limiting
            if (i + batchSize < missingIds.length) {
              await new Promise(resolve => setTimeout(resolve, 100))
            }
          }
        }
        
        console.log(`[usePokemonBatch] Complete. Fetched ${map.size} out of ${pokemonIds.length} Pokemon`)
        
        if (!cancelled && !abortController.signal.aborted) {
          setPokemonMap(map)
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled && !abortController.signal.aborted) {
          console.error("[usePokemonBatch] Unexpected error:", err)
          setError(err instanceof Error ? err.message : "Failed to fetch Pokemon batch")
          setLoading(false)
        }
      }
    }

    fetchBatch()

    return () => {
      cancelled = true
      abortController.abort()
    }
  }, [pokemonIds.join(",")]) // Re-fetch if IDs change

  return { pokemonMap, loading, error }
}
