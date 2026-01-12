/**
 * Incremental Pokemon Sync Job
 * Syncs only expired or new Pokemon entries
 *
 * Usage:
 *   node scripts/incremental-sync-pokemon.ts
 *
 * This should be run:
 *   - Daily via cron (3 AM UTC recommended)
 *   - After competitive tier updates
 *   - To maintain cache freshness
 *
 * Benefits:
 *   - Minimal API usage (5-20 requests/day typically)
 *   - Fast execution (1-5 minutes)
 *   - Automatically detects new Pokemon releases
 */

import { createClient } from "@supabase/supabase-js"
import { PokemonClient } from "pokenode-ts"
import { getPokemonDataExtended } from "../lib/pokemon-api-enhanced"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const pokemonClient = new PokemonClient()

async function detectNewPokemon(): Promise<number[]> {
  console.log("🔍 Checking for new Pokemon releases...")

  // Get highest cached Pokemon ID
  const { data: maxCached } = await supabase
    .from("pokemon_cache")
    .select("pokemon_id")
    .order("pokemon_id", { ascending: false })
    .limit(1)
    .single()

  const maxId = maxCached?.pokemon_id || 0
  console.log(`  Highest cached Pokemon ID: ${maxId}`)

  const newIds: number[] = []
  let currentId = maxId + 1

  // Check for new Pokemon (stop after first failure)
  while (true) {
    try {
      await pokemonClient.getPokemonById(currentId)
      newIds.push(currentId)
      console.log(`  ✨ Found new Pokemon: ${currentId}`)
      currentId++
    } catch {
      break
    }
  }

  if (newIds.length > 0) {
    console.log(`✅ Detected ${newIds.length} new Pokemon!\n`)
  } else {
    console.log("  No new Pokemon found\n")
  }

  return newIds
}

async function getExpiredPokemon(): Promise<number[]> {
  console.log("⏰ Checking for expired cache entries...")

  const { data: expired } = await supabase
    .from("pokemon_cache")
    .select("pokemon_id, name")
    .lt("expires_at", new Date().toISOString())
    .order("pokemon_id")

  if (!expired || expired.length === 0) {
    console.log("  No expired entries found\n")
    return []
  }

  console.log(`✅ Found ${expired.length} expired Pokemon:`)
  expired.slice(0, 10).forEach((p) => console.log(`  - ${p.pokemon_id}: ${p.name}`))
  if (expired.length > 10) {
    console.log(`  ... and ${expired.length - 10} more\n`)
  }

  return expired.map((p) => p.pokemon_id)
}

async function main() {
  console.log("🔄 Pokemon Incremental Sync Job\n")
  const startTime = Date.now()

  // Create sync job record
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
    console.error("❌ Failed to create sync job")
    process.exit(1)
  }

  try {
    // Step 1: Detect new Pokemon
    const newPokemon = await detectNewPokemon()

    // Step 2: Find expired entries
    const expiredPokemon = await getExpiredPokemon()

    // Step 3: Combine and deduplicate
    const toSync = [...new Set([...newPokemon, ...expiredPokemon])]

    if (toSync.length === 0) {
      console.log("✅ Cache is up to date! Nothing to sync.\n")

      await supabase
        .from("sync_jobs")
        .update({
          status: "completed",
          pokemon_synced: 0,
          completed_at: new Date().toISOString(),
        })
        .eq("job_id", job.job_id)

      return
    }

    console.log(`📋 Total Pokemon to sync: ${toSync.length}`)
    console.log(`⏱️  Estimated time: ${Math.ceil((toSync.length * 0.1) / 60)} minutes\n`)

    // Step 4: Sync with progress tracking
    let synced = 0
    let failed = 0
    const errors: Array<{ pokemon_id: number; error: string }> = []

    for (const id of toSync) {
      process.stdout.write(`[${synced + failed + 1}/${toSync.length}] Syncing Pokemon ${id}... `)

      try {
        await getPokemonDataExtended(id, true)
        synced++
        console.log("✅")
      } catch (error) {
        failed++
        errors.push({
          pokemon_id: id,
          error: error instanceof Error ? error.message : "Unknown error",
        })
        console.log("❌")
      }

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    // Complete sync job
    const duration = Math.floor((Date.now() - startTime) / 1000)

    await supabase
      .from("sync_jobs")
      .update({
        status: failed === 0 ? "completed" : "partial",
        pokemon_synced: synced,
        pokemon_failed: failed,
        error_log: { errors },
        completed_at: new Date().toISOString(),
      })
      .eq("job_id", job.job_id)

    // Summary
    console.log("\n" + "=".repeat(60))
    console.log("🎉 Incremental Sync Complete!")
    console.log("=".repeat(60))
    console.log(`✅ Successfully synced: ${synced}`)
    console.log(`❌ Failed: ${failed}`)
    console.log(`⏱️  Duration: ${duration}s`)

    if (failed > 0) {
      console.log(`\n⚠️  Failed Pokemon:`)
      errors.forEach((e) => console.log(`  - ${e.pokemon_id}: ${e.error}`))
    }

    process.exit(failed === 0 ? 0 : 1)
  } catch (error) {
    console.error("\n❌ Sync failed:", error)

    await supabase
      .from("sync_jobs")
      .update({
        status: "failed",
        error_log: { global_error: error instanceof Error ? error.message : "Unknown error" },
        completed_at: new Date().toISOString(),
      })
      .eq("job_id", job.job_id)

    process.exit(1)
  }
}

main()
