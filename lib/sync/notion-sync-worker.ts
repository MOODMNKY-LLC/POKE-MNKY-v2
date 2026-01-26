/**
 * Phase 4.2: Notion Sync Worker
 * 
 * Reads data from Notion and syncs to Supabase following deterministic algorithm:
 * 1. Upsert reference tables (Moves → Role Tags → Pokemon)
 * 2. Rebuild join tables deterministically
 * 3. Update notion_mappings table
 * 
 * Supports incremental sync using notion_mappings and last_updated timestamps
 */

import { createClient } from "@supabase/supabase-js"
import {
  createNotionClient,
  queryAllPages,
  extractPropertyValue,
  NotionPage,
} from "../notion/client"

interface SyncOptions {
  scope?: Array<"pokemon" | "role_tags" | "moves" | "coaches" | "teams">
  incremental?: boolean
  since?: Date
  dryRun?: boolean
}

interface SyncResult {
  success: boolean
  stats: {
    pokemon: { created: number; updated: number; failed: number }
    roleTags: { created: number; updated: number; failed: number }
    moves: { created: number; updated: number; failed: number }
    relations: { updated: number; failed: number }
  }
  errors: Array<{ entity: string; error: string }>
  duration: number
}

/**
 * Normalize Notion select value to enum
 */
function normalizeCategory(notionValue: string | null): string | null {
  if (!notionValue) return null
  const mapping: Record<string, string> = {
    "Hazard Setter": "hazard_setter",
    "Hazard Remover": "hazard_remover",
    "Cleric": "cleric",
    "Pivot": "pivot",
    "Phasing": "phasing",
    "Priority": "priority",
    "Recovery": "recovery",
    "Screens": "screens",
    "Status Utility": "status_utility",
    "Win Condition": "win_condition",
    "Anti-Setup": "anti_setup",
    "Disruption": "disruption",
    "Weather / Terrain": "weather_terrain",
    "Support (General)": "support_general",
    "Other": "other",
  }
  return mapping[notionValue] || null
}

function normalizeType(notionValue: string | null): string | null {
  if (!notionValue) return null
  return notionValue.toLowerCase()
}

function normalizeForm(notionValue: string | null): string {
  if (!notionValue || notionValue === "None") return "none"
  return notionValue.toLowerCase()
}

/**
 * Sync Moves from Notion to Supabase
 */
async function syncMoves(
  supabase: ReturnType<typeof createClient>,
  notionDatabaseId: string,
  dataSourceId: string,
  options: SyncOptions
): Promise<{ created: number; updated: number; failed: number; errors: any[] }> {
  const stats = { created: 0, updated: 0, failed: 0, errors: [] as any[] }

  const notionClient = createNotionClient()

  // Build filter for incremental sync
  let filter: any = undefined
  if (options.incremental && options.since) {
    filter = {
      timestamp: "last_edited_time",
      last_edited_time: {
        on_or_after: options.since.toISOString(),
      },
    }
  }

  // Query all moves from Notion
  const notionPages = await queryAllPages(notionClient, notionDatabaseId, {
    filter,
    maxPages: options.dryRun ? 10 : undefined,
  })

  console.log(`  Found ${notionPages.length} moves in Notion`)

  // Get existing notion_mappings for moves
  const { data: existingMappings } = await supabase
    .from("notion_mappings")
    .select("notion_page_id, entity_id")
    .eq("entity_type", "move")

  const pageIdToEntityId = new Map(
    existingMappings?.map((m) => [m.notion_page_id, m.entity_id]) || []
  )

  // Process each move page
  for (const page of notionPages) {
    try {
      const name = extractPropertyValue(page.properties["Move Name"], "title")
      if (!name) {
        stats.errors.push({ entity: `move:${page.id}`, error: "Missing name" })
        stats.failed++
        continue
      }

      const type = extractPropertyValue(page.properties["Type"], "select")
      const category = extractPropertyValue(page.properties["Category"], "select")
      const power = extractPropertyValue(page.properties["Power"], "number")
      const accuracy = extractPropertyValue(page.properties["Accuracy"], "number")
      const pp = extractPropertyValue(page.properties["PP"], "number")
      const priority = extractPropertyValue(page.properties["Priority"], "number")
      const tags = extractPropertyValue(page.properties["Tags"], "multi_select") || []

      // Normalize category
      const normalizedCategory = category
        ? category.toLowerCase()
        : null

      // Upsert to Supabase
      const existingEntityId = pageIdToEntityId.get(page.id)
      const moveData: any = {
        name,
        type: type ? type.toLowerCase() : null,
        category: normalizedCategory,
        power,
        accuracy,
        pp,
        priority,
        tags: tags.map((t: string) => t.toLowerCase()),
      }

      let entityId: string
      if (existingEntityId) {
        // Update existing
        const { error } = await supabase
          .from("moves")
          .update(moveData)
          .eq("id", existingEntityId)

        if (error) throw error
        entityId = existingEntityId
        stats.updated++
      } else {
        // Create new
        const { data, error } = await supabase
          .from("moves")
          .insert(moveData)
          .select("id")
          .single()

        if (error) throw error
        entityId = data.id
        stats.created++
      }

      // Update notion_mappings
      await supabase.from("notion_mappings").upsert(
        {
          notion_page_id: page.id,
          entity_type: "move",
          entity_id: entityId,
        },
        { onConflict: "notion_page_id" }
      )
    } catch (error: any) {
      stats.failed++
      stats.errors.push({
        entity: `move:${page.id}`,
        error: error.message,
      })
    }
  }

  return stats
}

/**
 * Sync Role Tags from Notion to Supabase
 */
async function syncRoleTags(
  supabase: ReturnType<typeof createClient>,
  notionDatabaseId: string,
  dataSourceId: string,
  options: SyncOptions
): Promise<{ created: number; updated: number; failed: number; errors: any[] }> {
  const stats = { created: 0, updated: 0, failed: 0, errors: [] as any[] }

  const notionClient = createNotionClient()

  let filter: any = undefined
  if (options.incremental && options.since) {
    filter = {
      timestamp: "last_edited_time",
      last_edited_time: {
        on_or_after: options.since.toISOString(),
      },
    }
  }

  const notionPages = await queryAllPages(notionClient, notionDatabaseId, {
    filter,
    maxPages: options.dryRun ? 10 : undefined,
  })

  console.log(`  Found ${notionPages.length} role tags in Notion`)

  const { data: existingMappings } = await supabase
    .from("notion_mappings")
    .select("notion_page_id, entity_id")
    .eq("entity_type", "role_tag")

  const pageIdToEntityId = new Map(
    existingMappings?.map((m) => [m.notion_page_id, m.entity_id]) || []
  )

  for (const page of notionPages) {
    try {
      const name = extractPropertyValue(page.properties["Role Tag"], "title")
      if (!name) {
        stats.errors.push({ entity: `role_tag:${page.id}`, error: "Missing name" })
        stats.failed++
        continue
      }

      // Extract mechanism from name format "Category: Mechanism"
      const mechanismMatch = name.match(/^[^:]+:\s*(.+)$/)
      const mechanism = mechanismMatch ? mechanismMatch[1] : null

      const category = extractPropertyValue(page.properties["Category"], "select")
      const notes = extractPropertyValue(page.properties["Notes"], "rich_text")

      const roleTagData: any = {
        name,
        category: category ? normalizeCategory(category) : null,
        mechanism,
        notes,
      }

      const existingEntityId = pageIdToEntityId.get(page.id)
      let entityId: string

      if (existingEntityId) {
        const { error } = await supabase
          .from("role_tags")
          .update(roleTagData)
          .eq("id", existingEntityId)

        if (error) throw error
        entityId = existingEntityId
        stats.updated++
      } else {
        const { data, error } = await supabase
          .from("role_tags")
          .insert(roleTagData)
          .select("id")
          .single()

        if (error) throw error
        entityId = data.id
        stats.created++
      }

      await supabase.from("notion_mappings").upsert(
        {
          notion_page_id: page.id,
          entity_type: "role_tag",
          entity_id: entityId,
        },
        { onConflict: "notion_page_id" }
      )
    } catch (error: any) {
      stats.failed++
      stats.errors.push({
        entity: `role_tag:${page.id}`,
        error: error.message,
      })
    }
  }

  return stats
}

/**
 * Sync Pokemon from Notion to Supabase
 */
async function syncPokemon(
  supabase: ReturnType<typeof createClient>,
  notionDatabaseId: string,
  dataSourceId: string,
  options: SyncOptions
): Promise<{ created: number; updated: number; failed: number; errors: any[] }> {
  const stats = { created: 0, updated: 0, failed: 0, errors: [] as any[] }

  const notionClient = createNotionClient()

  let filter: any = undefined
  if (options.incremental && options.since) {
    filter = {
      timestamp: "last_edited_time",
      last_edited_time: {
        on_or_after: options.since.toISOString(),
      },
    }
  }

  const notionPages = await queryAllPages(notionClient, notionDatabaseId, {
    filter,
    maxPages: options.dryRun ? 10 : undefined,
  })

  console.log(`  Found ${notionPages.length} pokemon in Notion`)

  const { data: existingMappings } = await supabase
    .from("notion_mappings")
    .select("notion_page_id, entity_id")
    .eq("entity_type", "pokemon")

  const pageIdToEntityId = new Map(
    existingMappings?.map((m) => [m.notion_page_id, m.entity_id]) || []
  )

  for (const page of notionPages) {
    try {
      const slug = extractPropertyValue(page.properties["Internal Slug"], "rich_text")
      if (!slug) {
        stats.errors.push({ entity: `pokemon:${page.id}`, error: "Missing slug" })
        stats.failed++
        continue
      }

      // Extract all properties
      const name = extractPropertyValue(page.properties["Name"], "title")
      const speciesName = extractPropertyValue(page.properties["Species Name"], "rich_text")
      const form = extractPropertyValue(page.properties["Form"], "select")
      const dexNumber = extractPropertyValue(page.properties["Pokedex #"], "number")
      const eligible = extractPropertyValue(page.properties["Eligible"], "checkbox")
      const type1 = extractPropertyValue(page.properties["Type 1"], "select")
      const type2Raw = extractPropertyValue(page.properties["Type 2"], "select")
      const type2 = type2Raw && type2Raw !== "(none)" ? type2Raw : null
      const draftPoints = extractPropertyValue(page.properties["Draft Points"], "number")
      const tier = extractPropertyValue(page.properties["Tier"], "select")
      const restrictionNotes = extractPropertyValue(
        page.properties["Ban / Restriction Notes"],
        "rich_text"
      )

      // Extract type effectiveness multipliers
      const typeMultipliers: Record<string, number> = {}
      const typeNames = [
        "normal",
        "fire",
        "water",
        "electric",
        "grass",
        "ice",
        "fighting",
        "poison",
        "ground",
        "flying",
        "psychic",
        "bug",
        "rock",
        "ghost",
        "dragon",
        "dark",
        "steel",
        "fairy",
      ]

      typeNames.forEach((type) => {
        const propName = `vs ${type.charAt(0).toUpperCase() + type.slice(1)}`
        const value = extractPropertyValue(page.properties[propName], "number")
        if (value !== null && value !== undefined) {
          typeMultipliers[`vs_${type}`] = Number(value)
        }
      })

      const pokemonData: any = {
        name: name || slug,
        species_name: speciesName,
        form: form ? normalizeForm(form) : "none",
        dex_number: dexNumber,
        slug,
        eligible: eligible || false,
        type1: type1 ? normalizeType(type1) : null,
        type2: type2 ? normalizeType(type2) : null,
        draft_points: draftPoints,
        tier,
        restriction_notes: restrictionNotes,
        hp: extractPropertyValue(page.properties["HP"], "number"),
        atk: extractPropertyValue(page.properties["Atk"], "number"),
        def: extractPropertyValue(page.properties["Def"], "number"),
        spa: extractPropertyValue(page.properties["SpA"], "number"),
        spd: extractPropertyValue(page.properties["SpD"], "number"),
        spe: extractPropertyValue(page.properties["Spe"], "number"),
        speed_0_ev: extractPropertyValue(page.properties["Speed @ 0 EV"], "number"),
        speed_252_ev: extractPropertyValue(page.properties["Speed @ 252 EV"], "number"),
        speed_252_plus: extractPropertyValue(page.properties["Speed @ 252+"], "number"),
        sprite_bw_url: extractPropertyValue(page.properties["BW Sprite URL"], "url"),
        sprite_serebii_url: extractPropertyValue(
          page.properties["Serebii Sprite URL"],
          "url"
        ),
        sprite_home_url: extractPropertyValue(page.properties["Home Sprite URL"], "url"),
        github_name: extractPropertyValue(page.properties["GitHub Name"], "rich_text"),
        smogon_name: extractPropertyValue(page.properties["Smogon Name"], "rich_text"),
        pokemondb_name: extractPropertyValue(page.properties["PokemonDB Name"], "rich_text"),
        smogon_url: extractPropertyValue(page.properties["Smogon URL"], "url"),
        pokemondb_url: extractPropertyValue(page.properties["PokemonDB URL"], "url"),
        ...typeMultipliers,
      }

      const existingEntityId = pageIdToEntityId.get(page.id)
      let entityId: string

      if (existingEntityId) {
        const { error } = await supabase
          .from("pokemon")
          .update(pokemonData)
          .eq("id", existingEntityId)

        if (error) throw error
        entityId = existingEntityId
        stats.updated++
      } else {
        // Try to find by slug first
        const { data: existing } = await supabase
          .from("pokemon")
          .select("id")
          .eq("slug", slug)
          .single()

        if (existing) {
          const { error } = await supabase
            .from("pokemon")
            .update(pokemonData)
            .eq("id", existing.id)

          if (error) throw error
          entityId = existing.id
          stats.updated++
        } else {
          const { data, error } = await supabase
            .from("pokemon")
            .insert(pokemonData)
            .select("id")
            .single()

          if (error) throw error
          entityId = data.id
          stats.created++
        }
      }

      await supabase.from("notion_mappings").upsert(
        {
          notion_page_id: page.id,
          entity_type: "pokemon",
          entity_id: entityId,
        },
        { onConflict: "notion_page_id" }
      )
    } catch (error: any) {
      stats.failed++
      stats.errors.push({
        entity: `pokemon:${page.id}`,
        error: error.message,
      })
    }
  }

  return stats
}

/**
 * Rebuild join tables deterministically
 */
async function rebuildJoinTables(
  supabase: ReturnType<typeof createClient>,
  options: SyncOptions
): Promise<{ updated: number; failed: number; errors: any[] }> {
  const stats = { updated: 0, failed: 0, errors: [] as any[] }

  const notionClient = createNotionClient()
  const NOTION_DATABASES = {
    pokemonCatalog: {
      databaseId: "6ecead11-a275-45e9-b2ed-10aa4ac76b5a",
    },
    roleTags: {
      databaseId: "a4d3b4c2-e885-4a35-b83c-49882726c03d",
    },
    moves: {
      databaseId: "fbfc9ef5-0114-4938-bd22-5ffe3328e9db",
    },
  }

  // Get all notion_mappings for resolution
  const { data: allMappings } = await supabase
    .from("notion_mappings")
    .select("notion_page_id, entity_type, entity_id")

  const pageToEntity = new Map<string, { type: string; id: string }>()
  const entityToPage = new Map<string, string>() // entity_id -> page_id

  allMappings?.forEach((m) => {
    pageToEntity.set(m.notion_page_id, { type: m.entity_type, id: m.entity_id })
    entityToPage.set(`${m.entity_type}:${m.entity_id}`, m.notion_page_id)
  })

  // 1. Rebuild pokemon_role_tags
  console.log("  Rebuilding pokemon_role_tags...")
  try {
    const pokemonPages = await queryAllPages(
      notionClient,
      NOTION_DATABASES.pokemonCatalog.databaseId,
      { maxPages: options.dryRun ? 10 : undefined }
    )

    for (const page of pokemonPages) {
      const pokemonEntity = pageToEntity.get(page.id)
      if (!pokemonEntity || pokemonEntity.type !== "pokemon") continue

      const roleTagPageIds = extractPropertyValue(
        page.properties["Role Tags"],
        "relation"
      ) as string[] | null

      if (!roleTagPageIds || roleTagPageIds.length === 0) {
        // Delete all relations for this pokemon
        await supabase
          .from("pokemon_role_tags")
          .delete()
          .eq("pokemon_id", pokemonEntity.id)
        continue
      }

      // Resolve role tag page IDs to entity IDs
      const roleTagEntityIds: string[] = []
      for (const pageId of roleTagPageIds) {
        const roleTagEntity = pageToEntity.get(pageId)
        if (roleTagEntity && roleTagEntity.type === "role_tag") {
          roleTagEntityIds.push(roleTagEntity.id)
        }
      }

      // Delete existing and insert new (deterministic rebuild)
      await supabase
        .from("pokemon_role_tags")
        .delete()
        .eq("pokemon_id", pokemonEntity.id)

      if (roleTagEntityIds.length > 0) {
        await supabase.from("pokemon_role_tags").insert(
          roleTagEntityIds.map((roleTagId) => ({
            pokemon_id: pokemonEntity.id,
            role_tag_id: roleTagId,
            source: "notion",
          }))
        )
      }

      stats.updated++
    }
  } catch (error: any) {
    stats.failed++
    stats.errors.push({ entity: "pokemon_role_tags", error: error.message })
  }

  // 2. Rebuild pokemon_moves_utility
  console.log("  Rebuilding pokemon_moves_utility...")
  try {
    const pokemonPages = await queryAllPages(
      notionClient,
      NOTION_DATABASES.pokemonCatalog.databaseId,
      { maxPages: options.dryRun ? 10 : undefined }
    )

    for (const page of pokemonPages) {
      const pokemonEntity = pageToEntity.get(page.id)
      if (!pokemonEntity || pokemonEntity.type !== "pokemon") continue

      const movePageIds = extractPropertyValue(
        page.properties["Signature Utility Moves"],
        "relation"
      ) as string[] | null

      if (!movePageIds || movePageIds.length === 0) {
        await supabase
          .from("pokemon_moves_utility")
          .delete()
          .eq("pokemon_id", pokemonEntity.id)
        continue
      }

      const moveEntityIds: string[] = []
      for (const pageId of movePageIds) {
        const moveEntity = pageToEntity.get(pageId)
        if (moveEntity && moveEntity.type === "move") {
          moveEntityIds.push(moveEntity.id)
        }
      }

      await supabase
        .from("pokemon_moves_utility")
        .delete()
        .eq("pokemon_id", pokemonEntity.id)

      if (moveEntityIds.length > 0) {
        await supabase.from("pokemon_moves_utility").insert(
          moveEntityIds.map((moveId) => ({
            pokemon_id: pokemonEntity.id,
            move_id: moveId,
          }))
        )
      }

      stats.updated++
    }
  } catch (error: any) {
    stats.failed++
    stats.errors.push({ entity: "pokemon_moves_utility", error: error.message })
  }

  // 3. Rebuild role_tag_moves
  console.log("  Rebuilding role_tag_moves...")
  try {
    const roleTagPages = await queryAllPages(
      notionClient,
      NOTION_DATABASES.roleTags.databaseId,
      { maxPages: options.dryRun ? 10 : undefined }
    )

    for (const page of roleTagPages) {
      const roleTagEntity = pageToEntity.get(page.id)
      if (!roleTagEntity || roleTagEntity.type !== "role_tag") continue

      const movePageIds = extractPropertyValue(
        page.properties["Move"],
        "relation"
      ) as string[] | null

      // Move relation is single, not array, so handle accordingly
      const movePageId = Array.isArray(movePageIds) && movePageIds.length > 0
        ? movePageIds[0]
        : movePageIds

      await supabase
        .from("role_tag_moves")
        .delete()
        .eq("role_tag_id", roleTagEntity.id)

      if (movePageId) {
        const moveEntity = pageToEntity.get(movePageId)
        if (moveEntity && moveEntity.type === "move") {
          await supabase.from("role_tag_moves").insert({
            role_tag_id: roleTagEntity.id,
            move_id: moveEntity.id,
          })
        }
      }

      stats.updated++
    }
  } catch (error: any) {
    stats.failed++
    stats.errors.push({ entity: "role_tag_moves", error: error.message })
  }

  return stats
}

/**
 * Main sync worker function
 */
export async function syncNotionToSupabase(
  supabaseUrl: string,
  serviceRoleKey: string,
  options: SyncOptions = {}
): Promise<SyncResult> {
  const startTime = Date.now()
  const result: SyncResult = {
    success: false,
    stats: {
      pokemon: { created: 0, updated: 0, failed: 0 },
      roleTags: { created: 0, updated: 0, failed: 0 },
      moves: { created: 0, updated: 0, failed: 0 },
      relations: { updated: 0, failed: 0 },
    },
    errors: [],
    duration: 0,
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const scope = options.scope || ["moves", "role_tags", "pokemon"]
  const NOTION_DATABASES = {
    moves: {
      databaseId: "fbfc9ef5-0114-4938-bd22-5ffe3328e9db",
      dataSourceId: "204f565c-d576-40da-96ae-b8916bad761e",
    },
    roleTags: {
      databaseId: "a4d3b4c2-e885-4a35-b83c-49882726c03d",
      dataSourceId: "6662c757-13f7-4919-a73f-313479711609",
    },
    pokemonCatalog: {
      databaseId: "6ecead11-a275-45e9-b2ed-10aa4ac76b5a",
      dataSourceId: "9f7b6b32-e56b-468a-8225-e06c5d0e1d87",
    },
  }

  try {
    // Step 1: Upsert reference tables in order
    if (scope.includes("moves")) {
      const movesStats = await syncMoves(
        supabase,
        NOTION_DATABASES.moves.databaseId,
        NOTION_DATABASES.moves.dataSourceId,
        options
      )
      result.stats.moves = movesStats
    }

    if (scope.includes("role_tags")) {
      const roleTagsStats = await syncRoleTags(
        supabase,
        NOTION_DATABASES.roleTags.databaseId,
        NOTION_DATABASES.roleTags.dataSourceId,
        options
      )
      result.stats.roleTags = roleTagsStats
    }

    if (scope.includes("pokemon")) {
      const pokemonStats = await syncPokemon(
        supabase,
        NOTION_DATABASES.pokemonCatalog.databaseId,
        NOTION_DATABASES.pokemonCatalog.dataSourceId,
        options
      )
      result.stats.pokemon = pokemonStats
    }

    // Step 2: Rebuild join tables
    const joinStats = await rebuildJoinTables(supabase, options)
    result.stats.relations = joinStats

    result.success = true
  } catch (error: any) {
    result.errors.push({ entity: "sync_worker", error: error.message })
    result.success = false
  } finally {
    result.duration = Date.now() - startTime
  }

  return result
}
