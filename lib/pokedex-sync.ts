/**
 * Comprehensive Pokedex Sync System
 * Fetches ALL Pokemon data from PokeAPI and stores in normalized Supabase tables
 * 
 * This system caches:
 * - Pokemon (main data)
 * - Pokemon Species (evolution, breeding, etc.)
 * - Abilities (with effects)
 * - Moves (with power, accuracy, effects)
 * - Types (with damage relations)
 * - Items (held items)
 * - Stats (HP, Attack, etc.)
 * - Evolution Chains
 * - Forms (regional variants, mega evolutions)
 * - Relationships (Pokemon-Ability, Pokemon-Move, Pokemon-Type, etc.)
 */

import { createServiceRoleClient } from "./supabase/service"
import { PokemonClient } from "pokenode-ts"

const POKEAPI_BASE_URL = "https://pokeapi.co/api/v2"
const pokemonClient = new PokemonClient()

interface SyncProgress {
  phase: string
  current: number
  total: number
  errors: Array<{ id: number | string; error: string }>
}

/**
 * Fetch data from PokeAPI with retry logic
 */
async function fetchFromAPI<T>(url: string, retries = 3): Promise<T | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        if (response.status === 404) return null
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      return await response.json()
    } catch (error: any) {
      if (attempt === retries) {
        console.error(`Failed to fetch ${url} after ${retries} attempts:`, error.message)
        return null
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
    }
  }
  return null
}

/**
 * Sync Master Data: Types
 */
async function syncTypes(supabase: any): Promise<SyncProgress> {
  console.log("\n📊 Syncing Types...")
  const progress: SyncProgress = { phase: "types", current: 0, total: 0, errors: [] }

  try {
    // Fetch type list
    const typeList = await fetchFromAPI<{ results: Array<{ name: string; url: string }> }>(
      `${POKEAPI_BASE_URL}/type?limit=100`
    )
    if (!typeList) return progress

    progress.total = typeList.results.length

    for (const typeItem of typeList.results) {
      const typeData = await fetchFromAPI<any>(typeItem.url)
      if (!typeData) {
        progress.errors.push({ id: typeItem.name, error: "Failed to fetch" })
        continue
      }

      // Extract generation ID from URL
      const generationId = typeData.generation?.url
        ? parseInt(typeData.generation.url.split("/").slice(-2, -1)[0])
        : null

      const { error } = await supabase.from("types").upsert(
        {
          type_id: typeData.id,
          name: typeData.name,
          damage_relations: typeData.damage_relations,
          game_indices: typeData.game_indices,
          generation_id: generationId,
          move_damage_class_id: typeData.move_damage_class?.url
            ? parseInt(typeData.move_damage_class.url.split("/").slice(-2, -1)[0])
            : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "type_id" }
      )

      if (error) {
        progress.errors.push({ id: typeData.id, error: error.message })
      } else {
        progress.current++
      }

      await new Promise((resolve) => setTimeout(resolve, 100)) // Rate limit
    }

    console.log(`✅ Synced ${progress.current}/${progress.total} types`)
    return progress
  } catch (error: any) {
    console.error("Error syncing types:", error)
    return progress
  }
}

/**
 * Sync Master Data: Abilities
 */
async function syncAbilities(supabase: any): Promise<SyncProgress> {
  console.log("\n📊 Syncing Abilities...")
  const progress: SyncProgress = { phase: "abilities", current: 0, total: 0, errors: [] }

  try {
    const abilityList = await fetchFromAPI<{ results: Array<{ name: string; url: string }> }>(
      `${POKEAPI_BASE_URL}/ability?limit=1000`
    )
    if (!abilityList) return progress

    progress.total = abilityList.results.length

    for (const abilityItem of abilityList.results) {
      const abilityData = await fetchFromAPI<any>(abilityItem.url)
      if (!abilityData) {
        progress.errors.push({ id: abilityItem.name, error: "Failed to fetch" })
        continue
      }

      const generationId = abilityData.generation?.url
        ? parseInt(abilityData.generation.url.split("/").slice(-2, -1)[0])
        : null

      const { error } = await supabase.from("abilities").upsert(
        {
          ability_id: abilityData.id,
          name: abilityData.name,
          is_main_series: abilityData.is_main_series,
          effect_entries: abilityData.effect_entries,
          flavor_text_entries: abilityData.flavor_text_entries,
          generation_id: generationId,
          pokemon: abilityData.pokemon,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "ability_id" }
      )

      if (error) {
        progress.errors.push({ id: abilityData.id, error: error.message })
      } else {
        progress.current++
      }

      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    console.log(`✅ Synced ${progress.current}/${progress.total} abilities`)
    return progress
  } catch (error: any) {
    console.error("Error syncing abilities:", error)
    return progress
  }
}

/**
 * Sync Master Data: Moves
 */
async function syncMoves(supabase: any): Promise<SyncProgress> {
  console.log("\n📊 Syncing Moves...")
  const progress: SyncProgress = { phase: "moves", current: 0, total: 0, errors: [] }

  try {
    const moveList = await fetchFromAPI<{ results: Array<{ name: string; url: string }> }>(
      `${POKEAPI_BASE_URL}/move?limit=10000`
    )
    if (!moveList) return progress

    progress.total = moveList.results.length

    for (const moveItem of moveList.results) {
      const moveData = await fetchFromAPI<any>(moveItem.url)
      if (!moveData) {
        progress.errors.push({ id: moveItem.name, error: "Failed to fetch" })
        continue
      }

      const typeId = moveData.type?.url ? parseInt(moveData.type.url.split("/").slice(-2, -1)[0]) : null
      const generationId = moveData.generation?.url
        ? parseInt(moveData.generation.url.split("/").slice(-2, -1)[0])
        : null

      const { error } = await supabase.from("moves").upsert(
        {
          move_id: moveData.id,
          name: moveData.name,
          accuracy: moveData.accuracy,
          effect_chance: moveData.effect_chance,
          pp: moveData.pp,
          priority: moveData.priority,
          power: moveData.power,
          damage_class_id: moveData.damage_class?.url
            ? parseInt(moveData.damage_class.url.split("/").slice(-2, -1)[0])
            : null,
          type_id: typeId,
          target_id: moveData.target?.url ? parseInt(moveData.target.url.split("/").slice(-2, -1)[0]) : null,
          effect_entries: moveData.effect_entries,
          flavor_text_entries: moveData.flavor_text_entries,
          stat_changes: moveData.stat_changes,
          meta: moveData.meta,
          generation_id: generationId,
          learned_by_pokemon: moveData.learned_by_pokemon,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "move_id" }
      )

      if (error) {
        progress.errors.push({ id: moveData.id, error: error.message })
      } else {
        progress.current++
      }

      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    console.log(`✅ Synced ${progress.current}/${progress.total} moves`)
    return progress
  } catch (error: any) {
    console.error("Error syncing moves:", error)
    return progress
  }
}

/**
 * Sync Master Data: Items
 */
async function syncItems(supabase: any): Promise<SyncProgress> {
  console.log("\n📊 Syncing Items...")
  const progress: SyncProgress = { phase: "items", current: 0, total: 0, errors: [] }

  try {
    const itemList = await fetchFromAPI<{ results: Array<{ name: string; url: string }> }>(
      `${POKEAPI_BASE_URL}/item?limit=10000`
    )
    if (!itemList) return progress

    progress.total = itemList.results.length

    for (const itemItem of itemList.results) {
      const itemData = await fetchFromAPI<any>(itemItem.url)
      if (!itemData) {
        progress.errors.push({ id: itemItem.name, error: "Failed to fetch" })
        continue
      }

      const { error } = await supabase.from("items").upsert(
        {
          item_id: itemData.id,
          name: itemData.name,
          cost: itemData.cost,
          fling_power: itemData.fling_power,
          fling_effect_id: itemData.fling_effect?.url
            ? parseInt(itemData.fling_effect.url.split("/").slice(-2, -1)[0])
            : null,
          attributes: itemData.attributes,
          category_id: itemData.category?.url
            ? parseInt(itemData.category.url.split("/").slice(-2, -1)[0])
            : null,
          effect_entries: itemData.effect_entries,
          flavor_text_entries: itemData.flavor_text_entries,
          game_indices: itemData.game_indices,
          sprites: itemData.sprites,
          held_by_pokemon: itemData.held_by_pokemon,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "item_id" }
      )

      if (error) {
        progress.errors.push({ id: itemData.id, error: error.message })
      } else {
        progress.current++
      }

      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    console.log(`✅ Synced ${progress.current}/${progress.total} items`)
    return progress
  } catch (error: any) {
    console.error("Error syncing items:", error)
    return progress
  }
}

/**
 * Sync Master Data: Stats
 */
async function syncStats(supabase: any): Promise<SyncProgress> {
  console.log("\n📊 Syncing Stats...")
  const progress: SyncProgress = { phase: "stats", current: 0, total: 0, errors: [] }

  try {
    const statList = await fetchFromAPI<{ results: Array<{ name: string; url: string }> }>(
      `${POKEAPI_BASE_URL}/stat?limit=100`
    )
    if (!statList) return progress

    progress.total = statList.results.length

    for (const statItem of statList.results) {
      const statData = await fetchFromAPI<any>(statItem.url)
      if (!statData) {
        progress.errors.push({ id: statItem.name, error: "Failed to fetch" })
        continue
      }

      const { error } = await supabase.from("stats").upsert(
        {
          stat_id: statData.id,
          name: statData.name,
          is_battle_only: statData.is_battle_only,
          game_index: statData.game_index,
          move_damage_class_id: statData.move_damage_class?.url
            ? parseInt(statData.move_damage_class.url.split("/").slice(-2, -1)[0])
            : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "stat_id" }
      )

      if (error) {
        progress.errors.push({ id: statData.id, error: error.message })
      } else {
        progress.current++
      }

      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    console.log(`✅ Synced ${progress.current}/${progress.total} stats`)
    return progress
  } catch (error: any) {
    console.error("Error syncing stats:", error)
    return progress
  }
}

/**
 * Sync Master Data: Generations
 */
async function syncGenerations(supabase: any): Promise<SyncProgress> {
  console.log("\n📊 Syncing Generations...")
  const progress: SyncProgress = { phase: "generations", current: 0, total: 0, errors: [] }

  try {
    const generationList = await fetchFromAPI<{ results: Array<{ name: string; url: string }> }>(
      `${POKEAPI_BASE_URL}/generation?limit=100`
    )
    if (!generationList) return progress

    progress.total = generationList.results.length

    for (const genItem of generationList.results) {
      const genData = await fetchFromAPI<any>(genItem.url)
      if (!genData) {
        progress.errors.push({ id: genItem.name, error: "Failed to fetch" })
        continue
      }

      const { error } = await supabase.from("generations").upsert(
        {
          generation_id: genData.id,
          name: genData.name,
          abilities: genData.abilities,
          main_region_id: genData.main_region?.url
            ? parseInt(genData.main_region.url.split("/").slice(-2, -1)[0])
            : null,
          moves: genData.moves,
          pokemon_species: genData.pokemon_species,
          types: genData.types,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "generation_id" }
      )

      if (error) {
        progress.errors.push({ id: genData.id, error: error.message })
      } else {
        progress.current++
      }

      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    console.log(`✅ Synced ${progress.current}/${progress.total} generations`)
    return progress
  } catch (error: any) {
    console.error("Error syncing generations:", error)
    return progress
  }
}

/**
 * Sync Pokemon Species
 */
async function syncPokemonSpecies(supabase: any, startId = 1, endId = 1025): Promise<SyncProgress> {
  console.log(`\n📊 Syncing Pokemon Species (${startId}-${endId})...`)
  const progress: SyncProgress = { phase: "pokemon_species", current: 0, total: endId - startId + 1, errors: [] }

  for (let speciesId = startId; speciesId <= endId; speciesId++) {
    try {
      const speciesData = await fetchFromAPI<any>(`${POKEAPI_BASE_URL}/pokemon-species/${speciesId}`)
      if (!speciesData) {
        progress.errors.push({ id: speciesId, error: "Failed to fetch" })
        continue
      }

      const evolutionChainId = speciesData.evolution_chain?.url
        ? parseInt(speciesData.evolution_chain.url.split("/").slice(-2, -1)[0])
        : null
      const generationId = speciesData.generation?.url
        ? parseInt(speciesData.generation.url.split("/").slice(-2, -1)[0])
        : null

      const { error } = await supabase.from("pokemon_species").upsert(
        {
          species_id: speciesData.id,
          name: speciesData.name,
          order: speciesData.order,
          gender_rate: speciesData.gender_rate,
          capture_rate: speciesData.capture_rate,
          base_happiness: speciesData.base_happiness,
          is_baby: speciesData.is_baby,
          is_legendary: speciesData.is_legendary,
          is_mythical: speciesData.is_mythical,
          hatch_counter: speciesData.hatch_counter,
          has_gender_differences: speciesData.has_gender_differences,
          forms_switchable: speciesData.forms_switchable,
          growth_rate_id: speciesData.growth_rate?.url
            ? parseInt(speciesData.growth_rate.url.split("/").slice(-2, -1)[0])
            : null,
          habitat_id: speciesData.habitat?.url
            ? parseInt(speciesData.habitat.url.split("/").slice(-2, -1)[0])
            : null,
          generation_id: generationId,
          evolution_chain_id: evolutionChainId,
          color_id: speciesData.color?.url
            ? parseInt(speciesData.color.url.split("/").slice(-2, -1)[0])
            : null,
          shape_id: speciesData.shape?.url
            ? parseInt(speciesData.shape.url.split("/").slice(-2, -1)[0])
            : null,
          egg_groups: speciesData.egg_groups,
          flavor_text_entries: speciesData.flavor_text_entries,
          form_descriptions: speciesData.form_descriptions,
          genera: speciesData.genera,
          names: speciesData.names,
          pal_park_encounters: speciesData.pal_park_encounters,
          pokedex_numbers: speciesData.pokedex_numbers,
          varieties: speciesData.varieties,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "species_id" }
      )

      if (error) {
        progress.errors.push({ id: speciesId, error: error.message })
      } else {
        progress.current++
      }

      if (speciesId % 50 === 0) {
        console.log(`  Progress: ${speciesId}/${endId} (${progress.current} synced, ${progress.errors.length} errors)`)
      }

      await new Promise((resolve) => setTimeout(resolve, 100))
    } catch (error: any) {
      progress.errors.push({ id: speciesId, error: error.message })
    }
  }

  console.log(`✅ Synced ${progress.current}/${progress.total} Pokemon species`)
  return progress
}

/**
 * Sync Pokemon (individual instances)
 */
async function syncPokemon(supabase: any, startId = 1, endId = 1025): Promise<SyncProgress> {
  console.log(`\n📊 Syncing Pokemon (${startId}-${endId})...`)
  const progress: SyncProgress = { phase: "pokemon", current: 0, total: endId - startId + 1, errors: [] }

  for (let pokemonId = startId; pokemonId <= endId; pokemonId++) {
    try {
      const pokemonData = await fetchFromAPI<any>(`${POKEAPI_BASE_URL}/pokemon/${pokemonId}`)
      if (!pokemonData) {
        progress.errors.push({ id: pokemonId, error: "Failed to fetch" })
        continue
      }

      const speciesId = pokemonData.species?.url
        ? parseInt(pokemonData.species.url.split("/").slice(-2, -1)[0])
        : null

      // Insert Pokemon
      const { error: pokemonError } = await supabase.from("pokemon_comprehensive").upsert(
        {
          pokemon_id: pokemonData.id,
          name: pokemonData.name,
          base_experience: pokemonData.base_experience,
          height: pokemonData.height,
          weight: pokemonData.weight,
          order: pokemonData.order,
          is_default: pokemonData.is_default,
          location_area_encounters: pokemonData.location_area_encounters,
          sprites: pokemonData.sprites,
          species_id: speciesId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "pokemon_id" }
      )

      if (pokemonError) {
        progress.errors.push({ id: pokemonId, error: pokemonError.message })
        continue
      }

      // Insert Pokemon-Ability relationships
      for (const ability of pokemonData.abilities || []) {
        const abilityId = ability.ability?.url
          ? parseInt(ability.ability.url.split("/").slice(-2, -1)[0])
          : null
        if (abilityId) {
          await supabase.from("pokemon_abilities").upsert(
            {
              pokemon_id: pokemonData.id,
              ability_id: abilityId,
              is_hidden: ability.is_hidden,
              slot: ability.slot,
            },
            { onConflict: "pokemon_id,ability_id,slot" }
          )
        }
      }

      // Insert Pokemon-Type relationships
      for (const type of pokemonData.types || []) {
        const typeId = type.type?.url ? parseInt(type.type.url.split("/").slice(-2, -1)[0]) : null
        if (typeId) {
          await supabase.from("pokemon_types").upsert(
            {
              pokemon_id: pokemonData.id,
              type_id: typeId,
              slot: type.slot,
            },
            { onConflict: "pokemon_id,type_id,slot" }
          )
        }
      }

      // Insert Pokemon-Stat relationships
      for (const stat of pokemonData.stats || []) {
        const statId = stat.stat?.url ? parseInt(stat.stat.url.split("/").slice(-2, -1)[0]) : null
        if (statId) {
          await supabase.from("pokemon_stats_comprehensive").upsert(
            {
              pokemon_id: pokemonData.id,
              stat_id: statId,
              base_stat: stat.base_stat,
              effort: stat.effort,
            },
            { onConflict: "pokemon_id,stat_id" }
          )
        }
      }

      // Insert Pokemon-Item relationships (held items)
      for (const item of pokemonData.held_items || []) {
        const itemId = item.item?.url ? parseInt(item.item.url.split("/").slice(-2, -1)[0]) : null
        if (itemId) {
          await supabase.from("pokemon_items").upsert(
            {
              pokemon_id: pokemonData.id,
              item_id: itemId,
              version_details: item.version_details,
            },
            { onConflict: "pokemon_id,item_id" }
          )
        }
      }

      // Insert Pokemon-Move relationships
      for (const move of pokemonData.moves || []) {
        const moveId = move.move?.url ? parseInt(move.move.url.split("/").slice(-2, -1)[0]) : null
        if (moveId && move.version_group_details) {
          for (const versionDetail of move.version_group_details) {
            const versionGroupId = versionDetail.version_group?.url
              ? parseInt(versionDetail.version_group.url.split("/").slice(-2, -1)[0])
              : null
            const learnMethodId = versionDetail.move_learn_method?.url
              ? parseInt(versionDetail.move_learn_method.url.split("/").slice(-2, -1)[0])
              : null

            if (versionGroupId && learnMethodId) {
              await supabase.from("pokemon_moves").upsert(
                {
                  pokemon_id: pokemonData.id,
                  move_id: moveId,
                  version_group_id: versionGroupId,
                  move_learn_method_id: learnMethodId,
                  level_learned_at: versionDetail.level_learned_at,
                  order: versionDetail.order,
                },
                { onConflict: "pokemon_id,move_id,version_group_id,move_learn_method_id,level_learned_at" }
              )
            }
          }
        }
      }

      progress.current++

      if (pokemonId % 50 === 0) {
        console.log(`  Progress: ${pokemonId}/${endId} (${progress.current} synced, ${progress.errors.length} errors)`)
      }

      await new Promise((resolve) => setTimeout(resolve, 100))
    } catch (error: any) {
      progress.errors.push({ id: pokemonId, error: error.message })
    }
  }

  console.log(`✅ Synced ${progress.current}/${progress.total} Pokemon`)
  return progress
}

/**
 * Sync Evolution Chains
 */
async function syncEvolutionChains(supabase: any): Promise<SyncProgress> {
  console.log("\n📊 Syncing Evolution Chains...")
  const progress: SyncProgress = { phase: "evolution_chains", current: 0, total: 0, errors: [] }

  try {
    // Get evolution chain IDs from species
    const { data: species } = await supabase.from("pokemon_species").select("evolution_chain_id").not("evolution_chain_id", "is", null)

    if (!species) return progress

    const chainIds = [...new Set(species.map((s: any) => s.evolution_chain_id).filter(Boolean))]
    progress.total = chainIds.length

    for (const chainId of chainIds) {
      const chainData = await fetchFromAPI<any>(`${POKEAPI_BASE_URL}/evolution-chain/${chainId}`)
      if (!chainData) {
        progress.errors.push({ id: chainId, error: "Failed to fetch" })
        continue
      }

      const babyTriggerItemId = chainData.baby_trigger_item?.url
        ? parseInt(chainData.baby_trigger_item.url.split("/").slice(-2, -1)[0])
        : null

      const { error } = await supabase.from("evolution_chains").upsert(
        {
          evolution_chain_id: chainData.id,
          baby_trigger_item_id: babyTriggerItemId,
          chain_data: chainData.chain,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "evolution_chain_id" }
      )

      if (error) {
        progress.errors.push({ id: chainId, error: error.message })
      } else {
        progress.current++
      }

      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    console.log(`✅ Synced ${progress.current}/${progress.total} evolution chains`)
    return progress
  } catch (error: any) {
    console.error("Error syncing evolution chains:", error)
    return progress
  }
}

/**
 * Main sync function
 */
export async function syncComprehensivePokedex(options: {
  phases?: string[]
  pokemonRange?: { start: number; end: number }
} = {}): Promise<void> {
  const { phases = ["all"], pokemonRange = { start: 1, end: 1025 } } = options

  console.log("=".repeat(70))
  console.log("🔄 Comprehensive Pokedex Sync")
  console.log("=".repeat(70))

  const supabase = createServiceRoleClient()
  const allProgress: SyncProgress[] = []

  // Phase 1: Master Data
  if (phases.includes("all") || phases.includes("master")) {
    allProgress.push(await syncTypes(supabase))
    allProgress.push(await syncAbilities(supabase))
    allProgress.push(await syncMoves(supabase))
    allProgress.push(await syncItems(supabase))
    allProgress.push(await syncStats(supabase))
    allProgress.push(await syncGenerations(supabase))
  }

  // Phase 2: Pokemon Data
  if (phases.includes("all") || phases.includes("pokemon")) {
    allProgress.push(await syncPokemonSpecies(supabase, pokemonRange.start, pokemonRange.end))
    allProgress.push(await syncPokemon(supabase, pokemonRange.start, pokemonRange.end))
  }

  // Phase 3: Evolution Chains
  if (phases.includes("all") || phases.includes("evolution")) {
    allProgress.push(await syncEvolutionChains(supabase))
  }

  // Summary
  console.log("\n" + "=".repeat(70))
  console.log("📊 Sync Summary")
  console.log("=".repeat(70))

  let totalSynced = 0
  let totalErrors = 0

  for (const progress of allProgress) {
    console.log(`${progress.phase}: ${progress.current}/${progress.total} synced, ${progress.errors.length} errors`)
    totalSynced += progress.current
    totalErrors += progress.errors.length
  }

  console.log(`\n✅ Total: ${totalSynced} items synced, ${totalErrors} errors`)
  console.log("=".repeat(70))
}
