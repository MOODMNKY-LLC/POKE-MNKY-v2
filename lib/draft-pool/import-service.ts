/**
 * Draft Pool Import Service
 *
 * @deprecated Draft pool is now sourced from Notion via n8n (seed + sync workflows).
 * This service and sheets_draft_pool staging are no longer used by the app.
 * Kept for legacy scripts (e.g. validate-draft-pool-system.ts) only.
 *
 * Handles importing draft pool data from server agent's JSON format
 * into the sheets_draft_pool staging table.
 */

import { createServiceRoleClient } from "@/lib/supabase/service"
import type {
  ServerAgentDraftPool,
  ImportResult,
} from "./types"

// Re-export types for backward compatibility
export type { ServerAgentDraftPool, ImportResult } from "./types"

/**
 * Import server agent JSON to sheets_draft_pool staging table
 * 
 * This function:
 * 1. Parses the server agent JSON format
 * 2. Maps statuses correctly (tera_banned → available but flagged)
 * 3. Inserts/updates into sheets_draft_pool
 * 4. Returns import statistics
 */
export async function importDraftPoolToStaging(
  draftPoolData: ServerAgentDraftPool,
  sheetName: string = "Draft Board"
): Promise<ImportResult> {
  const supabase = createServiceRoleClient()
  const errors: Array<{ pokemon: string; error: string }> = []
  const warnings: Array<{ pokemon: string; message: string }> = []
  let imported = 0
  let updated = 0
  let teraBannedCount = 0

  // Create a Set for fast Tera banned lookup
  const teraBannedSet = new Set(
    draftPoolData.teraBannedList.map(name => name.toLowerCase().trim())
  )

  // Combine all Pokemon arrays with their statuses
  const allPokemon: Array<{
    name: string
    pointValue: number
    status: "available" | "banned" | "tera_banned" | "drafted"
  }> = []

  // Add available Pokemon
  draftPoolData.pokemon.available.forEach(p => {
    allPokemon.push({
      name: p.name,
      pointValue: p.pointValue,
      status: "available",
    })
  })

  // Add banned Pokemon
  draftPoolData.pokemon.banned.forEach(p => {
    allPokemon.push({
      name: p.name,
      pointValue: p.pointValue,
      status: "banned",
    })
  })

  // Add Tera banned Pokemon (still draftable, but flagged)
  draftPoolData.pokemon.teraBanned.forEach(p => {
    allPokemon.push({
      name: p.name,
      pointValue: p.pointValue,
      status: "tera_banned",
    })
    teraBannedCount++
  })

  // Add drafted Pokemon
  draftPoolData.pokemon.drafted.forEach(p => {
    allPokemon.push({
      name: p.name,
      pointValue: p.pointValue,
      status: "drafted",
    })
  })

  // Also check teraBannedList for any Pokemon that might be in available but should be flagged
  draftPoolData.pokemon.available.forEach(p => {
    if (teraBannedSet.has(p.name.toLowerCase().trim())) {
      // This Pokemon is in available list but also in teraBannedList
      // Find and update its status
      const existing = allPokemon.find(
        pokemon => pokemon.name === p.name && pokemon.pointValue === p.pointValue
      )
      if (existing && existing.status === "available") {
        existing.status = "tera_banned"
        teraBannedCount++
      }
    }
  })

  // Process in batches of 100 for better performance
  const batchSize = 100
  for (let i = 0; i < allPokemon.length; i += batchSize) {
    const batch = allPokemon.slice(i, i + batchSize)
    const inserts = batch.map(pokemon => {
      // Map status to is_available boolean for staging table
      // Tera banned Pokemon are still "available" for drafting
      const isAvailable =
        pokemon.status === "available" || pokemon.status === "tera_banned"
      
      // Track Tera banned status separately
      const isTeraBanned = pokemon.status === "tera_banned" || 
        teraBannedSet.has(pokemon.name.toLowerCase().trim())

      // Build insert object - conditionally include is_tera_banned
      // to handle schema cache issues gracefully
      const insertObj: any = {
        pokemon_name: pokemon.name.trim(),
        point_value: pokemon.pointValue,
        is_available: isAvailable,
        sheet_name: sheetName,
        // generation and pokemon_id will be NULL initially
        // These can be populated later via matching service
        generation: null,
        pokemon_id: null,
        sheet_row: null,
        sheet_column: null,
      }
      
      // Only include is_tera_banned if it's true (to avoid schema cache issues)
      // If false, the default value in the database will handle it
      if (isTeraBanned) {
        insertObj.is_tera_banned = true
      }
      
      return insertObj
    })

    // Use upsert to handle duplicates (based on unique constraint)
    try {
      const { data, error } = await supabase
        .from("sheets_draft_pool")
        .upsert(inserts, {
          onConflict: "sheet_name,pokemon_name,point_value",
          ignoreDuplicates: false,
        })
        .select()

      if (error) {
        // Log errors but continue processing
        console.error(`[Import Service] Batch ${i / batchSize + 1} error:`, error)
        batch.forEach(pokemon => {
          errors.push({
            pokemon: pokemon.name,
            error: error.message,
          })
        })
      } else {
        // Count inserted vs updated
        // Note: Supabase upsert doesn't tell us which were inserted vs updated
        // We'll estimate based on whether data was returned
        if (data && data.length > 0) {
          imported += data.length
        }
      }
    } catch (err: any) {
      // Handle unexpected errors (like schema cache issues)
      console.error(`[Import Service] Batch ${i / batchSize + 1} exception:`, err)
      batch.forEach(pokemon => {
        errors.push({
          pokemon: pokemon.name,
          error: err.message || "Unexpected error during import",
        })
      })
    }
  }

  // Log summary for debugging
  console.log(`[Import Service] Import complete:`, {
    imported,
    totalProcessed: allPokemon.length,
    errors: errors.length,
    warnings: warnings.length,
    teraBannedCount,
    success: errors.length === 0,
  })
  
  if (errors.length > 0) {
    console.error(`[Import Service] First 5 errors:`, errors.slice(0, 5))
  }

  return {
    success: errors.length === 0,
    imported,
    updated: 0, // Can't distinguish from upsert, but that's okay
    errors,
    warnings,
    teraBannedCount,
    totalProcessed: allPokemon.length,
  }
}

/**
 * Validate server agent JSON structure
 */
export function validateDraftPoolJSON(data: any): data is ServerAgentDraftPool {
  return (
    data &&
    typeof data === "object" &&
    data.config &&
    data.metadata &&
    data.pokemon &&
    Array.isArray(data.pokemon.available) &&
    Array.isArray(data.pokemon.banned) &&
    Array.isArray(data.pokemon.teraBanned) &&
    Array.isArray(data.pokemon.drafted) &&
    Array.isArray(data.bannedList) &&
    Array.isArray(data.teraBannedList)
  )
}
