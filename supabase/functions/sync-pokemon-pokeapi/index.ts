/**
 * Supabase Edge Function: Sync Pokemon from PokeAPI
 *
 * Fetches Pokemon data from PokeAPI and upserts into pokemon_cache.
 * Processes one chunk per invocation to avoid timeout; client chains for full range.
 *
 * POST body: { jobId?, start, end, batchSize, rateLimitMs }
 * Returns: { jobId, synced, skipped, failed, nextStart, hasMore, totalSynced, totalSkipped, totalFailed }
 */

import { createClient } from "npm:@supabase/supabase-js@2"
import { transformPokemonData } from "../_shared/pokemon-transform.ts"
import type { PokeApiPokemon } from "../_shared/pokemon-transform.ts"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

const POKEAPI_BASE = "https://pokeapi.co/api/v2"

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchPokemon(id: number): Promise<PokeApiPokemon | null> {
  const maxRetries = 3
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(`${POKEAPI_BASE}/pokemon/${id}`, {
        headers: { "User-Agent": "POKE-MNKY/1.0" },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return (await res.json()) as PokeApiPokemon
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (attempt < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000)
        await sleep(delay)
      }
    }
  }
  throw lastError || new Error(`Failed to fetch Pokemon ${id}`)
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration")
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body = (await req.json().catch(() => ({}))) as {
      jobId?: string
      start?: number
      end?: number
      batchSize?: number
      rateLimitMs?: number
    }

    const start = Math.max(1, body.start ?? 1)
    const end = Math.min(1025, body.end ?? 1025)
    const batchSize = Math.min(100, Math.max(1, body.batchSize ?? 50))
    const rateLimitMs = Math.min(1000, Math.max(50, body.rateLimitMs ?? 100))

    if (start > end) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid range: start > end" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      )
    }

    const chunkEnd = Math.min(start + batchSize - 1, end)
    const batch = Array.from(
      { length: chunkEnd - start + 1 },
      (_, i) => start + i
    )

    const broadcastProgress = async (
      phase: string,
      current: number,
      total: number,
      message?: string
    ) => {
      try {
        await supabase.rpc("broadcast_pokemon_cache_sync_progress", {
          phase,
          current_count: current,
          total_count: total,
          message: message ?? null,
        })
      } catch {
        // non-critical
      }
    }

    let jobId = body.jobId
    let totalSynced = 0
    let totalSkipped = 0
    let totalFailed = 0
    let origStart = start
    let origEnd = end

    const totalInRange = end - start + 1

    if (!jobId) {
      const { data: job, error: jobErr } = await supabase
        .from("sync_jobs")
        .insert({
          job_type: "full",
          sync_type: "pokemon_cache",
          status: "running",
          triggered_by: "manual",
          config: { start, end, batchSize, rateLimitMs },
          phase: "pokemon_cache",
          total_chunks: Math.ceil(totalInRange / batchSize),
          current_chunk: 0,
        })
        .select("job_id")
        .single()

      if (jobErr || !job?.job_id) {
        throw new Error(`Failed to create sync job: ${jobErr?.message ?? "unknown"}`)
      }
      jobId = job.job_id
    } else {
      const { data: existing } = await supabase
        .from("sync_jobs")
        .select("pokemon_synced, pokemon_failed, config")
        .eq("job_id", jobId)
        .single()

      if (existing) {
        totalSynced = existing.pokemon_synced ?? 0
        const cfg = (existing.config ?? {}) as Record<string, unknown>
        totalSkipped = (cfg.totalSkipped as number) ?? 0
        totalFailed = existing.pokemon_failed ?? 0
        origStart = (cfg.start as number) ?? start
        origEnd = (cfg.end as number) ?? end
      }
    }

    const totalRange = origEnd - origStart + 1

    await broadcastProgress("starting", 0, batch.length, `Processing IDs ${start}-${chunkEnd}`)

    const { data: existingRows } = await supabase
      .from("pokemon_cache")
      .select("pokemon_id")
      .in("pokemon_id", batch)

    const existingIds = new Set(
      (existingRows ?? []).map((r) => r.pokemon_id)
    )

    let synced = 0
    let skipped = 0
    let failed = 0
    const errors: Array<{ id: number; error: string }> = []

    for (let i = 0; i < batch.length; i++) {
      const pokemonId = batch[i]

      if (existingIds.has(pokemonId)) {
        skipped++
        totalSkipped++
      } else {
        try {
          const pokemon = await fetchPokemon(pokemonId)
          if (!pokemon) {
            failed++
            totalFailed++
            errors.push({ id: pokemonId, error: "Fetch returned null" })
          } else {
            const transformed = transformPokemonData(pokemon)
            const { error: upsertErr } = await supabase
              .from("pokemon_cache")
              .upsert(transformed, { onConflict: "pokemon_id" })

            if (upsertErr) throw new Error(upsertErr.message)
            synced++
            totalSynced++
          }
        } catch (err) {
          failed++
          totalFailed++
          errors.push({
            id: pokemonId,
            error: err instanceof Error ? err.message : String(err),
          })
        }
        await sleep(rateLimitMs)
      }

      const processed = i + 1
      await broadcastProgress(
        "syncing",
        processed,
        batch.length,
        `Processed ${processed}/${batch.length} (IDs ${start}-${chunkEnd})`
      )
    }

    const nextStart = chunkEnd + 1
    const hasMore = nextStart <= origEnd
    const processedSoFar = Math.min(nextStart - origStart, totalRange)
    const progressPct =
      totalRange > 0 ? Math.round((processedSoFar / totalRange) * 100) : 100

    const { data: existingJob } = await supabase
      .from("sync_jobs")
      .select("config")
      .eq("job_id", jobId)
      .single()

    const existingConfig = (existingJob?.config ?? {}) as Record<string, unknown>
    const updatePayload: Record<string, unknown> = {
      pokemon_synced: totalSynced,
      pokemon_failed: totalFailed,
      last_heartbeat: new Date().toISOString(),
      progress_percent: progressPct,
      config: { ...existingConfig, totalSkipped },
    }

    if (hasMore) {
      updatePayload.status = "running"
    } else {
      updatePayload.status = "completed"
      updatePayload.completed_at = new Date().toISOString()
      updatePayload.progress_percent = 100
      if (errors.length > 0) {
        updatePayload.error_log = { errors: errors.slice(0, 20) }
      }
    }

    await supabase.from("sync_jobs").update(updatePayload).eq("job_id", jobId)

    return new Response(
      JSON.stringify({
        success: true,
        jobId,
        synced,
        skipped,
        failed,
        nextStart,
        hasMore,
        totalSynced,
        totalSkipped,
        totalFailed,
        progress: {
          synced: totalSynced,
          skipped: totalSkipped,
          failed: totalFailed,
          total: totalRange,
          percent: progressPct,
        },
      }),
      {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    )
  } catch (err) {
    console.error("sync-pokemon-pokeapi error:", err)
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    )
  }
})
