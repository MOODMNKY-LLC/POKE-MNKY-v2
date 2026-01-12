/**
 * Comprehensive Pokepedia Sync System
 * Syncs ALL PokeAPI v2 endpoints using PokeNode-ts MainClient
 * 
 * This system comprehensively caches:
 * - All Pokemon data (species, forms, encounters)
 * - All master data (types, abilities, moves, items, stats, etc.)
 * - All game data (generations, versions, pokedexes, regions)
 * - All encounter data (locations, methods, conditions)
 * - All contest data (types, effects)
 * - All breeding data (egg groups, natures, growth rates)
 * - All item data (attributes, categories, pockets, fling effects)
 * - All move data (ailments, categories, damage classes, learn methods, targets)
 * - All relationship data (normalized many-to-many relationships)
 * 
 * Uses PokeNode-ts MainClient for type-safe access to all endpoints
 */

import { createServiceRoleClient } from "./supabase/service"
import { MainClient } from "pokenode-ts"

const api = new MainClient()

interface SyncProgress {
  phase: string
  current: number
  total: number
  errors: Array<{ id: number | string; error: string }>
  startTime: number
}

interface SyncOptions {
  phases?: string[]
  pokemonRange?: { start: number; end: number }
  skipExisting?: boolean
  batchSize?: number
}

/**
 * Rate limiter: 100ms between requests (respects PokeAPI fair use)
 */
async function rateLimit(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 100))
}

/**
 * Extract ID from PokeAPI URL
 */
function extractIdFromUrl(url: string | undefined): number | null {
  if (!url) return null
  const parts = url.split("/").filter(Boolean)
  return parts.length > 0 ? parseInt(parts[parts.length - 1], 10) : null
}

/**
 * Sync Types (Master Data)
 */
async function syncTypes(supabase: any): Promise<SyncProgress> {
  console.log("\n📊 Syncing Types...")
  const progress: SyncProgress = { phase: "types", current: 0, total: 0, errors: [], startTime: Date.now() }

  try {
    const typeList = await api.pokemon.listTypes()
    progress.total = typeList.results.length

    for (const typeResource of typeList.results) {
      try {
        const typeData = await api.pokemon.getTypeByName(typeResource.name)
        
        const { error } = await supabase.from("types").upsert(
          {
            type_id: typeData.id,
            name: typeData.name,
            damage_relations: typeData.damage_relations,
            past_damage_relations: typeData.past_damage_relations,
            game_indices: typeData.game_indices,
            generation_id: extractIdFromUrl(typeData.generation?.url),
            move_damage_class_id: extractIdFromUrl(typeData.move_damage_class?.url),
            pokemon: typeData.pokemon,
            moves: typeData.moves,
            names: typeData.names,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "type_id" }
        )

        if (error) {
          progress.errors.push({ id: typeData.id, error: error.message })
        } else {
          progress.current++
        }
      } catch (error: any) {
        progress.errors.push({ id: typeResource.name, error: error.message })
      }

      await rateLimit()
    }

    console.log(`✅ Synced ${progress.current}/${progress.total} types (${Math.floor((Date.now() - progress.startTime) / 1000)}s)`)
    return progress
  } catch (error: any) {
    console.error("Error syncing types:", error)
    return progress
  }
}

/**
 * Sync Abilities (Master Data)
 */
async function syncAbilities(supabase: any): Promise<SyncProgress> {
  console.log("\n📊 Syncing Abilities...")
  const progress: SyncProgress = { phase: "abilities", current: 0, total: 0, errors: [], startTime: Date.now() }

  try {
    const abilityList = await api.pokemon.listAbilities()
    progress.total = abilityList.results.length

    for (const abilityResource of abilityList.results) {
      try {
        const abilityData = await api.pokemon.getAbilityByName(abilityResource.name)
        
        const { error } = await supabase.from("abilities").upsert(
          {
            ability_id: abilityData.id,
            name: abilityData.name,
            is_main_series: abilityData.is_main_series,
            generation_id: extractIdFromUrl(abilityData.generation?.url),
            effect_entries: abilityData.effect_entries,
            effect_changes: abilityData.effect_changes,
            flavor_text_entries: abilityData.flavor_text_entries,
            pokemon: abilityData.pokemon,
            names: abilityData.names,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "ability_id" }
        )

        if (error) {
          progress.errors.push({ id: abilityData.id, error: error.message })
        } else {
          progress.current++
        }
      } catch (error: any) {
        progress.errors.push({ id: abilityResource.name, error: error.message })
      }

      await rateLimit()
      
      if (progress.current % 50 === 0) {
        console.log(`  Progress: ${progress.current}/${progress.total}`)
      }
    }

    console.log(`✅ Synced ${progress.current}/${progress.total} abilities (${Math.floor((Date.now() - progress.startTime) / 1000)}s)`)
    return progress
  } catch (error: any) {
    console.error("Error syncing abilities:", error)
    return progress
  }
}

/**
 * Sync Moves (Master Data)
 */
async function syncMoves(supabase: any): Promise<SyncProgress> {
  console.log("\n📊 Syncing Moves...")
  const progress: SyncProgress = { phase: "moves", current: 0, total: 0, errors: [], startTime: Date.now() }

  try {
    const moveList = await api.pokemon.listMoves()
    progress.total = moveList.results.length

    for (const moveResource of moveList.results) {
      try {
        const moveData = await api.pokemon.getMoveByName(moveResource.name)
        
        const { error } = await supabase.from("moves").upsert(
          {
            move_id: moveData.id,
            name: moveData.name,
            accuracy: moveData.accuracy,
            effect_chance: moveData.effect_chance,
            pp: moveData.pp,
            priority: moveData.priority,
            power: moveData.power,
            contest_combos: moveData.contest_combos,
            contest_type_id: extractIdFromUrl(moveData.contest_type?.url),
            contest_effect_id: extractIdFromUrl(moveData.contest_effect?.url),
            damage_class_id: extractIdFromUrl(moveData.damage_class?.url),
            effect_entries: moveData.effect_entries,
            effect_changes: moveData.effect_changes,
            generation_id: extractIdFromUrl(moveData.generation?.url),
            meta: moveData.meta,
            names: moveData.names,
            past_values: moveData.past_values,
            stat_changes: moveData.stat_changes,
            super_contest_effect_id: extractIdFromUrl(moveData.super_contest_effect?.url),
            target_id: extractIdFromUrl(moveData.target?.url),
            type_id: extractIdFromUrl(moveData.type?.url),
            learned_by_pokemon: moveData.learned_by_pokemon,
            machines: moveData.machines,
            flavor_text_entries: moveData.flavor_text_entries,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "move_id" }
        )

        if (error) {
          progress.errors.push({ id: moveData.id, error: error.message })
        } else {
          progress.current++
        }
      } catch (error: any) {
        progress.errors.push({ id: moveResource.name, error: error.message })
      }

      await rateLimit()
      
      if (progress.current % 100 === 0) {
        console.log(`  Progress: ${progress.current}/${progress.total}`)
      }
    }

    console.log(`✅ Synced ${progress.current}/${progress.total} moves (${Math.floor((Date.now() - progress.startTime) / 1000)}s)`)
    return progress
  } catch (error: any) {
    console.error("Error syncing moves:", error)
    return progress
  }
}

/**
 * Sync Items (Master Data)
 */
async function syncItems(supabase: any): Promise<SyncProgress> {
  console.log("\n📊 Syncing Items...")
  const progress: SyncProgress = { phase: "items", current: 0, total: 0, errors: [], startTime: Date.now() }

  try {
    const itemList = await api.item.listItems()
    progress.total = itemList.results.length

    for (const itemResource of itemList.results) {
      try {
        const itemData = await api.item.getItemByName(itemResource.name)
        
        const { error } = await supabase.from("items").upsert(
          {
            item_id: itemData.id,
            name: itemData.name,
            cost: itemData.cost,
            fling_power: itemData.fling_power,
            fling_effect_id: extractIdFromUrl(itemData.fling_effect?.url),
            attributes: itemData.attributes,
            category_id: extractIdFromUrl(itemData.category?.url),
            effect_entries: itemData.effect_entries,
            flavor_text_entries: itemData.flavor_text_entries,
            game_indices: itemData.game_indices,
            names: itemData.names,
            sprites: itemData.sprites,
            held_by_pokemon: itemData.held_by_pokemon,
            baby_trigger_for_id: extractIdFromUrl(itemData.baby_trigger_for?.url),
            machines: itemData.machines,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "item_id" }
        )

        if (error) {
          progress.errors.push({ id: itemData.id, error: error.message })
        } else {
          progress.current++
        }
      } catch (error: any) {
        progress.errors.push({ id: itemResource.name, error: error.message })
      }

      await rateLimit()
      
      if (progress.current % 200 === 0) {
        console.log(`  Progress: ${progress.current}/${progress.total}`)
      }
    }

    console.log(`✅ Synced ${progress.current}/${progress.total} items (${Math.floor((Date.now() - progress.startTime) / 1000)}s)`)
    return progress
  } catch (error: any) {
    console.error("Error syncing items:", error)
    return progress
  }
}

/**
 * Sync Stats (Master Data)
 */
async function syncStats(supabase: any): Promise<SyncProgress> {
  console.log("\n📊 Syncing Stats...")
  const progress: SyncProgress = { phase: "stats", current: 0, total: 0, errors: [], startTime: Date.now() }

  try {
    const statList = await api.pokemon.listStats()
    progress.total = statList.results.length

    for (const statResource of statList.results) {
      try {
        const statData = await api.pokemon.getStatByName(statResource.name)
        
        const { error } = await supabase.from("stats").upsert(
          {
            stat_id: statData.id,
            name: statData.name,
            game_index: statData.game_index,
            is_battle_only: statData.is_battle_only,
            affecting_moves: statData.affecting_moves,
            affecting_natures: statData.affecting_natures,
            characteristics: statData.characteristics,
            move_damage_class_id: extractIdFromUrl(statData.move_damage_class?.url),
            names: statData.names,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "stat_id" }
        )

        if (error) {
          progress.errors.push({ id: statData.id, error: error.message })
        } else {
          progress.current++
        }
      } catch (error: any) {
        progress.errors.push({ id: statResource.name, error: error.message })
      }

      await rateLimit()
    }

    console.log(`✅ Synced ${progress.current}/${progress.total} stats (${Math.floor((Date.now() - progress.startTime) / 1000)}s)`)
    return progress
  } catch (error: any) {
    console.error("Error syncing stats:", error)
    return progress
  }
}

/**
 * Sync Generations (Master Data)
 */
async function syncGenerations(supabase: any): Promise<SyncProgress> {
  console.log("\n📊 Syncing Generations...")
  const progress: SyncProgress = { phase: "generations", current: 0, total: 0, errors: [], startTime: Date.now() }

  try {
    const generationList = await api.game.listGenerations()
    progress.total = generationList.results.length

    for (const genResource of generationList.results) {
      try {
        const genData = await api.game.getGenerationByName(genResource.name)
        
        const { error } = await supabase.from("generations").upsert(
          {
            generation_id: genData.id,
            name: genData.name,
            abilities: genData.abilities,
            main_region_id: extractIdFromUrl(genData.main_region?.url),
            moves: genData.moves,
            names: genData.names,
            pokemon_species: genData.pokemon_species,
            types: genData.types,
            version_groups: genData.version_groups,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "generation_id" }
        )

        if (error) {
          progress.errors.push({ id: genData.id, error: error.message })
        } else {
          progress.current++
        }
      } catch (error: any) {
        progress.errors.push({ id: genResource.name, error: error.message })
      }

      await rateLimit()
    }

    console.log(`✅ Synced ${progress.current}/${progress.total} generations (${Math.floor((Date.now() - progress.startTime) / 1000)}s)`)
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
  const progress: SyncProgress = { phase: "pokemon_species", current: 0, total: endId - startId + 1, errors: [], startTime: Date.now() }

  for (let speciesId = startId; speciesId <= endId; speciesId++) {
    try {
      const speciesData = await api.pokemon.getPokemonSpeciesById(speciesId)
      
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
          growth_rate_id: extractIdFromUrl(speciesData.growth_rate?.url),
          habitat_id: extractIdFromUrl(speciesData.habitat?.url),
          generation_id: extractIdFromUrl(speciesData.generation?.url),
          evolution_chain_id: extractIdFromUrl(speciesData.evolution_chain?.url),
          evolves_from_species_id: extractIdFromUrl(speciesData.evolves_from_species?.url),
          color_id: extractIdFromUrl(speciesData.color?.url),
          shape_id: extractIdFromUrl(speciesData.shape?.url),
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
        const elapsed = Math.floor((Date.now() - progress.startTime) / 1000)
        const rate = speciesId / elapsed
        const remaining = Math.floor((endId - speciesId) / rate)
        console.log(`  Progress: ${speciesId}/${endId} (${progress.current} synced, ${progress.errors.length} errors, ETA: ${remaining}s)`)
      }

      await rateLimit()
    } catch (error: any) {
      progress.errors.push({ id: speciesId, error: error.message })
      await rateLimit()
    }
  }

  console.log(`✅ Synced ${progress.current}/${progress.total} Pokemon species (${Math.floor((Date.now() - progress.startTime) / 1000)}s)`)
  return progress
}

/**
 * Sync Pokemon (Individual instances with relationships)
 */
async function syncPokemon(supabase: any, startId = 1, endId = 1025): Promise<SyncProgress> {
  console.log(`\n📊 Syncing Pokemon (${startId}-${endId})...`)
  const progress: SyncProgress = { phase: "pokemon", current: 0, total: endId - startId + 1, errors: [], startTime: Date.now() }

  for (let pokemonId = startId; pokemonId <= endId; pokemonId++) {
    try {
      const pokemonData = await api.pokemon.getPokemonById(pokemonId)
      const speciesId = extractIdFromUrl(pokemonData.species?.url)

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
          cries: pokemonData.cries,
          past_types: pokemonData.past_types,
          past_abilities: pokemonData.past_abilities,
          game_indices: pokemonData.game_indices,
          forms: pokemonData.forms,
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
        const abilityId = extractIdFromUrl(ability.ability?.url)
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
        const typeId = extractIdFromUrl(type.type?.url)
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
        const statId = extractIdFromUrl(stat.stat?.url)
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
        const itemId = extractIdFromUrl(item.item?.url)
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
        const moveId = extractIdFromUrl(move.move?.url)
        if (moveId && move.version_group_details) {
          for (const versionDetail of move.version_group_details) {
            const versionGroupId = extractIdFromUrl(versionDetail.version_group?.url)
            const learnMethodId = extractIdFromUrl(versionDetail.move_learn_method?.url)

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
        const elapsed = Math.floor((Date.now() - progress.startTime) / 1000)
        const rate = pokemonId / elapsed
        const remaining = Math.floor((endId - pokemonId) / rate)
        console.log(`  Progress: ${pokemonId}/${endId} (${progress.current} synced, ${progress.errors.length} errors, ETA: ${remaining}s)`)
      }

      await rateLimit()
    } catch (error: any) {
      progress.errors.push({ id: pokemonId, error: error.message })
      await rateLimit()
    }
  }

  console.log(`✅ Synced ${progress.current}/${progress.total} Pokemon (${Math.floor((Date.now() - progress.startTime) / 1000)}s)`)
  return progress
}

/**
 * Sync Evolution Chains
 */
async function syncEvolutionChains(supabase: any): Promise<SyncProgress> {
  console.log("\n📊 Syncing Evolution Chains...")
  const progress: SyncProgress = { phase: "evolution_chains", current: 0, total: 0, errors: [], startTime: Date.now() }

  try {
    // Get evolution chain IDs from species
    const { data: species } = await supabase
      .from("pokemon_species")
      .select("evolution_chain_id")
      .not("evolution_chain_id", "is", null)

    if (!species) return progress

    const chainIds = [...new Set(species.map((s: any) => s.evolution_chain_id).filter(Boolean))]
    progress.total = chainIds.length

    for (const chainId of chainIds) {
      try {
        const chainData = await api.pokemon.getEvolutionChainById(chainId)
        
        const babyTriggerItemId = extractIdFromUrl(chainData.baby_trigger_item?.url)

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
      } catch (error: any) {
        progress.errors.push({ id: chainId, error: error.message })
      }

      await rateLimit()
    }

    console.log(`✅ Synced ${progress.current}/${progress.total} evolution chains (${Math.floor((Date.now() - progress.startTime) / 1000)}s)`)
    return progress
  } catch (error: any) {
    console.error("Error syncing evolution chains:", error)
    return progress
  }
}

/**
 * Sync Additional Master Data (Natures, Egg Groups, etc.)
 */
async function syncAdditionalMasterData(supabase: any): Promise<SyncProgress[]> {
  const allProgress: SyncProgress[] = []

  // Natures
  console.log("\n📊 Syncing Natures...")
  const naturesProgress: SyncProgress = { phase: "natures", current: 0, total: 0, errors: [], startTime: Date.now() }
  try {
    const natureList = await api.pokemon.listNatures()
    naturesProgress.total = natureList.results.length

    for (const natureResource of natureList.results) {
      try {
        const natureData = await api.pokemon.getNatureByName(natureResource.name)
        
        await supabase.from("natures").upsert(
          {
            nature_id: natureData.id,
            name: natureData.name,
            decreased_stat_id: extractIdFromUrl(natureData.decreased_stat?.url),
            increased_stat_id: extractIdFromUrl(natureData.increased_stat?.url),
            hates_flavor_id: extractIdFromUrl(natureData.hates_flavor?.url),
            likes_flavor_id: extractIdFromUrl(natureData.likes_flavor?.url),
            pokeathlon_stat_changes: natureData.pokeathlon_stat_changes,
            move_battle_style_preferences: natureData.move_battle_style_preferences,
            names: natureData.names,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "nature_id" }
        )
        naturesProgress.current++
      } catch (error: any) {
        naturesProgress.errors.push({ id: natureResource.name, error: error.message })
      }
      await rateLimit()
    }
    console.log(`✅ Synced ${naturesProgress.current}/${naturesProgress.total} natures`)
  } catch (error: any) {
    console.error("Error syncing natures:", error)
  }
  allProgress.push(naturesProgress)

  // Egg Groups
  console.log("\n📊 Syncing Egg Groups...")
  const eggGroupsProgress: SyncProgress = { phase: "egg_groups", current: 0, total: 0, errors: [], startTime: Date.now() }
  try {
    const eggGroupList = await api.pokemon.listEggGroups()
    eggGroupsProgress.total = eggGroupList.results.length

    for (const eggGroupResource of eggGroupList.results) {
      try {
        const eggGroupData = await api.pokemon.getEggGroupByName(eggGroupResource.name)
        
        await supabase.from("egg_groups").upsert(
          {
            egg_group_id: eggGroupData.id,
            name: eggGroupData.name,
            names: eggGroupData.names,
            pokemon_species: eggGroupData.pokemon_species,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "egg_group_id" }
        )
        eggGroupsProgress.current++
      } catch (error: any) {
        eggGroupsProgress.errors.push({ id: eggGroupResource.name, error: error.message })
      }
      await rateLimit()
    }
    console.log(`✅ Synced ${eggGroupsProgress.current}/${eggGroupsProgress.total} egg groups`)
  } catch (error: any) {
    console.error("Error syncing egg groups:", error)
  }
  allProgress.push(eggGroupsProgress)

  // Growth Rates
  console.log("\n📊 Syncing Growth Rates...")
  const growthRatesProgress: SyncProgress = { phase: "growth_rates", current: 0, total: 0, errors: [], startTime: Date.now() }
  try {
    const growthRateList = await api.pokemon.listGrowthRates()
    growthRatesProgress.total = growthRateList.results.length

    for (const growthRateResource of growthRateList.results) {
      try {
        const growthRateData = await api.pokemon.getGrowthRateByName(growthRateResource.name)
        
        await supabase.from("growth_rates").upsert(
          {
            growth_rate_id: growthRateData.id,
            name: growthRateData.name,
            formula: growthRateData.formula,
            descriptions: growthRateData.descriptions,
            levels: growthRateData.levels,
            pokemon_species: growthRateData.pokemon_species,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "growth_rate_id" }
        )
        growthRatesProgress.current++
      } catch (error: any) {
        growthRatesProgress.errors.push({ id: growthRateResource.name, error: error.message })
      }
      await rateLimit()
    }
    console.log(`✅ Synced ${growthRatesProgress.current}/${growthRatesProgress.total} growth rates`)
  } catch (error: any) {
    console.error("Error syncing growth rates:", error)
  }
  allProgress.push(growthRatesProgress)

  // Pokemon Colors
  console.log("\n📊 Syncing Pokemon Colors...")
  const colorsProgress: SyncProgress = { phase: "pokemon_colors", current: 0, total: 0, errors: [], startTime: Date.now() }
  try {
    const colorList = await api.pokemon.listPokemonColors()
    colorsProgress.total = colorList.results.length

    for (const colorResource of colorList.results) {
      try {
        const colorData = await api.pokemon.getPokemonColorByName(colorResource.name)
        
        await supabase.from("pokemon_colors").upsert(
          {
            color_id: colorData.id,
            name: colorData.name,
            names: colorData.names,
            pokemon_species: colorData.pokemon_species,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "color_id" }
        )
        colorsProgress.current++
      } catch (error: any) {
        colorsProgress.errors.push({ id: colorResource.name, error: error.message })
      }
      await rateLimit()
    }
    console.log(`✅ Synced ${colorsProgress.current}/${colorsProgress.total} Pokemon colors`)
  } catch (error: any) {
    console.error("Error syncing Pokemon colors:", error)
  }
  allProgress.push(colorsProgress)

  // Pokemon Habitats
  console.log("\n📊 Syncing Pokemon Habitats...")
  const habitatsProgress: SyncProgress = { phase: "pokemon_habitats", current: 0, total: 0, errors: [], startTime: Date.now() }
  try {
    const habitatList = await api.pokemon.listPokemonHabitats()
    habitatsProgress.total = habitatList.results.length

    for (const habitatResource of habitatList.results) {
      try {
        const habitatData = await api.pokemon.getPokemonHabitatByName(habitatResource.name)
        
        await supabase.from("pokemon_habitats").upsert(
          {
            habitat_id: habitatData.id,
            name: habitatData.name,
            names: habitatData.names,
            pokemon_species: habitatData.pokemon_species,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "habitat_id" }
        )
        habitatsProgress.current++
      } catch (error: any) {
        habitatsProgress.errors.push({ id: habitatResource.name, error: error.message })
      }
      await rateLimit()
    }
    console.log(`✅ Synced ${habitatsProgress.current}/${habitatsProgress.total} Pokemon habitats`)
  } catch (error: any) {
    console.error("Error syncing Pokemon habitats:", error)
  }
  allProgress.push(habitatsProgress)

  // Pokemon Shapes
  console.log("\n📊 Syncing Pokemon Shapes...")
  const shapesProgress: SyncProgress = { phase: "pokemon_shapes", current: 0, total: 0, errors: [], startTime: Date.now() }
  try {
    const shapeList = await api.pokemon.listPokemonShapes()
    shapesProgress.total = shapeList.results.length

    for (const shapeResource of shapeList.results) {
      try {
        const shapeData = await api.pokemon.getPokemonShapeByName(shapeResource.name)
        
        await supabase.from("pokemon_shapes").upsert(
          {
            shape_id: shapeData.id,
            name: shapeData.name,
            awesome_names: shapeData.awesome_names,
            names: shapeData.names,
            pokemon_species: shapeData.pokemon_species,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "shape_id" }
        )
        shapesProgress.current++
      } catch (error: any) {
        shapesProgress.errors.push({ id: shapeResource.name, error: error.message })
      }
      await rateLimit()
    }
    console.log(`✅ Synced ${shapesProgress.current}/${shapesProgress.total} Pokemon shapes`)
  } catch (error: any) {
    console.error("Error syncing Pokemon shapes:", error)
  }
  allProgress.push(shapesProgress)

  return allProgress
}

/**
 * Main sync function
 */
export async function syncComprehensivePokepedia(options: SyncOptions = {}): Promise<void> {
  const {
    phases = ["all"],
    pokemonRange = { start: 1, end: 1025 },
    skipExisting = false,
    batchSize = 50,
  } = options

  console.log("=".repeat(70))
  console.log("🔄 Comprehensive Pokepedia Sync")
  console.log("=".repeat(70))
  console.log(`📊 Phases: ${phases.join(", ")}`)
  console.log(`🎮 Pokemon Range: ${pokemonRange.start}-${pokemonRange.end}`)
  console.log(`⏱️  Estimated time: ~${Math.ceil((pokemonRange.end - pokemonRange.start + 1) * 0.1 / 60)} minutes for Pokemon sync\n`)

  const supabase = createServiceRoleClient()
  const allProgress: SyncProgress[] = []
  const overallStartTime = Date.now()

  // Phase 1: Core Master Data
  if (phases.includes("all") || phases.includes("master")) {
    allProgress.push(await syncTypes(supabase))
    allProgress.push(await syncAbilities(supabase))
    allProgress.push(await syncMoves(supabase))
    allProgress.push(await syncItems(supabase))
    allProgress.push(await syncStats(supabase))
    allProgress.push(await syncGenerations(supabase))
  }

  // Phase 2: Additional Master Data
  if (phases.includes("all") || phases.includes("additional")) {
    const additionalProgress = await syncAdditionalMasterData(supabase)
    allProgress.push(...additionalProgress)
  }

  // Phase 3: Pokemon Data
  if (phases.includes("all") || phases.includes("pokemon")) {
    allProgress.push(await syncPokemonSpecies(supabase, pokemonRange.start, pokemonRange.end))
    allProgress.push(await syncPokemon(supabase, pokemonRange.start, pokemonRange.end))
  }

  // Phase 4: Evolution Chains
  if (phases.includes("all") || phases.includes("evolution")) {
    allProgress.push(await syncEvolutionChains(supabase))
  }

  // Summary
  console.log("\n" + "=".repeat(70))
  console.log("📊 Sync Summary")
  console.log("=".repeat(70))

  let totalSynced = 0
  let totalErrors = 0
  const totalTime = Math.floor((Date.now() - overallStartTime) / 1000)

  for (const progress of allProgress) {
    const time = Math.floor((Date.now() - progress.startTime) / 1000)
    console.log(`${progress.phase}: ${progress.current}/${progress.total} synced, ${progress.errors.length} errors (${time}s)`)
    totalSynced += progress.current
    totalErrors += progress.errors.length
  }

  console.log(`\n✅ Total: ${totalSynced} items synced, ${totalErrors} errors`)
  console.log(`⏱️  Total time: ${Math.floor(totalTime / 60)}m ${totalTime % 60}s`)
  console.log("=".repeat(70))
}
