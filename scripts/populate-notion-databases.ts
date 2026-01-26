/**
 * Phase 3.2: Notion Data Population Script
 * 
 * Populates Average at Best Notion databases from Supabase:
 * - Moves
 * - Role Tags
 * - Pokemon Catalog
 * - Links relations (pokemon_role_tags, pokemon_moves_utility, role_tag_moves)
 * - Updates notion_mappings table for incremental sync support
 * 
 * Usage:
 *   pnpm tsx scripts/populate-notion-databases.ts [--dry-run] [--scope moves|role_tags|pokemon|all]
 * 
 * Environment:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - NOTION_API_KEY (via MCP)
 */

import * as dotenv from "dotenv"
import * as path from "path"
import { createClient } from "@supabase/supabase-js"
import {
  createNotionClient,
  createPages,
  updatePage,
  queryAllPages,
  buildNotionProperty,
  extractPropertyValue,
  NotionAPIError,
} from "../lib/notion/client"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

// Notion Database IDs from Phase 3 Implementation Report
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
} as const

type Scope = "moves" | "role_tags" | "pokemon" | "all"

interface ImportStats {
  created: number
  updated: number
  failed: number
  errors: Array<{ entity: string; error: string }>
}

/**
 * Normalize Pokemon type enum to Notion select option
 */
function normalizeType(type: string | null): string | null {
  if (!type) return null
  // Capitalize first letter
  return type.charAt(0).toUpperCase() + type.slice(1)
}

/**
 * Normalize form enum to Notion select option
 */
function normalizeForm(form: string | null): string {
  if (!form || form === "none") return "None"
  // Capitalize first letter
  return form.charAt(0).toUpperCase() + form.slice(1)
}

/**
 * Normalize category enum to Notion select option
 */
function normalizeCategory(category: string | null): string {
  if (!category) return "Other"
  // Map enum values to Notion select options
  const mapping: Record<string, string> = {
    hazard_setter: "Hazard Setter",
    hazard_remover: "Hazard Remover",
    cleric: "Cleric",
    pivot: "Pivot",
    phasing: "Phasing",
    priority: "Priority",
    recovery: "Recovery",
    screens: "Screens",
    status_utility: "Status Utility",
    win_condition: "Win Condition",
    anti_setup: "Anti-Setup",
    disruption: "Disruption",
    weather_terrain: "Weather / Terrain",
    support_general: "Support (General)",
  }
  return mapping[category] || "Other"
}

/**
 * Import Moves from Supabase to Notion
 */
async function importMoves(
  supabase: ReturnType<typeof createClient>,
  dryRun: boolean
): Promise<ImportStats> {
  const stats: ImportStats = { created: 0, updated: 0, failed: 0, errors: [] }

  console.log("📦 Fetching moves from Supabase...")
  const { data: moves, error } = await supabase
    .from("moves")
    .select("*")
    .order("name")

  if (error) {
    throw new Error(`Failed to fetch moves: ${error.message}`)
  }

  if (!moves || moves.length === 0) {
    console.log("⚠️  No moves found in Supabase")
    return stats
  }

  console.log(`✅ Found ${moves.length} moves`)

  // Initialize Notion client
  const notionClient = createNotionClient()

  // Check existing pages by querying database
  const existingPages = new Map<string, string>() // name -> page_id
  if (!dryRun) {
    try {
      const existing = await queryAllPages(
        notionClient,
        NOTION_DATABASES.moves.databaseId,
        { maxPages: 1000 }
      )
      existing.forEach((page) => {
        const name = extractPropertyValue(
          page.properties["Move Name"],
          "title"
        )
        if (name) {
          existingPages.set(name, page.id)
        }
      })
      console.log(`  Found ${existingPages.size} existing moves in Notion`)
    } catch (error: any) {
      console.warn(`  Warning: Could not query existing pages: ${error.message}`)
    }
  }

  // Batch create/update pages
  const batchSize = 10 // Smaller batches to avoid rate limits
  for (let i = 0; i < moves.length; i += batchSize) {
    const batch = moves.slice(i, i + batchSize)

    if (dryRun) {
      console.log(`[DRY RUN] Would create/update ${batch.length} moves`)
      stats.created += batch.length
      continue
    }

    try {
      const pageRequests = batch.map((move) => {
        const existingPageId = existingPages.get(move.name)

        const properties: Record<string, any> = {}
        if (!existingPageId) {
          // New page - include title
          properties["Move Name"] = buildNotionProperty("title", move.name)
        }
        if (move.type) {
          properties["Type"] = buildNotionProperty("select", normalizeType(move.type))
        }
        if (move.category) {
          properties["Category"] = buildNotionProperty(
            "select",
            move.category.charAt(0).toUpperCase() + move.category.slice(1)
          )
        }
        if (move.power !== null && move.power !== undefined) {
          properties["Power"] = buildNotionProperty("number", move.power)
        }
        if (move.accuracy !== null && move.accuracy !== undefined) {
          properties["Accuracy"] = buildNotionProperty("number", move.accuracy)
        }
        if (move.pp !== null && move.pp !== undefined) {
          properties["PP"] = buildNotionProperty("number", move.pp)
        }
        if (move.priority !== null && move.priority !== undefined) {
          properties["Priority"] = buildNotionProperty("number", move.priority)
        }
        if (move.tags && move.tags.length > 0) {
          properties["Tags"] = buildNotionProperty("multi_select", move.tags)
        }

        if (existingPageId) {
          // Update existing page
          return { pageId: existingPageId, properties }
        } else {
          // Create new page
          return {
            parent: { database_id: NOTION_DATABASES.moves.databaseId },
            properties,
          }
        }
      })

      // Create/update pages
      const createdPages: any[] = []
      for (const req of pageRequests) {
        if ("pageId" in req) {
          // Update existing
          const page = await updatePage(notionClient, req.pageId, {
            properties: req.properties,
          })
          createdPages.push(page)
          stats.updated++
        } else {
          // Create new
          const page = await createPage(notionClient, req as any)
          createdPages.push(page)
          stats.created++
        }
      }

      // Update notion_mappings for each page
      for (let j = 0; j < createdPages.length; j++) {
        const page = createdPages[j]
        const move = batch[j]

        await supabase.from("notion_mappings").upsert(
          {
            notion_page_id: page.id,
            entity_type: "move",
            entity_id: move.id,
          },
          { onConflict: "notion_page_id" }
        )
      }
    } catch (error: any) {
      console.error(`❌ Failed to import batch ${i / batchSize + 1}:`, error.message)
      stats.failed += batch.length
      batch.forEach((move) => {
        stats.errors.push({ entity: `move:${move.name}`, error: error.message })
      })
    }
  }

  return stats
}

/**
 * Import Role Tags from Supabase to Notion
 */
async function importRoleTags(
  supabase: ReturnType<typeof createClient>,
  dryRun: boolean
): Promise<ImportStats> {
  const stats: ImportStats = { created: 0, updated: 0, failed: 0, errors: [] }

  console.log("📦 Fetching role tags from Supabase...")
  const { data: roleTags, error } = await supabase
    .from("role_tags")
    .select("*")
    .order("name")

  if (error) {
    throw new Error(`Failed to fetch role tags: ${error.message}`)
  }

  if (!roleTags || roleTags.length === 0) {
    console.log("⚠️  No role tags found in Supabase")
    return stats
  }

  console.log(`✅ Found ${roleTags.length} role tags`)

  // Initialize Notion client
  const notionClient = createNotionClient()

  // Check existing pages
  const existingPages = new Map<string, string>() // name -> page_id
  if (!dryRun) {
    try {
      const existing = await queryAllPages(
        notionClient,
        NOTION_DATABASES.roleTags.databaseId,
        { maxPages: 1000 }
      )
      existing.forEach((page) => {
        const name = extractPropertyValue(
          page.properties["Role Tag"],
          "title"
        )
        if (name) {
          existingPages.set(name, page.id)
        }
      })
      console.log(`  Found ${existingPages.size} existing role tags in Notion`)
    } catch (error: any) {
      console.warn(`  Warning: Could not query existing pages: ${error.message}`)
    }
  }

  // Fetch related moves for role_tag_moves join (for later relation linking)
  const { data: roleTagMoves } = await supabase
    .from("role_tag_moves")
    .select("role_tag_id, move_id, moves(name)")

  const moveMap = new Map<string, string>() // role_tag_id -> move name
  roleTagMoves?.forEach((rtm: any) => {
    if (rtm.moves) {
      moveMap.set(rtm.role_tag_id, rtm.moves.name)
    }
  })

  // Batch create/update pages
  const batchSize = 10
  for (let i = 0; i < roleTags.length; i += batchSize) {
    const batch = roleTags.slice(i, i + batchSize)

    if (dryRun) {
      console.log(`[DRY RUN] Would create/update ${batch.length} role tags`)
      stats.created += batch.length
      continue
    }

    try {
      for (const roleTag of batch) {
        const existingPageId = existingPages.get(roleTag.name)

        const properties: Record<string, any> = {}
        if (!existingPageId) {
          properties["Role Tag"] = buildNotionProperty("title", roleTag.name)
        }
        if (roleTag.category) {
          properties["Category"] = buildNotionProperty(
            "select",
            normalizeCategory(roleTag.category)
          )
        }
        if (roleTag.notes) {
          properties["Notes"] = buildNotionProperty("rich_text", roleTag.notes)
        }
        // Move relation will be set in linkRelations() after all entities exist

        let page
        if (existingPageId) {
          page = await updatePage(notionClient, existingPageId, { properties })
          stats.updated++
        } else {
          page = await createPage(notionClient, {
            parent: { database_id: NOTION_DATABASES.roleTags.databaseId },
            properties,
          })
          stats.created++
        }

        // Update notion_mappings
        await supabase.from("notion_mappings").upsert(
          {
            notion_page_id: page.id,
            entity_type: "role_tag",
            entity_id: roleTag.id,
          },
          { onConflict: "notion_page_id" }
        )
      }
    } catch (error: any) {
      console.error(`❌ Failed to import batch ${i / batchSize + 1}:`, error.message)
      stats.failed += batch.length
      batch.forEach((roleTag) => {
        stats.errors.push({
          entity: `role_tag:${roleTag.name}`,
          error: error.message,
        })
      })
    }
  }

  return stats
}

/**
 * Import Pokemon from Supabase to Notion
 */
async function importPokemon(
  supabase: ReturnType<typeof createClient>,
  dryRun: boolean
): Promise<ImportStats> {
  const stats: ImportStats = { created: 0, updated: 0, failed: 0, errors: [] }

  console.log("📦 Fetching pokemon from Supabase...")
  const { data: pokemon, error } = await supabase
    .from("pokemon")
    .select("*")
    .order("slug")

  if (error) {
    throw new Error(`Failed to fetch pokemon: ${error.message}`)
  }

  if (!pokemon || pokemon.length === 0) {
    console.log("⚠️  No pokemon found in Supabase")
    return stats
  }

  console.log(`✅ Found ${pokemon.length} pokemon`)

  // Initialize Notion client
  const notionClient = createNotionClient()

  // Check existing pages by slug
  const existingPages = new Map<string, string>() // slug -> page_id
  if (!dryRun) {
    try {
      const existing = await queryAllPages(
        notionClient,
        NOTION_DATABASES.pokemonCatalog.databaseId,
        { maxPages: 2000 }
      )
      existing.forEach((page) => {
        const slug = extractPropertyValue(
          page.properties["Internal Slug"],
          "rich_text"
        )
        if (slug) {
          existingPages.set(slug, page.id)
        }
      })
      console.log(`  Found ${existingPages.size} existing pokemon in Notion`)
    } catch (error: any) {
      console.warn(`  Warning: Could not query existing pages: ${error.message}`)
    }
  }

  // Batch create/update pages (smaller batches due to many properties)
  const batchSize = 5 // Very small batches for pokemon due to property count
  for (let i = 0; i < pokemon.length; i += batchSize) {
    const batch = pokemon.slice(i, i + batchSize)

    if (dryRun) {
      console.log(`[DRY RUN] Would create/update ${batch.length} pokemon`)
      stats.created += batch.length
      continue
    }

    try {
      for (const poke of batch) {
        const existingPageId = existingPages.get(poke.slug)

        const properties: Record<string, any> = {}
        if (!existingPageId) {
          properties["Name"] = buildNotionProperty("title", poke.name)
        }
        if (poke.species_name) {
          properties["Species Name"] = buildNotionProperty("rich_text", poke.species_name)
        }
        if (poke.form) {
          properties["Form"] = buildNotionProperty("select", normalizeForm(poke.form))
        }
        if (poke.dex_number !== null && poke.dex_number !== undefined) {
          properties["Pokedex #"] = buildNotionProperty("number", poke.dex_number)
        }
        if (poke.slug) {
          properties["Internal Slug"] = buildNotionProperty("rich_text", poke.slug)
        }
        properties["Eligible"] = buildNotionProperty("checkbox", poke.eligible)
        if (poke.type1) {
          properties["Type 1"] = buildNotionProperty("select", normalizeType(poke.type1))
        }
        if (poke.type2) {
          const type2Value = normalizeType(poke.type2)
          properties["Type 2"] = buildNotionProperty(
            "select",
            type2Value === "none" ? "(none)" : type2Value
          )
        }
        if (poke.draft_points !== null && poke.draft_points !== undefined) {
          properties["Draft Points"] = buildNotionProperty("number", poke.draft_points)
        }
        if (poke.tier) {
          properties["Tier"] = buildNotionProperty("select", poke.tier)
        }
        if (poke.restriction_notes) {
          properties["Ban / Restriction Notes"] = buildNotionProperty(
            "rich_text",
            poke.restriction_notes
          )
        }
        if (poke.sprite_bw_url) {
          properties["BW Sprite URL"] = buildNotionProperty("url", poke.sprite_bw_url)
        }
        if (poke.sprite_serebii_url) {
          properties["Serebii Sprite URL"] = buildNotionProperty("url", poke.sprite_serebii_url)
        }
        if (poke.sprite_home_url) {
          properties["Home Sprite URL"] = buildNotionProperty("url", poke.sprite_home_url)
        }
        // Base stats
        if (poke.hp !== null && poke.hp !== undefined) {
          properties["HP"] = buildNotionProperty("number", poke.hp)
        }
        if (poke.atk !== null && poke.atk !== undefined) {
          properties["Atk"] = buildNotionProperty("number", poke.atk)
        }
        if (poke.def !== null && poke.def !== undefined) {
          properties["Def"] = buildNotionProperty("number", poke.def)
        }
        if (poke.spa !== null && poke.spa !== undefined) {
          properties["SpA"] = buildNotionProperty("number", poke.spa)
        }
        if (poke.spd !== null && poke.spd !== undefined) {
          properties["SpD"] = buildNotionProperty("number", poke.spd)
        }
        if (poke.spe !== null && poke.spe !== undefined) {
          properties["Spe"] = buildNotionProperty("number", poke.spe)
        }
        // Speed calculations
        if (poke.speed_0_ev !== null && poke.speed_0_ev !== undefined) {
          properties["Speed @ 0 EV"] = buildNotionProperty("number", poke.speed_0_ev)
        }
        if (poke.speed_252_ev !== null && poke.speed_252_ev !== undefined) {
          properties["Speed @ 252 EV"] = buildNotionProperty("number", poke.speed_252_ev)
        }
        if (poke.speed_252_plus !== null && poke.speed_252_plus !== undefined) {
          properties["Speed @ 252+"] = buildNotionProperty("number", poke.speed_252_plus)
        }
        // External names
        if (poke.github_name) {
          properties["GitHub Name"] = buildNotionProperty("rich_text", poke.github_name)
        }
        if (poke.smogon_name) {
          properties["Smogon Name"] = buildNotionProperty("rich_text", poke.smogon_name)
        }
        if (poke.pokemondb_name) {
          properties["PokemonDB Name"] = buildNotionProperty("rich_text", poke.pokemondb_name)
        }
        if (poke.smogon_url) {
          properties["Smogon URL"] = buildNotionProperty("url", poke.smogon_url)
        }
        if (poke.pokemondb_url) {
          properties["PokemonDB URL"] = buildNotionProperty("url", poke.pokemondb_url)
        }
        // Type effectiveness multipliers
        const typeMultipliers = [
          "vs_normal",
          "vs_fire",
          "vs_water",
          "vs_electric",
          "vs_grass",
          "vs_ice",
          "vs_fighting",
          "vs_poison",
          "vs_ground",
          "vs_flying",
          "vs_psychic",
          "vs_bug",
          "vs_rock",
          "vs_ghost",
          "vs_dragon",
          "vs_dark",
          "vs_steel",
          "vs_fairy",
        ]
        typeMultipliers.forEach((prop) => {
          const value = (poke as any)[prop]
          if (value !== null && value !== undefined) {
            const propertyName = prop
              .split("_")
              .map((w, i) => (i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
              .join(" ")
            properties[propertyName] = buildNotionProperty("number", Number(value))
          }
        })
        // Relations will be set in linkRelations() after all entities exist

        let page
        if (existingPageId) {
          page = await updatePage(notionClient, existingPageId, { properties })
          stats.updated++
        } else {
          page = await createPage(notionClient, {
            parent: { database_id: NOTION_DATABASES.pokemonCatalog.databaseId },
            properties,
          })
          stats.created++
        }

        // Update notion_mappings
        await supabase.from("notion_mappings").upsert(
          {
            notion_page_id: page.id,
            entity_type: "pokemon",
            entity_id: poke.id,
          },
          { onConflict: "notion_page_id" }
        )
      }
    } catch (error: any) {
      console.error(`❌ Failed to import batch ${i / batchSize + 1}:`, error.message)
      stats.failed += batch.length
      batch.forEach((poke) => {
        stats.errors.push({ entity: `pokemon:${poke.slug}`, error: error.message })
      })
    }
  }

  return stats
}

/**
 * Link relations after all entities are imported
 */
async function linkRelations(
  supabase: ReturnType<typeof createClient>,
  dryRun: boolean
): Promise<ImportStats> {
  const stats: ImportStats = { created: 0, updated: 0, failed: 0, errors: [] }

  console.log("🔗 Linking relations...")

  // 1. Link Pokemon ↔ Role Tags (pokemon_role_tags)
  console.log("  Linking Pokemon ↔ Role Tags...")
  const { data: pokemonRoleTags } = await supabase
    .from("pokemon_role_tags")
    .select("pokemon_id, role_tag_id, pokemon(slug), role_tags(name)")

  if (pokemonRoleTags && pokemonRoleTags.length > 0) {
    // Get notion_mappings for all pokemon and role_tags
    const pokemonIds = [...new Set(pokemonRoleTags.map((prt: any) => prt.pokemon_id))]
    const roleTagIds = [...new Set(pokemonRoleTags.map((prt: any) => prt.role_tag_id))]

    const { data: pokemonMappings } = await supabase
      .from("notion_mappings")
      .select("notion_page_id, entity_id")
      .eq("entity_type", "pokemon")
      .in("entity_id", pokemonIds)

    const { data: roleTagMappings } = await supabase
      .from("notion_mappings")
      .select("notion_page_id, entity_id")
      .eq("entity_type", "role_tag")
      .in("entity_id", roleTagIds)

    const pokemonPageMap = new Map(
      pokemonMappings?.map((m) => [m.entity_id, m.notion_page_id]) || []
    )
    const roleTagPageMap = new Map(
      roleTagMappings?.map((m) => [m.entity_id, m.notion_page_id]) || []
    )

    // Group by pokemon
    const pokemonToRoleTags = new Map<string, string[]>()
    pokemonRoleTags.forEach((prt: any) => {
      const pokemonPageId = pokemonPageMap.get(prt.pokemon_id)
      const roleTagPageId = roleTagPageMap.get(prt.role_tag_id)
      if (pokemonPageId && roleTagPageId) {
        if (!pokemonToRoleTags.has(pokemonPageId)) {
          pokemonToRoleTags.set(pokemonPageId, [])
        }
        pokemonToRoleTags.get(pokemonPageId)!.push(roleTagPageId)
      }
    })

    // Update Pokemon pages with Role Tags relation
    if (!dryRun) {
      const notionClient = createNotionClient()
      for (const [pokemonPageId, roleTagPageIds] of pokemonToRoleTags.entries()) {
        try {
          await updatePage(notionClient, pokemonPageId, {
            properties: {
              "Role Tags": buildNotionProperty("relation", roleTagPageIds),
            },
          })
          stats.updated++
        } catch (error: any) {
          stats.failed++
          stats.errors.push({
            entity: `pokemon:${pokemonPageId}`,
            error: error.message,
          })
        }
      }
    } else {
      stats.updated += pokemonToRoleTags.size
    }
  }

  // 2. Link Pokemon ↔ Moves (pokemon_moves_utility)
  console.log("  Linking Pokemon ↔ Moves...")
  const { data: pokemonMoves } = await supabase
    .from("pokemon_moves_utility")
    .select("pokemon_id, move_id, pokemon(slug), moves(name)")

  if (pokemonMoves && pokemonMoves.length > 0) {
    const pokemonIds = [...new Set(pokemonMoves.map((pm: any) => pm.pokemon_id))]
    const moveIds = [...new Set(pokemonMoves.map((pm: any) => pm.move_id))]

    const { data: pokemonMappings } = await supabase
      .from("notion_mappings")
      .select("notion_page_id, entity_id")
      .eq("entity_type", "pokemon")
      .in("entity_id", pokemonIds)

    const { data: moveMappings } = await supabase
      .from("notion_mappings")
      .select("notion_page_id, entity_id")
      .eq("entity_type", "move")
      .in("entity_id", moveIds)

    const pokemonPageMap = new Map(
      pokemonMappings?.map((m) => [m.entity_id, m.notion_page_id]) || []
    )
    const movePageMap = new Map(
      moveMappings?.map((m) => [m.entity_id, m.notion_page_id]) || []
    )

    const pokemonToMoves = new Map<string, string[]>()
    pokemonMoves.forEach((pm: any) => {
      const pokemonPageId = pokemonPageMap.get(pm.pokemon_id)
      const movePageId = movePageMap.get(pm.move_id)
      if (pokemonPageId && movePageId) {
        if (!pokemonToMoves.has(pokemonPageId)) {
          pokemonToMoves.set(pokemonPageId, [])
        }
        pokemonToMoves.get(pokemonPageId)!.push(movePageId)
      }
    })

    if (!dryRun) {
      const notionClient = createNotionClient()
      for (const [pokemonPageId, movePageIds] of pokemonToMoves.entries()) {
        try {
          await updatePage(notionClient, pokemonPageId, {
            properties: {
              "Signature Utility Moves": buildNotionProperty("relation", movePageIds),
            },
          })
          stats.updated++
        } catch (error: any) {
          stats.failed++
          stats.errors.push({
            entity: `pokemon:${pokemonPageId}`,
            error: error.message,
          })
        }
      }
    } else {
      stats.updated += pokemonToMoves.size
    }
  }

  // 3. Link Role Tags ↔ Moves (role_tag_moves)
  console.log("  Linking Role Tags ↔ Moves...")
  const { data: roleTagMoves } = await supabase
    .from("role_tag_moves")
    .select("role_tag_id, move_id, role_tags(name), moves(name)")

  if (roleTagMoves && roleTagMoves.length > 0) {
    const roleTagIds = [...new Set(roleTagMoves.map((rtm: any) => rtm.role_tag_id))]
    const moveIds = [...new Set(roleTagMoves.map((rtm: any) => rtm.move_id))]

    const { data: roleTagMappings } = await supabase
      .from("notion_mappings")
      .select("notion_page_id, entity_id")
      .eq("entity_type", "role_tag")
      .in("entity_id", roleTagIds)

    const { data: moveMappings } = await supabase
      .from("notion_mappings")
      .select("notion_page_id, entity_id")
      .eq("entity_type", "move")
      .in("entity_id", moveIds)

    const roleTagPageMap = new Map(
      roleTagMappings?.map((m) => [m.entity_id, m.notion_page_id]) || []
    )
    const movePageMap = new Map(
      moveMappings?.map((m) => [m.entity_id, m.notion_page_id]) || []
    )

    if (!dryRun) {
      const notionClient = createNotionClient()
      for (const rtm of roleTagMoves) {
        const roleTagPageId = roleTagPageMap.get(rtm.role_tag_id)
        const movePageId = movePageMap.get(rtm.move_id)
        if (roleTagPageId && movePageId) {
          try {
            await updatePage(notionClient, roleTagPageId, {
              properties: {
                Move: buildNotionProperty("relation", [movePageId]),
              },
            })
            stats.updated++
          } catch (error: any) {
            stats.failed++
            stats.errors.push({
              entity: `role_tag:${roleTagPageId}`,
              error: error.message,
            })
          }
        }
      }
    } else {
      stats.updated += roleTagMoves.length
    }
  }

  return stats
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes("--dry-run")
  const scopeArg = args.find((arg) => arg.startsWith("--scope="))
  const scope: Scope = scopeArg
    ? (scopeArg.split("=")[1] as Scope)
    : "all"

  if (dryRun) {
    console.log("🔍 DRY RUN MODE - No changes will be made\n")
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase configuration. NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set."
    )
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const allStats: Record<string, ImportStats> = {}

  try {
    // Import in order: Moves → Role Tags → Pokemon
    if (scope === "all" || scope === "moves") {
      console.log("\n📝 Importing Moves...")
      allStats.moves = await importMoves(supabase, dryRun)
      console.log(
        `✅ Moves: ${allStats.moves.created} created, ${allStats.moves.failed} failed`
      )
    }

    if (scope === "all" || scope === "role_tags") {
      console.log("\n📝 Importing Role Tags...")
      allStats.roleTags = await importRoleTags(supabase, dryRun)
      console.log(
        `✅ Role Tags: ${allStats.roleTags.created} created, ${allStats.roleTags.failed} failed`
      )
    }

    if (scope === "all" || scope === "pokemon") {
      console.log("\n📝 Importing Pokemon...")
      allStats.pokemon = await importPokemon(supabase, dryRun)
      console.log(
        `✅ Pokemon: ${allStats.pokemon.created} created, ${allStats.pokemon.failed} failed`
      )
    }

    // Link relations after all entities are imported
    if (scope === "all") {
      console.log("\n🔗 Linking relations...")
      allStats.relations = await linkRelations(supabase, dryRun)
      console.log(
        `✅ Relations: ${allStats.relations.updated} updated, ${allStats.relations.failed} failed`
      )
    }

    // Summary
    console.log("\n" + "=".repeat(60))
    console.log("📊 Import Summary")
    console.log("=".repeat(60))
    Object.entries(allStats).forEach(([key, stats]) => {
      console.log(`\n${key}:`)
      console.log(`  Created: ${stats.created}`)
      console.log(`  Updated: ${stats.updated}`)
      console.log(`  Failed: ${stats.failed}`)
      if (stats.errors.length > 0) {
        console.log(`  Errors:`)
        stats.errors.slice(0, 5).forEach((err) => {
          console.log(`    - ${err.entity}: ${err.error}`)
        })
        if (stats.errors.length > 5) {
          console.log(`    ... and ${stats.errors.length - 5} more`)
        }
      }
    })
  } catch (error: any) {
    console.error("\n❌ Fatal error:", error.message)
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error)
}

export { importMoves, importRoleTags, importPokemon, linkRelations }
