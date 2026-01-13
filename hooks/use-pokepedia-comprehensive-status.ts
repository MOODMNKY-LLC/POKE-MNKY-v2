/**
 * Comprehensive Pokepedia Status Hook
 * Fetches counts from all Pokepedia tables and compares with PokeAPI
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"

const POKEAPI_BASE_URL = "https://pokeapi.co/api/v2"

export interface MasterDataCounts {
  types: number
  abilities: number
  moves: number
  items: number
  berries: number
  stats: number
  generations: number
}

export interface PokemonDataCounts {
  pokemon: number
  species: number
  forms: number
  evolutionChains: number
}

export interface RelationshipCounts {
  pokemonAbilities: number
  pokemonMoves: number
  pokemonTypes: number
  pokemonItems: number
}

export interface PokeAPIComparison {
  pokemon: { local: number; remote: number; diff: number; upToDate: boolean }
  items: { local: number; remote: number; diff: number; upToDate: boolean }
  moves: { local: number; remote: number; diff: number; upToDate: boolean }
  abilities: { local: number; remote: number; diff: number; upToDate: boolean }
  berries: { local: number; remote: number; diff: number; upToDate: boolean }
  types: { local: number; remote: number; diff: number; upToDate: boolean }
  generations: { local: number; remote: number; diff: number; upToDate: boolean }
  species: { local: number; remote: number; diff: number; upToDate: boolean }
}

export interface ComprehensiveStatus {
  masterData: MasterDataCounts
  pokemon: PokemonDataCounts
  relationships: RelationshipCounts
  pokeapiComparison?: PokeAPIComparison
  currentGeneration: number // Latest generation (9)
  leagueGeneration: number // Generation being used by league
  connected: boolean
  lastChecked: Date | null
  loading: boolean
  error: string | null
}

export function usePokepediaComprehensiveStatus() {
  const [status, setStatus] = useState<ComprehensiveStatus>({
    masterData: {
      types: 0,
      abilities: 0,
      moves: 0,
      items: 0,
      berries: 0,
      stats: 0,
      generations: 0,
    },
    pokemon: {
      pokemon: 0,
      species: 0,
      forms: 0,
      evolutionChains: 0,
    },
    relationships: {
      pokemonAbilities: 0,
      pokemonMoves: 0,
      pokemonTypes: 0,
      pokemonItems: 0,
    },
    currentGeneration: 9, // Latest generation
    leagueGeneration: 9, // Currently using latest gen
    connected: false,
    lastChecked: null,
    loading: true,
    error: null,
  })

  const supabase = createClient()

  // Fetch PokeAPI count for a resource
  const fetchPokeAPICount = useCallback(async (endpoint: string): Promise<number | null> => {
    try {
      const response = await fetch(`${POKEAPI_BASE_URL}/${endpoint}/?limit=1`)
      if (!response.ok) return null
      const data = await response.json()
      return data.count || null
    } catch (error) {
      console.error(`Error fetching PokeAPI count for ${endpoint}:`, error)
      return null
    }
  }, [])

  // Fetch all database counts
  const fetchDatabaseCounts = useCallback(async () => {
    try {
      // Master Data
      const [
        typesResult,
        abilitiesResult,
        movesResult,
        itemsResult,
        berriesResult,
        statsResult,
        generationsResult,
      ] = await Promise.all([
        supabase.from("types").select("*", { count: "exact", head: true }),
        supabase.from("abilities").select("*", { count: "exact", head: true }),
        supabase.from("moves").select("*", { count: "exact", head: true }),
        supabase.from("items").select("*", { count: "exact", head: true }),
        supabase.from("berries").select("*", { count: "exact", head: true }),
        supabase.from("stats").select("*", { count: "exact", head: true }),
        supabase.from("generations").select("*", { count: "exact", head: true }),
      ])

      // Pokemon Data (try pokepedia_pokemon first, fallback to pokemon_comprehensive)
      const [pokemonResult, pokemonComprehensiveResult, speciesResult, formsResult, evolutionResult] =
        await Promise.all([
          supabase.from("pokepedia_pokemon").select("*", { count: "exact", head: true }),
          supabase.from("pokemon_comprehensive").select("*", { count: "exact", head: true }),
          supabase.from("pokemon_species").select("*", { count: "exact", head: true }),
          supabase.from("pokemon_forms").select("*", { count: "exact", head: true }),
          supabase.from("evolution_chains").select("*", { count: "exact", head: true }),
        ])

      // Relationships
      const [abilitiesRelResult, movesRelResult, typesRelResult, itemsRelResult] = await Promise.all([
        supabase.from("pokemon_abilities").select("*", { count: "exact", head: true }),
        supabase.from("pokemon_moves").select("*", { count: "exact", head: true }),
        supabase.from("pokemon_types").select("*", { count: "exact", head: true }),
        supabase.from("pokemon_items").select("*", { count: "exact", head: true }),
      ])

      // Get latest generation from database
      const { data: latestGen } = await supabase
        .from("generations")
        .select("generation_id")
        .order("generation_id", { ascending: false })
        .limit(1)
        .single()

      const currentGen = latestGen?.generation_id || 9

      // Determine league generation (currently using latest)
      const leagueGen = currentGen

      return {
        masterData: {
          types: typesResult.count || 0,
          abilities: abilitiesResult.count || 0,
          moves: movesResult.count || 0,
          items: itemsResult.count || 0,
          berries: berriesResult.count || 0,
          stats: statsResult.count || 0,
          generations: generationsResult.count || 0,
        },
        pokemon: {
          pokemon: pokemonResult.count || pokemonComprehensiveResult.count || 0,
          species: speciesResult.count || 0,
          forms: formsResult.count || 0,
          evolutionChains: evolutionResult.count || 0,
        },
        relationships: {
          pokemonAbilities: abilitiesRelResult.count || 0,
          pokemonMoves: movesRelResult.count || 0,
          pokemonTypes: typesRelResult.count || 0,
          pokemonItems: itemsRelResult.count || 0,
        },
        currentGeneration: currentGen,
        leagueGeneration: leagueGen,
        connected: true,
      }
    } catch (error) {
      console.error("Error fetching database counts:", error)
      return {
        masterData: {
          types: 0,
          abilities: 0,
          moves: 0,
          items: 0,
          berries: 0,
          stats: 0,
          generations: 0,
        },
        pokemon: {
          pokemon: 0,
          species: 0,
          forms: 0,
          evolutionChains: 0,
        },
        relationships: {
          pokemonAbilities: 0,
          pokemonMoves: 0,
          pokemonTypes: 0,
          pokemonItems: 0,
        },
        currentGeneration: 9,
        leagueGeneration: 9,
        connected: false,
      }
    }
  }, [supabase])

  // Compare with PokeAPI
  const checkPokeAPI = useCallback(async () => {
    setStatus((prev) => ({ ...prev, loading: true, error: null }))

    try {
      const dbCounts = await fetchDatabaseCounts()

      // Fetch PokeAPI counts
      const [
        pokeapiPokemon,
        pokeapiItems,
        pokeapiMoves,
        pokeapiAbilities,
        pokeapiBerries,
        pokeapiTypes,
        pokeapiGenerations,
        pokeapiSpecies,
      ] = await Promise.all([
        fetchPokeAPICount("pokemon"),
        fetchPokeAPICount("item"),
        fetchPokeAPICount("move"),
        fetchPokeAPICount("ability"),
        fetchPokeAPICount("berry"),
        fetchPokeAPICount("type"),
        fetchPokeAPICount("generation"),
        fetchPokeAPICount("pokemon-species"),
      ])

      const comparison: PokeAPIComparison = {
        pokemon: {
          local: dbCounts.pokemon.pokemon,
          remote: pokeapiPokemon || 0,
          diff: (pokeapiPokemon || 0) - dbCounts.pokemon.pokemon,
          upToDate: dbCounts.pokemon.pokemon >= (pokeapiPokemon || 0),
        },
        items: {
          local: dbCounts.masterData.items,
          remote: pokeapiItems || 0,
          diff: (pokeapiItems || 0) - dbCounts.masterData.items,
          upToDate: dbCounts.masterData.items >= (pokeapiItems || 0),
        },
        moves: {
          local: dbCounts.masterData.moves,
          remote: pokeapiMoves || 0,
          diff: (pokeapiMoves || 0) - dbCounts.masterData.moves,
          upToDate: dbCounts.masterData.moves >= (pokeapiMoves || 0),
        },
        abilities: {
          local: dbCounts.masterData.abilities,
          remote: pokeapiAbilities || 0,
          diff: (pokeapiAbilities || 0) - dbCounts.masterData.abilities,
          upToDate: dbCounts.masterData.abilities >= (pokeapiAbilities || 0),
        },
        berries: {
          local: dbCounts.masterData.berries,
          remote: pokeapiBerries || 0,
          diff: (pokeapiBerries || 0) - dbCounts.masterData.berries,
          upToDate: dbCounts.masterData.berries >= (pokeapiBerries || 0),
        },
        types: {
          local: dbCounts.masterData.types,
          remote: pokeapiTypes || 0,
          diff: (pokeapiTypes || 0) - dbCounts.masterData.types,
          upToDate: dbCounts.masterData.types >= (pokeapiTypes || 0),
        },
        generations: {
          local: dbCounts.masterData.generations,
          remote: pokeapiGenerations || 0,
          diff: (pokeapiGenerations || 0) - dbCounts.masterData.generations,
          upToDate: dbCounts.masterData.generations >= (pokeapiGenerations || 0),
        },
        species: {
          local: dbCounts.pokemon.species,
          remote: pokeapiSpecies || 0,
          diff: (pokeapiSpecies || 0) - dbCounts.pokemon.species,
          upToDate: dbCounts.pokemon.species >= (pokeapiSpecies || 0),
        },
      }

      setStatus((prev) => ({
        ...prev,
        ...dbCounts,
        pokeapiComparison: comparison,
        lastChecked: new Date(),
        loading: false,
      }))
    } catch (error) {
      console.error("Error checking PokeAPI:", error)
      setStatus((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to check PokeAPI",
        loading: false,
      }))
    }
  }, [fetchDatabaseCounts, fetchPokeAPICount])

  // Initial load
  useEffect(() => {
    const loadStatus = async () => {
      setStatus((prev) => ({ ...prev, loading: true }))
      const dbCounts = await fetchDatabaseCounts()
      setStatus((prev) => ({
        ...prev,
        ...dbCounts,
        lastChecked: new Date(),
        loading: false,
      }))
    }

    loadStatus()
  }, [fetchDatabaseCounts])

  return {
    status,
    refresh: fetchDatabaseCounts,
    checkPokeAPI,
  }
}
