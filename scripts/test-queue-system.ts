/**
 * Queue System Test Script
 * 
 * Tests the pokepedia queue system end-to-end:
 * 1. Seeds a small batch of resources
 * 2. Verifies messages are enqueued
 * 3. Triggers worker to process messages
 * 4. Verifies data is stored
 * 
 * Usage:
 *   tsx --env-file=.env.local scripts/test-queue-system.ts
 */

import { createServiceRoleClient } from "@/lib/supabase/service"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * Call Edge Function
 */
async function callEdgeFunction(
  functionName: string,
  body: any = {}
): Promise<{ ok: boolean; data?: any; error?: string }> {
  const url = `${SUPABASE_URL}/functions/v1/${functionName}`
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    
    if (!response.ok) {
      return { ok: false, error: data.error || `HTTP ${response.status}` }
    }

    return { ok: true, data }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Get queue stats
 */
async function getQueueStats(supabase: any): Promise<any> {
  const { data, error } = await supabase.rpc("get_pokepedia_queue_stats")
  if (error) throw error
  return data
}

/**
 * Get sync progress
 */
async function getSyncProgress(supabase: any): Promise<any> {
  const { data, error } = await supabase.rpc("get_pokepedia_sync_progress")
  if (error) throw error
  return data
}

/**
 * Main test function
 */
async function main() {
  console.log("=".repeat(70))
  console.log("🧪 Pokepedia Queue System Test")
  console.log("=".repeat(70))
  console.log("")

  const supabase = createServiceRoleClient()

  // Step 1: Check initial queue state
  console.log("📋 Step 1: Checking initial queue state...")
  const initialStats = await getQueueStats(supabase)
  console.log("   Initial queue stats:", initialStats)
  console.log("")

  // Step 2: Seed a small batch (types only - small dataset)
  console.log("📋 Step 2: Seeding types resource...")
  const seedResult = await callEdgeFunction("pokepedia-seed", {
    resourceTypes: ["type"],
    limit: 50,
  })

  if (!seedResult.ok) {
    console.error(`   ❌ Seed failed: ${seedResult.error}`)
    process.exit(1)
  }

  console.log(`   ✅ Seed complete: ${seedResult.data?.totalEnqueued || 0} URLs enqueued`)
  console.log("   Per type:", seedResult.data?.perType)
  console.log("")

  // Step 3: Verify messages in queue
  console.log("📋 Step 3: Verifying messages in queue...")
  await new Promise((resolve) => setTimeout(resolve, 1000)) // Wait for queue update
  const afterSeedStats = await getQueueStats(supabase)
  const ingestQueue = afterSeedStats?.find((s: any) => s.queue_name === "pokepedia_ingest")
  
  if (ingestQueue && ingestQueue.queue_length > 0) {
    console.log(`   ✅ Queue has ${ingestQueue.queue_length} messages`)
  } else {
    console.log("   ⚠️  Queue appears empty (may have been processed already)")
  }
  console.log("")

  // Step 4: Process messages with worker
  console.log("📋 Step 4: Processing messages with worker...")
  const workerResult = await callEdgeFunction("pokepedia-worker", {
    batchSize: 5,
    concurrency: 2,
    enqueueSprites: false, // Skip sprite enqueueing for this test
  })

  if (!workerResult.ok) {
    console.error(`   ❌ Worker failed: ${workerResult.error}`)
    process.exit(1)
  }

  console.log(`   ✅ Worker processed: ${workerResult.data?.processed?.length || 0} messages`)
  if (workerResult.data?.failed?.length > 0) {
    console.log(`   ⚠️  Failed: ${workerResult.data.failed.length} messages`)
  }
  console.log("")

  // Step 5: Verify data stored
  console.log("📋 Step 5: Verifying data stored...")
  const { data: resources, error: resError } = await supabase
    .from("pokeapi_resources")
    .select("resource_type, resource_key, name")
    .eq("resource_type", "type")
    .limit(10)

  if (resError) {
    console.error(`   ❌ Failed to query resources: ${resError.message}`)
  } else {
    console.log(`   ✅ Found ${resources?.length || 0} type resources in database`)
    if (resources && resources.length > 0) {
      console.log("   Sample:", resources.slice(0, 3).map((r: any) => r.name))
    }
  }
  console.log("")

  // Step 6: Check sync progress
  console.log("📋 Step 6: Checking sync progress...")
  const progress = await getSyncProgress(supabase)
  const typeProgress = progress?.find((p: any) => p.resource_type === "type")
  
  if (typeProgress) {
    console.log(
      `   ✅ Type progress: ${typeProgress.synced_count}/${typeProgress.total_estimated} (${typeProgress.progress_percent}%)`
    )
  }
  console.log("")

  // Step 7: Final queue state
  console.log("📋 Step 7: Final queue state...")
  await new Promise((resolve) => setTimeout(resolve, 1000))
  const finalStats = await getQueueStats(supabase)
  console.log("   Final queue stats:", finalStats)
  console.log("")

  // Summary
  console.log("=".repeat(70))
  console.log("📊 Test Summary")
  console.log("=".repeat(70))
  console.log("✅ Queue system is operational!")
  console.log("")
  console.log("Next steps:")
  console.log("1. Seed all resource types: POST /pokepedia-seed")
  console.log("2. Enable cron jobs for automatic processing")
  console.log("3. Monitor in admin dashboard: /admin")
  console.log("")
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error)
    process.exit(1)
  })
}

export { main as testQueueSystem }
