/**
 * Vercel Cron API Route for Pokemon Sync
 * Triggered daily at 3 AM UTC
 *
 * Calls the sync-pokemon-pokeapi Edge Function to sync new/expired Pokemon.
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
 * 2. Generate a random secret and set CRON_SECRET in Vercel (see docs/CRON-SECRET-SETUP.md).
 *    Vercel sends it automatically as Authorization: Bearer <CRON_SECRET> when invoking the cron.
 */

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const revalidate = 0
export const maxDuration = 60

async function detectNewPokemon(supabase: ReturnType<typeof createClient>): Promise<number[]> {
  const { data: maxCached } = await supabase
    .from("pokemon_cache")
    .select("pokemon_id")
    .order("pokemon_id", { ascending: false })
    .limit(1)
    .single()

  const maxId = maxCached?.pokemon_id || 0
  const newIds: number[] = []
  let currentId = maxId + 1

  while (currentId <= 1025) {
    try {
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${currentId}`, {
        headers: { "User-Agent": "POKE-MNKY/1.0" },
      })
      if (res.ok) {
        newIds.push(currentId)
        currentId++
      } else {
        break
      }
    } catch {
      break
    }
  }

  return newIds
}

async function getExpiredPokemon(supabase: ReturnType<typeof createClient>): Promise<number[]> {
  const { data: expired } = await supabase
    .from("pokemon_cache")
    .select("pokemon_id")
    .lt("expires_at", new Date().toISOString())
    .order("pokemon_id")

  return expired?.map((p) => p.pokemon_id) || []
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Missing Supabase configuration" }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    const [newPokemon, expiredPokemon] = await Promise.all([
      detectNewPokemon(supabase),
      getExpiredPokemon(supabase),
    ])

    const toSync = [...new Set([...newPokemon, ...expiredPokemon])]

    if (toSync.length === 0) {
      await supabase.from("sync_jobs").insert({
        job_type: "incremental",
        sync_type: "pokemon_cache",
        status: "completed",
        triggered_by: "cron",
        pokemon_synced: 0,
        completed_at: new Date().toISOString(),
      })

      return NextResponse.json({
        success: true,
        message: "Cache is up to date",
        synced: 0,
      })
    }

    const start = Math.min(...toSync)
    const end = Math.min(Math.max(...toSync), 1025)
    const batchSize = 20

    const functionUrl = `${supabaseUrl}/functions/v1/sync-pokemon-pokeapi`
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        start,
        end,
        batchSize,
        rateLimitMs: 50,
      }),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data.error || `Edge Function failed: ${response.statusText}`,
        },
        { status: 500 }
      )
    }

    if (data.success === false) {
      return NextResponse.json(
        { success: false, error: data.error || "Sync failed" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: data.hasMore
        ? `Synced chunk: ${data.synced} new, ${data.skipped} skipped, ${data.failed} failed. More chunks remain.`
        : `Synced ${data.totalSynced} Pokemon (${data.totalSkipped} skipped, ${data.totalFailed} failed)`,
      synced: data.totalSynced,
      skipped: data.totalSkipped,
      failed: data.totalFailed,
      hasMore: data.hasMore,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Sync failed",
      },
      { status: 500 }
    )
  }
}
