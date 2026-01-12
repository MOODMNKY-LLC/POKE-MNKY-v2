/**
 * Vercel Cron API Route for Pokemon Sync
 * Triggered daily at 3 AM UTC
 *
 * Setup:
 * 1. Add to vercel.json:
 *    {
 *      "crons": [{
 *        "path": "/api/cron/sync-pokemon",
 *        "schedule": "0 3 * * *"
 *      }]
 *    }
 *
 * 2. Set CRON_SECRET in Vercel environment variables
 */

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getPokemonDataExtended } from "@/lib/pokemon-api-enhanced"
import { PokemonClient } from "pokenode-ts"

export const revalidate = 0
export const maxDuration = 60 // Maximum allowed on Vercel Hobby plan

const pokemonClient = new PokemonClient()

async function detectNewPokemon(): Promise<number[]> {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: maxCached } = await supabase
    .from("pokemon_cache")
    .select("pokemon_id")
    .order("pokemon_id", { ascending: false })
    .limit(1)
    .single()

  const maxId = maxCached?.pokemon_id || 0
  const newIds: number[] = []
  let currentId = maxId + 1

  while (true) {
    try {
      await pokemonClient.getPokemonById(currentId)
      newIds.push(currentId)
      currentId++
    } catch {
      break
    }
  }

  return newIds
}

async function getExpiredPokemon(): Promise<number[]> {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: expired } = await supabase
    .from("pokemon_cache")
    .select("pokemon_id")
    .lt("expires_at", new Date().toISOString())
    .order("pokemon_id")

  return expired?.map((p) => p.pokemon_id) || []
}

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // Create sync job
  const { data: job } = await supabase
    .from("sync_jobs")
    .insert({
      job_type: "incremental",
      status: "running",
      triggered_by: "cron",
    })
    .select()
    .single()

  if (!job) {
    return NextResponse.json({ error: "Failed to create sync job" }, { status: 500 })
  }

  try {
    // Detect new and expired Pokemon
    const [newPokemon, expiredPokemon] = await Promise.all([detectNewPokemon(), getExpiredPokemon()])

    const toSync = [...new Set([...newPokemon, ...expiredPokemon])]

    if (toSync.length === 0) {
      await supabase
        .from("sync_jobs")
        .update({
          status: "completed",
          pokemon_synced: 0,
          completed_at: new Date().toISOString(),
        })
        .eq("job_id", job.job_id)

      return NextResponse.json({
        success: true,
        message: "Cache is up to date",
        synced: 0,
      })
    }

    const batchSize = 20
    const batch = toSync.slice(0, batchSize)
    const remaining = toSync.length - batch.length

    // Sync Pokemon batch
    let synced = 0
    let failed = 0
    const errors: Array<{ pokemon_id: number; error: string }> = []

    for (const id of batch) {
      try {
        await getPokemonDataExtended(id, true)
        synced++
      } catch (error) {
        failed++
        errors.push({
          pokemon_id: id,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }

      await new Promise((resolve) => setTimeout(resolve, 50))
    }

    // Update sync job
    await supabase
      .from("sync_jobs")
      .update({
        status: remaining > 0 ? "partial" : failed === 0 ? "completed" : "partial",
        pokemon_synced: synced,
        pokemon_failed: failed,
        error_log: { errors, remaining_count: remaining },
        completed_at: new Date().toISOString(),
      })
      .eq("job_id", job.job_id)

    return NextResponse.json({
      success: failed === 0,
      message: `Synced ${synced}/${batch.length} Pokémon${remaining > 0 ? ` (${remaining} remaining for next run)` : ""}`,
      synced,
      failed,
      remaining,
      errors: failed > 0 ? errors : undefined,
    })
  } catch (error) {
    await supabase
      .from("sync_jobs")
      .update({
        status: "failed",
        error_log: { global_error: error instanceof Error ? error.message : "Unknown error" },
        completed_at: new Date().toISOString(),
      })
      .eq("job_id", job.job_id)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Sync failed",
      },
      { status: 500 },
    )
  }
}
