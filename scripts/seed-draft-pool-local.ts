/**
 * Seed local draft_pool from Notion (same logic as n8n "Draft Pool Seed" workflow).
 *
 * Use this in local development when n8n runs against production only.
 * Loads .env.local so Supabase = local; Notion = same as prod (Master Draft Board).
 *
 * Prerequisites:
 * - .env.local has NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (local Supabase)
 * - .env.local has NOTION_API_KEY (same Notion as production)
 * - Local DB has a season with is_current = true
 * - Notion Master Draft Board has rows with "Added to Draft Board" checked
 *
 * Run:
 *   pnpm exec tsx --env-file=.env.local scripts/seed-draft-pool-local.ts
 *
 * Options:
 *   --clear   Delete existing draft_pool rows for current season before inserting (default: true)
 *   --dry-run Only fetch and log; do not delete or insert
 */

import { config } from "dotenv"
import { resolve } from "path"
import { createNotionClient, queryAllPages, extractPropertyValue } from "@/lib/notion/client"
import { createServiceRoleClient } from "@/lib/supabase/service"

const DRAFT_BOARD_DATABASE_ID = "5e58ccd73ceb44ed83de826b51cf5c36"

config({ path: resolve(process.cwd(), ".env.local") })
config({ path: resolve(process.cwd(), ".env") })

function clampPointValue(n: number | null | undefined): number {
  if (n == null || Number.isNaN(n)) return 12
  const v = Math.round(Number(n))
  return Math.min(20, Math.max(1, v))
}

/** Normalize name for matching pokemon_cache (lowercase, trim, spaces -> hyphens). */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
}

/**
 * Build a map from normalized name -> pokemon_id using local pokemon_cache.
 * Tries exact normalized key and also "display" form (spaces) so we match both "tapu-fini" and "Tapu Fini".
 */
function buildNameToIdMap(entries: { pokemon_id: number; name: string }[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const e of entries) {
    const normalized = normalizeName(e.name)
    map.set(normalized, e.pokemon_id)
    const withSpaces = e.name.toLowerCase().trim()
    map.set(withSpaces, e.pokemon_id)
  }
  return map
}

function resolvePokemonId(pokemonName: string, nameToId: Map<string, number>): number | null {
  const normalized = normalizeName(pokemonName)
  return nameToId.get(normalized) ?? nameToId.get(pokemonName.toLowerCase().trim()) ?? null
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes("--dry-run")
  const clearFirst = !args.includes("--no-clear")

  console.log("🌱 Seed draft_pool (local) from Notion Master Draft Board\n")

  const supabase = createServiceRoleClient()
  const notion = createNotionClient()

  // 1. Get current season
  const { data: season, error: seasonError } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("is_current", true)
    .single()

  if (seasonError || !season) {
    console.error("❌ No current season (is_current = true). Set one in local Supabase first.")
    process.exit(1)
  }
  console.log(`📅 Current season: ${season.name} (${season.id})\n`)

  // 2. Load local pokemon_cache for FK resolution (draft_pool.pokemon_id -> pokemon_cache.pokemon_id)
  const { data: cacheRows, error: cacheError } = await supabase
    .from("pokemon_cache")
    .select("pokemon_id, name")
  if (cacheError) {
    console.error("❌ Failed to load pokemon_cache:", cacheError.message)
    process.exit(1)
  }
  const nameToId = buildNameToIdMap(cacheRows ?? [])
  console.log(`   Loaded ${(cacheRows ?? []).length} pokemon_cache entries for name resolution.\n`)

  // 3. Fetch all pages from Notion Draft Board
  console.log("📥 Fetching Notion Draft Board pages...")
  const pages = await queryAllPages(notion, DRAFT_BOARD_DATABASE_ID)
  console.log(`   Found ${pages.length} pages\n`)

  // 4. Filter "Added to Draft Board" = true and map to draft_pool rows (same as n8n transform)
  const rows: Array<{
    season_id: string
    pokemon_name: string
    point_value: number
    status: string
    tera_captain_eligible: boolean
    pokemon_id: number | null
    banned_reason: string | null
  }> = []

  for (const page of pages) {
    const added = extractPropertyValue(page.properties["Added to Draft Board"], "checkbox")
    if (added !== true) continue

    const name = extractPropertyValue(page.properties["Name"], "title")
    if (!name || typeof name !== "string") continue

    const pointValueRaw = extractPropertyValue(page.properties["Point Value"], "number")
    const point_value = clampPointValue(pointValueRaw)
    const statusRaw = extractPropertyValue(page.properties["Status"], "select")
    const status = statusRaw ? String(statusRaw).toLowerCase() : "available"
    const tera_captain_eligible = extractPropertyValue(page.properties["Tera Captain Eligible"], "checkbox") ?? true
    const notesProp = page.properties["Notes / Banned Reason"] ?? page.properties["Notes"]
    const banned_reason = notesProp ? extractPropertyValue(notesProp, "rich_text") : null

    // status must be one of: available, drafted, banned, unavailable
    const statusVal = ["available", "drafted", "banned", "unavailable"].includes(status)
      ? status
      : "available"

    // Resolve pokemon_id from local pokemon_cache by name (avoids FK violation if cache empty or Notion ID missing)
    const pokemon_name_trimmed = name.trim()
    const pokemon_id = resolvePokemonId(pokemon_name_trimmed, nameToId)

    rows.push({
      season_id: season.id,
      pokemon_name: pokemon_name_trimmed,
      point_value,
      status: statusVal,
      tera_captain_eligible: Boolean(tera_captain_eligible),
      pokemon_id,
      banned_reason: banned_reason != null ? String(banned_reason).trim() || null : null,
    })
  }

  const withId = rows.filter((r) => r.pokemon_id != null).length
  console.log(`   Rows to insert: ${rows.length} (Added to Draft Board = true); ${withId} with pokemon_id from local cache.\n`)

  if (rows.length === 0) {
    console.log("⚠️  No rows to insert. Check Notion: ensure 'Added to Draft Board' is checked for some rows.")
    process.exit(0)
  }

  if (dryRun) {
    console.log("🔍 Dry run — no changes made. Sample row:", rows[0])
    process.exit(0)
  }

  // 4. Optional: clear existing draft_pool for current season
  if (clearFirst) {
    const { error: delError } = await supabase
      .from("draft_pool")
      .delete()
      .eq("season_id", season.id)
    if (delError) {
      console.error("❌ Failed to clear existing draft_pool:", delError.message)
      process.exit(1)
    }
    console.log("   Cleared existing draft_pool rows for current season.")
  }

  // 6. Insert in batches
  const batchSize = 50
  let inserted = 0
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    const { error: insertError } = await supabase.from("draft_pool").insert(batch)
    if (insertError) {
      console.error(`❌ Insert error (batch at ${i}):`, insertError.message)
      process.exit(1)
    }
    inserted += batch.length
  }

  console.log(`\n✅ Inserted ${inserted} rows into draft_pool for ${season.name}.`)
  console.log("   You can now use the draft board in local dev.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
