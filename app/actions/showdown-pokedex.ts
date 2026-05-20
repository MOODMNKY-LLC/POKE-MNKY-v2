"use server"

/**
 * Server Action: Trigger Showdown Pokedex Ingestion
 * Admin-only action to manually trigger Showdown pokedex sync
 * Uses service role key since this is admin-only
 */

import { invokeSupabaseEdgeFunction } from "@/lib/supabase/invoke-edge-function"

export async function triggerShowdownPokedexIngestion() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) {
      return { success: false, error: "Missing NEXT_PUBLIC_SUPABASE_URL" }
    }

    const functionUrl = `${supabaseUrl}/functions/v1/ingest-showdown-pokedex`
    console.log("Calling Edge Function:", functionUrl)

    const invoked = await invokeSupabaseEdgeFunction<Record<string, unknown>>(
      "ingest-showdown-pokedex",
      {},
      { timeoutMs: 120_000 }
    )

    const result = invoked.data

    if (!invoked.ok) {
      console.error("Edge Function error:", invoked.data ?? invoked.raw)
      return {
        success: false,
        error: invoked.error ?? "Edge Function failed",
        details: invoked.raw ?? invoked.data,
        result,
      }
    }

    // Also check if result.summary shows all failures
    if (result.summary && result.summary.processed === 0 && result.summary.errors > 0) {
      console.error("Edge Function completed but all items failed:", result)
      return {
        success: false,
        error: `All ${result.summary.errors} Pokémon entries failed to process`,
        details: result.errors || "Check Edge Function logs for details",
        result,
      }
    }

    return {
      success: true,
      message: "Showdown pokedex ingestion triggered successfully",
      result,
    }

  } catch (error: any) {
    console.error("Error triggering Showdown pokedex ingestion:", error)
    return {
      success: false,
      error: error.message || "Internal server error",
    }
  }
}

/**
 * Server Action: Clear Showdown Pokedex Data
 * Admin-only action to delete all Showdown pokedex data from database
 * Uses service role key since this is admin-only
 * Uses PostgreSQL function for efficient deletion
 */
export async function clearShowdownPokedexData() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!supabaseUrl || !serviceRoleKey) {
      return {
        success: false,
        error: "Missing Supabase configuration",
      }
    }

    // Use Supabase client to call the database function
    const { createClient } = await import("@supabase/supabase-js")
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Call PostgreSQL function to clear all data
    const { data, error } = await supabase.rpc("clear_showdown_pokedex_data")

    if (error) {
      console.error("Error clearing showdown pokedex data:", error)
      return {
        success: false,
        error: `Failed to clear data: ${error.message}`,
      }
    }

    if (!data || data.length === 0) {
      return {
        success: true,
        message: "Showdown pokedex data cleared successfully",
        deleted: {
          raw: 0,
          pokemon: 0,
        },
      }
    }

    const result = data[0]

    return {
      success: true,
      message: "Showdown pokedex data cleared successfully",
      deleted: {
        raw: result.raw_count || 0,
        pokemon: result.pokemon_count || 0,
      },
    }

  } catch (error: any) {
    console.error("Error clearing Showdown pokedex data:", error)
    return {
      success: false,
      error: error.message || "Internal server error",
    }
  }
}
