/**
 * Resolve display data (pokemon_id, types, generation) for draft board rows.
 * Uses pokemon_cache first, then PokeAPI (pokenode-ts), and caches results so the board
 * always shows sprites, types, and generation even when draft_pool.pokemon_id is null.
 */

import { PokemonClient } from "pokenode-ts"
import type { SupabaseClient } from "@supabase/supabase-js"

const BATCH_SIZE = 12
const BATCH_DELAY_MS = 180

function getGenerationFromId(pokemonId: number): number {
  if (pokemonId <= 151) return 1
  if (pokemonId <= 251) return 2
  if (pokemonId <= 386) return 3
  if (pokemonId <= 493) return 4
  if (pokemonId <= 649) return 5
  if (pokemonId <= 721) return 6
  if (pokemonId <= 809) return 7
  if (pokemonId <= 905) return 8
  return 9
}

function nameToSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[.'']/g, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

export interface DraftRowDisplayInput {
  pokemon_name: string
  pokemon_id?: number | null
}

export interface DraftRowDisplayData {
  pokemon_id: number | null
  types: string[]
  generation: number | null
}

/**
 * Resolve display data for draft board rows: cache first, then PokeAPI; cache writes on miss.
 */
export async function resolveDraftBoardDisplay(
  supabase: SupabaseClient,
  rows: DraftRowDisplayInput[]
): Promise<Map<string, DraftRowDisplayData>> {
  const result = new Map<string, DraftRowDisplayData>()
  if (rows.length === 0) return result

  const byId = new Map<number, DraftRowDisplayData>()
  const byName = new Map<string, DraftRowDisplayData>()
  const ids = rows.map((r) => r.pokemon_id).filter((id): id is number => id != null)
  const uniqueIds = [...new Set(ids)]
  const names = rows.map((r) => r.pokemon_name?.trim()).filter(Boolean) as string[]
  const uniqueNames = [...new Set(names)]

  // 1) Load from pokemon_cache by id
  if (uniqueIds.length > 0) {
    const { data: byIdData } = await supabase
      .from("pokemon_cache")
      .select("pokemon_id, name, generation, types")
      .in("pokemon_id", uniqueIds)
    byIdData?.forEach((row: any) => {
      if (row.pokemon_id != null) {
        byId.set(row.pokemon_id, {
          pokemon_id: row.pokemon_id,
          generation: row.generation ?? getGenerationFromId(row.pokemon_id),
          types: Array.isArray(row.types) ? row.types : [],
        })
        if (row.name) byName.set(row.name.toLowerCase(), byId.get(row.pokemon_id)!)
      }
    })
  }

  // 2) Load from pokemon_cache by name (for rows with null pokemon_id)
  if (uniqueNames.length > 0) {
    const { data: byNameData } = await supabase
      .from("pokemon_cache")
      .select("pokemon_id, name, generation, types")
      .in("name", uniqueNames)
    byNameData?.forEach((row: any) => {
      const key = row.name?.toLowerCase()
      if (key && !byName.has(key)) {
        const data: DraftRowDisplayData = {
          pokemon_id: row.pokemon_id ?? null,
          generation: row.generation ?? (row.pokemon_id ? getGenerationFromId(row.pokemon_id) : null),
          types: Array.isArray(row.types) ? row.types : [],
        }
        byName.set(key, data)
      }
    })
  }

  // Build result keyed by pokemon_name (lowercase)
  for (const row of rows) {
    const nameKey = row.pokemon_name?.trim().toLowerCase()
    if (!nameKey) continue
    const fromId = row.pokemon_id != null ? byId.get(row.pokemon_id) : null
    const fromName = byName.get(nameKey)
    const data = fromId ?? fromName ?? null
    if (data) {
      result.set(nameKey, data)
    }
  }

  // 3) Fetch missing from PokeAPI in parallel batches; cache results
  const missing = rows.filter((row) => {
    const nameKey = row.pokemon_name?.trim().toLowerCase()
    if (!nameKey) return false
    const existing = result.get(nameKey)
    return !existing || (existing.types.length === 0 && existing.pokemon_id == null)
  })
  if (missing.length === 0) return result

  const poke = new PokemonClient()

  const fetchOne = async (row: DraftRowDisplayInput): Promise<{ nameKey: string; display: DraftRowDisplayData; pokemon: any } | null> => {
    const nameKey = row.pokemon_name?.trim().toLowerCase()
    if (!nameKey || result.get(nameKey)?.types?.length) return null
    try {
      const slug = nameToSlug(row.pokemon_name)
      const id = row.pokemon_id ?? null
      const pokemon = id != null
        ? await poke.getPokemonById(id)
        : await poke.getPokemonByName(slug || nameKey)
      const pokemonId = pokemon.id
      const types = pokemon.types?.map((t: any) => t.type?.name).filter(Boolean) || []
      const generation = getGenerationFromId(pokemonId)
      const display: DraftRowDisplayData = { pokemon_id: pokemonId, types, generation }
      return { nameKey, display, pokemon }
    } catch {
      return null
    }
  }

  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    const batch = missing.slice(i, i + BATCH_SIZE)
    const resolved = await Promise.all(batch.map((row) => fetchOne(row)))
    for (const item of resolved) {
      if (!item) continue
      const { nameKey, display, pokemon } = item
      result.set(nameKey, display)
      byId.set(display.pokemon_id!, display)
      byName.set(nameKey, display)
      const base_stats = (pokemon as any).stats
        ? {
            hp: (pokemon as any).stats.find((s: any) => s.stat?.name === "hp")?.base_stat ?? 0,
            attack: (pokemon as any).stats.find((s: any) => s.stat?.name === "attack")?.base_stat ?? 0,
            defense: (pokemon as any).stats.find((s: any) => s.stat?.name === "defense")?.base_stat ?? 0,
            "special-attack": (pokemon as any).stats.find((s: any) => s.stat?.name === "special-attack")?.base_stat ?? 0,
            "special-defense": (pokemon as any).stats.find((s: any) => s.stat?.name === "special-defense")?.base_stat ?? 0,
            speed: (pokemon as any).stats.find((s: any) => s.stat?.name === "speed")?.base_stat ?? 0,
          }
        : { hp: 0, attack: 0, defense: 0, "special-attack": 0, "special-defense": 0, speed: 0 }
      await supabase.from("pokemon_cache").upsert(
        {
          pokemon_id: (pokemon as any).id,
          name: (pokemon as any).name,
          types: display.types,
          generation: display.generation,
          base_stats,
          abilities: ((pokemon as any).abilities ?? []).map((a: any) => a.ability?.name).filter(Boolean),
          moves: ((pokemon as any).moves ?? []).slice(0, 50).map((m: any) => m.move?.name).filter(Boolean),
          payload: pokemon as any,
        },
        { onConflict: "pokemon_id" }
      )
    }
    if (i + BATCH_SIZE < missing.length) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS))
    }
  }

  return result
}
