/**
 * Offline-First Pokepedia Client
 * Checks local IndexedDB first, then Supabase, then PokeAPI
 * Enables true offline-only mode
 */

import { getPokemonLocally, getPokemonByNameLocally, searchPokemonLocally } from "./pokepedia-offline-db"
import { createBrowserClient } from "@/lib/supabase/client"
import { MainClient } from "pokenode-ts"

// Use shared browser client singleton to avoid multiple GoTrueClient instances
function getSupabaseClient() {
  return createBrowserClient() // Now uses singleton pattern internally
}

const pokeApi = new MainClient()

/**
 * Get Pokemon data (offline-first)
 * Priority: Local IndexedDB → Supabase → PokeAPI
 */
export async function getPokemonOfflineFirst(
  nameOrId: string | number,
  options: { preferLocal?: boolean } = {}
): Promise<any | null> {
  const { preferLocal = true } = options

  // Step 1: Check local IndexedDB
  if (preferLocal) {
    const localPokemon =
      typeof nameOrId === "number"
        ? await getPokemonLocally(nameOrId)
        : await getPokemonByNameLocally(nameOrId)

    if (localPokemon) {
      console.log("[Pokepedia] Cache hit (local):", localPokemon.name)
      return localPokemon
    }
  }

  // Step 2: Check Supabase
  try {
    const supabase = getSupabaseClient()
    const query =
      typeof nameOrId === "number"
        ? supabase.from("pokemon_comprehensive").select("*").eq("pokemon_id", nameOrId).single()
        : supabase.from("pokemon_comprehensive").select("*").eq("name", nameOrId).single()

    const { data, error } = await query

    if (!error && data) {
      console.log("[Pokepedia] Cache hit (Supabase):", data.name)
      // Optionally store locally for next time
      // await storePokemonLocally(transformToLocal(data))
      return data
    }
  } catch (error) {
    console.warn("[Pokepedia] Supabase query failed:", error)
  }

  // Step 3: Fallback to PokeAPI (if online)
  if (typeof navigator !== "undefined" && navigator.onLine) {
    try {
      const pokemon =
        typeof nameOrId === "number"
          ? await pokeApi.pokemon.getPokemonById(nameOrId)
          : await pokeApi.pokemon.getPokemonByName(nameOrId.toString())

      console.log("[Pokepedia] Fetched from PokeAPI:", pokemon.name)
      return pokemon
    } catch (error) {
      console.error("[Pokepedia] PokeAPI fetch failed:", error)
    }
  }

  return null
}

/**
 * Search Pokemon (offline-first)
 */
export async function searchPokemonOfflineFirst(query: string): Promise<any[]> {
  // Try local first
  const localResults = await searchPokemonLocally(query)
  if (localResults.length > 0) {
    return localResults
  }

  // Fallback to Supabase
  try {
    const { data } = await supabase
      .from("pokemon_comprehensive")
      .select("*")
      .ilike("name", `%${query}%`)
      .limit(50)

    return data || []
  } catch (error) {
    console.error("[Pokepedia] Search failed:", error)
    return []
  }
}

/**
 * Check if offline mode is available
 */
export async function isOfflineModeAvailable(): Promise<boolean> {
  const { getLocalPokemonCount } = await import("./pokepedia-offline-db")
  const count = await getLocalPokemonCount()
  return count > 0
}
