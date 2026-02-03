/**
 * Draft Pool Sync Service
 *
 * @deprecated Draft pool is now sourced from Notion via n8n (seed + sync workflows).
 * Staging (sheets_draft_pool) → production sync is no longer used by the app.
 * Kept for legacy scripts only.
 *
 * Syncs data from sheets_draft_pool staging table to draft_pool production table.
 */

import { createServiceRoleClient } from "@/lib/supabase/service"
import type { SyncResult } from "./types"

// Re-export type for backward compatibility
export type { SyncResult } from "./types"

/**
 * Sync staging table to production draft_pool
 * 
 * @param seasonId - Season ID for the draft pool (required)
 * @param sheetName - Optional sheet name filter (defaults to "Draft Board")
 * @param dryRun - If true, don't actually sync, just return what would be synced
 */
export async function syncStagingToProduction(
  seasonId: string,
  sheetName: string = "Draft Board",
  dryRun: boolean = false
): Promise<SyncResult> {
  const supabase = createServiceRoleClient()
  const conflicts: Array<{ pokemon: string; reason: string }> = []
  const warnings: Array<{ pokemon: string; message: string }> = []
  const unmatchedNames: string[] = []
  let synced = 0
  let skipped = 0

  // Fetch all Pokemon from staging table
  const { data: stagingPokemon, error: stagingError } = await supabase
    .from("sheets_draft_pool")
    .select("*")
    .eq("sheet_name", sheetName)

  if (stagingError) {
    throw new Error(`Failed to fetch staging data: ${stagingError.message}`)
  }

  if (!stagingPokemon || stagingPokemon.length === 0) {
    return {
      success: true,
      synced: 0,
      skipped: 0,
      conflicts: [],
      warnings: [{ pokemon: "all", message: "No Pokemon found in staging table" }],
      unmatchedNames: [],
      totalProcessed: 0,
    }
  }

  // Build Pokemon name lookup map for matching
  const pokemonNames = stagingPokemon.map(p => p.pokemon_name)
  const nameMap = new Map<string, number>()

  // Try to match Pokemon names to pokemon_cache
  // First pass: exact match (case-insensitive)
  const normalizedNames = pokemonNames.map(name => name.toLowerCase().trim())
  const { data: pokemonCache, error: cacheError } = await supabase
    .from("pokemon_cache")
    .select("pokemon_id, name")
    .in("name", normalizedNames)

  if (!cacheError && pokemonCache) {
    // Build lookup map (normalize names for matching)
    pokemonCache.forEach(pc => {
      const normalizedName = pc.name.toLowerCase().trim()
      nameMap.set(normalizedName, pc.pokemon_id)
    })
  }

  // Second pass: fuzzy match for unmatched names (using ilike for partial matches)
  // This handles cases like "Rotom Wash" vs "rotom-wash" vs "rotomwash"
  const namesToFuzzyMatch = pokemonNames.filter(
    name => !nameMap.has(name.toLowerCase().trim())
  )

  if (namesToFuzzyMatch.length > 0) {
    // Try fuzzy matching for each unmatched name
    for (const unmatchedName of namesToFuzzyMatch.slice(0, 50)) { // Limit to 50 for performance
      const normalized = unmatchedName.toLowerCase().trim().replace(/[\s-]/g, "")
      const { data: fuzzyMatch } = await supabase
        .from("pokemon_cache")
        .select("pokemon_id, name")
        .ilike("name", `%${normalized}%`)
        .limit(1)
        .maybeSingle()

      if (fuzzyMatch) {
        // Store both the normalized staging name and the matched cache name
        nameMap.set(unmatchedName.toLowerCase().trim(), fuzzyMatch.pokemon_id)
      }
    }
  }

  // Process in batches
  const batchSize = 100
  const batches: any[] = []

  for (let i = 0; i < stagingPokemon.length; i += batchSize) {
    const batch = stagingPokemon.slice(i, i + batchSize)
    const inserts: any[] = []

    for (const staging of batch) {
      // Check if Pokemon already exists in draft_pool for this season
      const { data: existing } = await supabase
        .from("draft_pool")
        .select("status, drafted_by_team_id")
        .eq("season_id", seasonId)
        .eq("pokemon_name", staging.pokemon_name)
        .maybeSingle()

      // Skip if already drafted (preserve draft data)
      if (existing?.status === "drafted") {
        skipped++
        conflicts.push({
          pokemon: staging.pokemon_name,
          reason: "Already drafted - preserving existing draft data",
        })
        continue
      }

      // Map is_available to status enum
      let status: "available" | "banned" | "unavailable" = "available"
      if (!staging.is_available) {
        // If not available, check if it's banned or just unavailable
        // For now, assume banned if not available
        status = "banned"
      }

      // Match Pokemon name to pokemon_cache
      const normalizedName = staging.pokemon_name.toLowerCase().trim()
      const pokemonId = nameMap.get(normalizedName) || null

      if (!pokemonId) {
        unmatchedNames.push(staging.pokemon_name)
        warnings.push({
          pokemon: staging.pokemon_name,
          message: "Could not match to pokemon_cache - pokemon_id will be NULL",
        })
      }

      // Set tera_captain_eligible based on is_tera_banned
      // If is_tera_banned is true, tera_captain_eligible should be false
      const teraCaptainEligible = !staging.is_tera_banned

      inserts.push({
        pokemon_name: staging.pokemon_name.trim(),
        point_value: staging.point_value,
        status,
        season_id: seasonId,
        pokemon_id: pokemonId,
        tera_captain_eligible: teraCaptainEligible,
        // Preserve existing draft metadata if updating
        ...(existing && {
          drafted_by_team_id: existing.drafted_by_team_id,
        }),
      })
    }

    if (inserts.length > 0) {
      batches.push(inserts)
    }
  }

  // Perform sync (or dry run)
  if (!dryRun) {
    for (const batch of batches) {
      // Use upsert to handle updates
      const { error: upsertError } = await supabase
        .from("draft_pool")
        .upsert(batch, {
          onConflict: "season_id,pokemon_name",
          ignoreDuplicates: false,
        })

      if (upsertError) {
        throw new Error(`Failed to sync batch: ${upsertError.message}`)
      }

      synced += batch.length
    }
  } else {
    // Dry run - just count what would be synced
    synced = batches.reduce((sum, batch) => sum + batch.length, 0)
  }

  return {
    success: true,
    synced,
    skipped,
    conflicts,
    warnings,
    unmatchedNames: [...new Set(unmatchedNames)], // Remove duplicates
    totalProcessed: stagingPokemon.length,
  }
}
