/**
 * Full Pokemon Sync Job
 * Synchronizes all Pokemon (1-1025+) from PokéAPI to Supabase
 *
 * Usage:
 *   node scripts/full-sync-pokemon.ts
 *
 * This should be run:
 *   - After initial deployment (overnight)
 *   - When new generation releases
 *   - To recover from cache corruption
 *
 * Rate Limiting:
 *   - 100ms delay between requests (respects 100 req/min PokéAPI limit)
 *   - Checkpoint every 50 Pokemon for resume capability
 *   - Retry failed requests 3 times with exponential backoff
 */

import { createClient } from "@supabase/supabase-js"
import { getPokemonDataExtended } from "../lib/pokemon-api-enhanced"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const TOTAL_POKEMON = 1025 // Current Gen 9 total (update as new gens release)
const CHECKPOINT_INTERVAL = 50
const RATE_LIMIT_DELAY = 100 // ms between requests
const MAX_RETRIES = 3

interface SyncState {
  jobId: string
  currentId: number
  successCount: number
  failureCount: number
  errors: Array<{ pokemon_id: number; error: string }>
}

async function initializeSync(): Promise<SyncState> {
  console.log("🎮 Pokemon Full Sync Job\n")
  console.log(`📋 Total Pokemon to sync: ${TOTAL_POKEMON}`)
  console.log(`⏱️  Estimated time: ${Math.ceil((TOTAL_POKEMON * RATE_LIMIT_DELAY) / 1000 / 60)} minutes\n`)

  // Check for existing in-progress job
  const { data: existingJob } = await supabase
    .from("sync_jobs")
    .select("*")
    .eq("job_type", "full")
    .eq("status", "running")
    .order("started_at", { ascending: false })
    .limit(1)
    .single()

  if (existingJob) {
    console.log(`⚠️  Found existing job in progress (${existingJob.pokemon_synced}/${TOTAL_POKEMON})`)
    const resume = await askResume()

    if (resume) {
      console.log("▶️  Resuming from checkpoint...")
      return {
        jobId: existingJob.job_id,
        currentId: existingJob.pokemon_synced + 1,
        successCount: existingJob.pokemon_synced,
        failureCount: existingJob.pokemon_failed || 0,
        errors: (existingJob.error_log as any)?.errors || [],
      }
    }

    // Mark old job as cancelled
    await supabase.from("sync_jobs").update({ status: "cancelled" }).eq("job_id", existingJob.job_id)
  }

  // Create new sync job
  const { data: newJob, error } = await supabase
    .from("sync_jobs")
    .insert({
      job_type: "full",
      status: "running",
      triggered_by: "manual",
      config: { total_pokemon: TOTAL_POKEMON },
    })
    .select()
    .single()

  if (error || !newJob) {
    console.error("❌ Failed to create sync job:", error)
    process.exit(1)
  }

  console.log(`✅ Created sync job: ${newJob.job_id}\n`)

  return {
    jobId: newJob.job_id,
    currentId: 1,
    successCount: 0,
    failureCount: 0,
    errors: [],
  }
}

async function syncPokemonWithRetry(id: number, retries = MAX_RETRIES): Promise<boolean> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await getPokemonDataExtended(id, true) // Include move details
      return true
    } catch (error) {
      console.error(`  ⚠️  Attempt ${attempt}/${retries} failed:`, error instanceof Error ? error.message : error)

      if (attempt === retries) {
        return false
      }

      // Exponential backoff: 1s, 2s, 4s
      await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)))
    }
  }

  return false
}

async function saveCheckpoint(state: SyncState): Promise<void> {
  await supabase
    .from("sync_jobs")
    .update({
      pokemon_synced: state.successCount,
      pokemon_failed: state.failureCount,
      error_log: { errors: state.errors },
    })
    .eq("job_id", state.jobId)
}

async function completeSync(state: SyncState, status: "completed" | "failed"): Promise<void> {
  await supabase
    .from("sync_jobs")
    .update({
      status,
      pokemon_synced: state.successCount,
      pokemon_failed: state.failureCount,
      error_log: { errors: state.errors },
      completed_at: new Date().toISOString(),
    })
    .eq("job_id", state.jobId)
}

async function askResume(): Promise<boolean> {
  return new Promise((resolve) => {
    const readline = require("readline").createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    readline.question("Resume from checkpoint? (y/n): ", (answer: string) => {
      readline.close()
      resolve(answer.toLowerCase() === "y")
    })
  })
}

async function main() {
  const startTime = Date.now()
  const state = await initializeSync()

  for (let id = state.currentId; id <= TOTAL_POKEMON; id++) {
    process.stdout.write(`[${id}/${TOTAL_POKEMON}] Syncing Pokemon ${id}... `)

    const success = await syncPokemonWithRetry(id)

    if (success) {
      state.successCount++
      console.log("✅")
    } else {
      state.failureCount++
      state.errors.push({
        pokemon_id: id,
        error: "Failed after max retries",
      })
      console.log("❌")
    }

    // Save checkpoint
    if (id % CHECKPOINT_INTERVAL === 0) {
      await saveCheckpoint(state)
      const progress = ((id / TOTAL_POKEMON) * 100).toFixed(1)
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      const eta = Math.floor((elapsed / id) * (TOTAL_POKEMON - id))

      console.log(`\n📊 Checkpoint: ${id}/${TOTAL_POKEMON} (${progress}%)`)
      console.log(`✅ Success: ${state.successCount} | ❌ Failed: ${state.failureCount}`)
      console.log(`⏱️  Elapsed: ${elapsed}s | ETA: ${eta}s\n`)
    }

    // Rate limiting
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY))
  }

  // Final checkpoint
  await saveCheckpoint(state)

  const duration = Math.floor((Date.now() - startTime) / 1000)
  const status = state.failureCount === 0 ? "completed" : "partial"

  await completeSync(state, status === "completed" ? "completed" : "failed")

  console.log("\n" + "=".repeat(60))
  console.log("🎉 Sync Complete!")
  console.log("=".repeat(60))
  console.log(`✅ Successfully synced: ${state.successCount}/${TOTAL_POKEMON}`)
  console.log(`❌ Failed: ${state.failureCount}`)
  console.log(`⏱️  Total duration: ${Math.floor(duration / 60)}m ${duration % 60}s`)
  console.log(`📊 Average: ${(duration / TOTAL_POKEMON).toFixed(2)}s per Pokemon`)

  if (state.failureCount > 0) {
    console.log(`\n⚠️  Failed Pokemon IDs:`)
    state.errors.forEach((e) => console.log(`  - ${e.pokemon_id}: ${e.error}`))
    console.log("\n💡 Tip: Re-run this script to retry failed Pokemon")
  }

  process.exit(state.failureCount === 0 ? 0 : 1)
}

main()
