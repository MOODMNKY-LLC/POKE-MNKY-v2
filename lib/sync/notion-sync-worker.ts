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
  scope?: Array<"pokemon" | "role_tags" | "moves" | "coaches" | "teams" | "draft_board">
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
    draft_board?: { synced: number; skipped: number; failed: number }
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

/** Draft pool status enum values in Supabase */
type DraftPoolStatus = "available" | "drafted" | "banned" | "unavailable"

/**
 * Map Notion Status select to draft_pool.status
 */
function normalizeDraftBoardStatus(notionStatus: string | null): DraftPoolStatus {
  if (!notionStatus) return "available"
  const mapping: Record<string, DraftPoolStatus> = {
    Available: "available",
    Banned: "banned",
    Unavailable: "unavailable",
    Drafted: "drafted",
  }
  return mapping[notionStatus] ?? "available"
}

/**
 * Sync Draft Board from Notion to Supabase draft_pool
 * Notion wins for point_value, tera_captain_eligible, status (when not drafted), generation, pokemon_id.
 * Supabase wins for status=drafted, drafted_by_team_id, drafted_at.
 */
async function syncDraftBoard(
  supabase: ReturnType<typeof createClient>,
  notionDatabaseId: string,
  options: SyncOptions
): Promise<{ synced: number; skipped: number; failed: number; errors: any[] }> {
  const stats = { synced: 0, skipped: 0, failed: 0, errors: [] as any[] }
  const notionClient = createNotionClient()

  // Resolve current season (default target for draft board)
  const { data: currentSeason, error: seasonError } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_current", true)
    .limit(1)
    .single()

  if (seasonError || !currentSeason?.id) {
    stats.errors.push({
      entity: "draft_board",
      error: "No current season (is_current = true) found. Create or set a current season.",
    })
    return stats
  }

  const seasonId = currentSeason.id

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
    maxPages: options.dryRun ? 20 : undefined,
  })

  console.log(`  Found ${notionPages.length} draft board entries in Notion`)

  // Existing draft_pool rows for this season (to preserve drafted state)
  const { data: existingRows, error: existingError } = await supabase
    .from("draft_pool")
    .select("id, pokemon_name, point_value, status, drafted_by_team_id, drafted_at")
    .eq("season_id", seasonId)

  if (existingError) {
    console.error("[syncDraftBoard] Error fetching existing draft_pool rows:", existingError)
    stats.errors.push({ entity: "draft_board", error: `Failed to fetch existing rows: ${existingError.message}` })
    return stats
  }

  const existingByKey = new Map<string, (typeof existingRows)[0]>()
  existingRows?.forEach((row) => {
    existingByKey.set(`${row.pokemon_name}:${row.point_value}`, row)
  })

  // Resolve pokemon_id from pokemon_cache by name (only for names we need)
  const names = [...new Set(notionPages.map((p) => extractPropertyValue(p.properties["Name"], "title")?.toString().toLowerCase().trim()).filter(Boolean))]
  const nameMap = new Map<string, number>()
  if (names.length > 0) {
    const { data: pokemonCache } = await supabase
      .from("pokemon_cache")
      .select("pokemon_id, name")
      .in("name", names)
    pokemonCache?.forEach((pc) => {
      const n = (pc.name || "").toLowerCase().trim()
      nameMap.set(n, pc.pokemon_id)
    })
  }

  const toUpsert: Array<{
    season_id: string
    pokemon_name: string
    point_value: number
    status: DraftPoolStatus
    tera_captain_eligible: boolean
    pokemon_id: number | null
    generation: number | null
    banned_reason: string | null
    drafted_by_team_id?: string | null
    drafted_at?: string | null
  }> = []

  for (const page of notionPages) {
    try {
      const addedToDraftBoard = extractPropertyValue(page.properties["Added to Draft Board"], "checkbox")
      if (addedToDraftBoard !== true) {
        continue
      }

      const name = extractPropertyValue(page.properties["Name"], "title")
      if (!name || typeof name !== "string") {
        stats.errors.push({ entity: `draft_board:${page.id}`, error: "Missing Name" })
        stats.failed++
        continue
      }

      const pointValue = extractPropertyValue(page.properties["Point Value"], "number")
      if (pointValue == null || pointValue < 1 || pointValue > 20) {
        stats.errors.push({ entity: `draft_board:${page.id}`, error: "Invalid Point Value (1-20)" })
        stats.failed++
        continue
      }

      const notionStatus = extractPropertyValue(page.properties["Status"], "select")
      const status = normalizeDraftBoardStatus(notionStatus)
      const teraCaptainEligible = extractPropertyValue(page.properties["Tera Captain Eligible"], "checkbox") ?? true
      const pokemonIdNotion = extractPropertyValue(page.properties["Pokemon ID (PokeAPI)"], "number")
      const generation = extractPropertyValue(page.properties["Generation"], "number") ?? null
      const notesProp = page.properties["Notes / Banned Reason"] ?? page.properties["Notes"]
      const bannedReason = notesProp ? extractPropertyValue(notesProp, "rich_text") : null

      const key = `${name.trim()}:${pointValue}`
      const existing = existingByKey.get(key)

      // Resolve pokemon_id: prefer Notion "Pokemon ID (PokeAPI)", else pokemon_cache by name
      let pokemonId: number | null = typeof pokemonIdNotion === "number" ? pokemonIdNotion : null
      if (pokemonId == null) {
        const normalizedName = name.toLowerCase().trim()
        pokemonId = nameMap.get(normalizedName) ?? null
      }

      let finalStatus: DraftPoolStatus = status
      let draftedByTeamId: string | null = null
      let draftedAt: string | null = null

      if (existing?.status === "drafted") {
        // Supabase wins: preserve draft state
        finalStatus = "drafted"
        draftedByTeamId = existing.drafted_by_team_id ?? null
        draftedAt = existing.drafted_at ?? null
        stats.skipped++
      }

      toUpsert.push({
        season_id: seasonId,
        pokemon_name: name.trim(),
        point_value: pointValue,
        status: finalStatus,
        tera_captain_eligible: teraCaptainEligible,
        pokemon_id: pokemonId,
        generation: generation != null ? Number(generation) : null,
        banned_reason: bannedReason?.toString().trim() || null,
        ...(draftedByTeamId != null && { drafted_by_team_id: draftedByTeamId }),
        ...(draftedAt != null && { drafted_at: draftedAt }),
      })
    } catch (error: any) {
      console.error(`[syncDraftBoard] Error processing page ${page.id}:`, error)
      stats.failed++
      stats.errors.push({ 
        entity: `draft_board:${page.id}`, 
        error: error.message,
        stack: error.stack 
      })
    }
  }

  if (options.dryRun) {
    stats.synced = toUpsert.length
    return stats
  }

  // Upsert in batches (Supabase unique on season_id, pokemon_name, point_value)
  const batchSize = 50
  for (let i = 0; i < toUpsert.length; i += batchSize) {
    const batch = toUpsert.slice(i, i + batchSize)
    const { error: upsertError } = await supabase
      .from("draft_pool")
      .upsert(batch, {
        onConflict: "season_id,pokemon_name,point_value",
        ignoreDuplicates: false,
      })

    if (upsertError) {
      stats.failed += batch.length
      stats.errors.push({ entity: "draft_board", error: upsertError.message })
    } else {
      stats.synced += batch.length
    }
  }

  // Store notion_mappings for draft_pool rows (for optional Supabase → Notion push)
  const { data: poolRows } = await supabase
    .from("draft_pool")
    .select("id, pokemon_name, point_value")
    .eq("season_id", seasonId)

  const keyToId = new Map<string, string>()
  poolRows?.forEach((row) => {
    keyToId.set(`${row.pokemon_name}:${row.point_value}`, row.id)
  })

  for (const page of notionPages) {
    const name = extractPropertyValue(page.properties["Name"], "title")?.toString().trim()
    const pointValue = extractPropertyValue(page.properties["Point Value"], "number")
    if (!name || pointValue == null) continue
    const key = `${name}:${pointValue}`
    const draftPoolId = keyToId.get(key)
    if (draftPoolId) {
      await supabase.from("notion_mappings").upsert(
        {
          notion_page_id: page.id,
          entity_type: "draft_pool",
          entity_id: draftPoolId,
        },
        { onConflict: "notion_page_id" }
      )
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
    draftBoard: {
      databaseId: "5e58ccd73ceb44ed83de826b51cf5c36",
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

    if (scope.includes("draft_board")) {
      const draftBoardStats = await syncDraftBoard(
        supabase,
        NOTION_DATABASES.draftBoard.databaseId,
        options
      )
      result.stats.draft_board = draftBoardStats
    }

    // Step 2: Rebuild join tables
    const joinStats = await rebuildJoinTables(supabase, options)
    result.stats.relations = joinStats

    result.success = true

    // Step 3: Broadcast Realtime update if draft_board was synced
    if (result.success && scope.includes("draft_board") && result.stats.draft_board) {
      try {
        // Get current season ID
        const { data: season } = await supabase
          .from("seasons")
          .select("id")
          .eq("is_current", true)
          .single()

        if (season) {
          // Broadcast to Realtime channel for draft board updates
          const channel = supabase.channel("draft-board-updates")
          await channel.send({
            type: "broadcast",
            event: "draft_board_synced",
            payload: {
              season_id: season.id,
              synced_count: result.stats.draft_board.synced || 0,
              failed_count: result.stats.draft_board.failed || 0,
              skipped_count: result.stats.draft_board.skipped || 0,
              timestamp: new Date().toISOString(),
              sync_duration_ms: result.duration,
            },
          })

          console.log("[Sync Worker] Realtime broadcast sent for draft board sync")
        }
      } catch (realtimeError: any) {
        // Don't fail sync if Realtime broadcast fails
        console.error("[Sync Worker] Realtime broadcast error:", realtimeError)
        result.errors.push({
          entity: "realtime_broadcast",
          error: realtimeError.message,
        })
      }
    }
  } catch (error: any) {
    result.errors.push({ entity: "sync_worker", error: error.message })
    result.success = false
  } finally {
    result.duration = Date.now() - startTime
  }

  return result
}
