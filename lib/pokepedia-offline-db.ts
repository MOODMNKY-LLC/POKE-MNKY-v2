/**
 * Offline-First Pokepedia Database
 * Uses Dexie.js (IndexedDB) for local storage
 * Enables offline-only mode with comprehensive Pokemon data
 */

import Dexie, { Table } from "dexie"

export interface LocalPokemon {
  pokemon_id: number
  name: string
  base_experience: number | null
  height: number | null
  weight: number | null
  sprites: any
  species_id: number | null
  types: string[]
  abilities: string[]
  moves: string[]
  stats: Record<string, number>
  updated_at: string
}

export interface LocalMasterData {
  id: string // "types", "abilities", "moves", etc.
  data: any
  updated_at: string
}

export interface LocalSyncStatus {
  id: string
  phase: string
  last_synced: string
  total_items: number
  synced_items: number
}

class PokepediaDB extends Dexie {
  pokemon!: Table<LocalPokemon, number>
  master_data!: Table<LocalMasterData, string>
  sync_status!: Table<LocalSyncStatus, string>

  constructor() {
    super("PokepediaDB")
    this.version(1).stores({
      pokemon: "pokemon_id, name, species_id, updated_at",
      master_data: "id, updated_at",
      sync_status: "id, phase, last_synced",
    })
  }
}

export const db = new PokepediaDB()

/**
 * Initialize offline database and check sync status
 */
export async function initializeOfflineDB(): Promise<{
  needsSync: boolean
  syncStatus: LocalSyncStatus[]
}> {
  try {
    // Check if we have any data
    const pokemonCount = await db.pokemon.count()
    const masterDataCount = await db.master_data.count()

    const syncStatus = await db.sync_status.toArray()

    return {
      needsSync: pokemonCount === 0 || masterDataCount === 0,
      syncStatus,
    }
  } catch (error) {
    console.error("Error initializing offline DB:", error)
    return { needsSync: true, syncStatus: [] }
  }
}

/**
 * Store Pokemon data locally
 */
export async function storePokemonLocally(pokemon: LocalPokemon): Promise<void> {
  await db.pokemon.put(pokemon)
}

/**
 * Store multiple Pokemon locally (batch)
 */
export async function storePokemonBatchLocally(pokemon: LocalPokemon[]): Promise<void> {
  await db.pokemon.bulkPut(pokemon)
}

/**
 * Get Pokemon from local database
 */
export async function getPokemonLocally(pokemonId: number): Promise<LocalPokemon | undefined> {
  return await db.pokemon.get(pokemonId)
}

/**
 * Get Pokemon by name from local database
 */
export async function getPokemonByNameLocally(name: string): Promise<LocalPokemon | undefined> {
  return await db.pokemon.where("name").equals(name.toLowerCase()).first()
}

/**
 * Search Pokemon locally
 */
export async function searchPokemonLocally(query: string): Promise<LocalPokemon[]> {
  const lowerQuery = query.toLowerCase()
  return await db.pokemon
    .filter((p) => p.name.toLowerCase().includes(lowerQuery))
    .toArray()
}

/**
 * Store master data locally
 */
export async function storeMasterDataLocally(type: string, data: any): Promise<void> {
  await db.master_data.put({
    id: type,
    data,
    updated_at: new Date().toISOString(),
  })
}

/**
 * Get master data locally
 */
export async function getMasterDataLocally(type: string): Promise<any | undefined> {
  const record = await db.master_data.get(type)
  return record?.data
}

/**
 * Update sync status
 */
export async function updateSyncStatus(
  phase: string,
  totalItems: number,
  syncedItems: number
): Promise<void> {
  await db.sync_status.put({
    id: phase,
    phase,
    last_synced: new Date().toISOString(),
    total_items: totalItems,
    synced_items: syncedItems,
  })
}

/**
 * Get all Pokemon count
 */
export async function getLocalPokemonCount(): Promise<number> {
  return await db.pokemon.count()
}

/**
 * Clear all local data (for testing/reset)
 */
export async function clearLocalData(): Promise<void> {
  await db.pokemon.clear()
  await db.master_data.clear()
  await db.sync_status.clear()
}
