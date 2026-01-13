/**
 * Queue System Activation Script
 * 
 * Activates the pokepedia queue-based sync system by:
 * 1. Verifying queues exist
 * 2. Deploying Edge Functions (manual step - outputs commands)
 * 3. Configuring cron jobs
 * 4. Testing the system
 * 
 * Usage:
 *   tsx --env-file=.env.local scripts/activate-queue-system.ts
 */

import { createServiceRoleClient } from "@/lib/supabase/service"

interface QueueCheck {
  queueName: string
  exists: boolean
  messageCount?: number
}

interface EdgeFunctionStatus {
  name: string
  deployed: boolean
  url: string
}

/**
 * Check if pgmq queues exist
 */
async function checkQueues(supabase: any): Promise<QueueCheck[]> {
  const queues = ["pokepedia_ingest", "pokepedia_sprites"]
  const results: QueueCheck[] = []

  for (const queueName of queues) {
    try {
      // Try to get metrics - if queue doesn't exist, this will fail
      const { data, error } = await supabase.rpc("pgmq_public.metrics", {
        queue_name: queueName,
      })

      if (error) {
        results.push({ queueName, exists: false })
      } else {
        results.push({
          queueName,
          exists: true,
          messageCount: data?.queue_length || 0,
        })
      }
    } catch (error) {
      results.push({ queueName, exists: false })
    }
  }

  return results
}

/**
 * Test Edge Function accessibility
 */
async function testEdgeFunction(url: string, serviceRoleKey: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({}),
    })

    // Even if it returns an error, if we get a response, the function is deployed
    return response.status !== 404
  } catch (error) {
    return false
  }
}

/**
 * Get Edge Function URLs
 */
function getEdgeFunctionUrls(supabaseUrl: string): EdgeFunctionStatus[] {
  const functions = [
    { name: "pokepedia-seed", path: "/functions/v1/pokepedia-seed" },
    { name: "pokepedia-worker", path: "/functions/v1/pokepedia-worker" },
    { name: "pokepedia-sprite-worker", path: "/functions/v1/pokepedia-sprite-worker" },
  ]

  return functions.map((fn) => ({
    name: fn.name,
    deployed: false, // Will be checked
    url: `${supabaseUrl}${fn.path}`,
  }))
}

/**
 * Main activation check
 */
async function main() {
  console.log("=".repeat(70))
  console.log("🔧 Pokepedia Queue System Activation Check")
  console.log("=".repeat(70))
  console.log("")

  const supabase = createServiceRoleClient()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  // 1. Check queues
  console.log("📋 Step 1: Checking pgmq queues...")
  const queueChecks = await checkQueues(supabase)
  
  for (const check of queueChecks) {
    if (check.exists) {
      console.log(`   ✅ Queue '${check.queueName}' exists (${check.messageCount || 0} messages)`)
    } else {
      console.log(`   ❌ Queue '${check.queueName}' does NOT exist`)
      console.log(`      Run: SELECT pgmq.create('${check.queueName}');`)
    }
  }
  console.log("")

  // 2. Check Edge Functions
  console.log("📋 Step 2: Checking Edge Functions...")
  const functions = getEdgeFunctionUrls(supabaseUrl)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  for (const fn of functions) {
    const deployed = await testEdgeFunction(fn.url, serviceRoleKey)
    fn.deployed = deployed
    
    if (deployed) {
      console.log(`   ✅ ${fn.name} is deployed`)
    } else {
      console.log(`   ❌ ${fn.name} is NOT deployed`)
      console.log(`      Deploy with: supabase functions deploy ${fn.name}`)
    }
  }
  console.log("")

  // 3. Check database tables
  console.log("📋 Step 3: Checking database tables...")
  const requiredTables = [
    "pokeapi_resources",
    "pokepedia_pokemon",
    "pokepedia_assets",
  ]

  for (const tableName of requiredTables) {
    const { data, error } = await supabase
      .from(tableName)
      .select("id")
      .limit(1)

    if (error && error.code === "42P01") {
      console.log(`   ❌ Table '${tableName}' does NOT exist`)
    } else {
      console.log(`   ✅ Table '${tableName}' exists`)
    }
  }
  console.log("")

  // 4. Check helper functions
  console.log("📋 Step 4: Checking helper functions...")
  const helperFunctions = [
    "get_pokepedia_queue_stats",
    "get_pokepedia_sync_progress",
    "get_pokepedia_cron_status",
  ]

  for (const funcName of helperFunctions) {
    try {
      const { error } = await supabase.rpc(funcName)
      // If function doesn't exist, we'll get a specific error
      if (error && error.message?.includes("does not exist")) {
        console.log(`   ❌ Function '${funcName}' does NOT exist`)
      } else {
        console.log(`   ✅ Function '${funcName}' exists`)
      }
    } catch (error) {
      console.log(`   ❌ Function '${funcName}' does NOT exist`)
    }
  }
  console.log("")

  // 5. Summary and next steps
  console.log("=".repeat(70))
  console.log("📊 Activation Summary")
  console.log("=".repeat(70))

  const allQueuesExist = queueChecks.every((q) => q.exists)
  const allFunctionsDeployed = functions.every((f) => f.deployed)

  if (allQueuesExist && allFunctionsDeployed) {
    console.log("✅ System is ready for activation!")
    console.log("")
    console.log("Next steps:")
    console.log("1. Configure cron jobs (see scripts/activate-queue-system.md)")
    console.log("2. Run seed: POST /functions/v1/pokepedia-seed")
    console.log("3. Monitor queues in admin dashboard: /admin")
  } else {
    console.log("⚠️  System needs setup:")
    console.log("")
    
    if (!allQueuesExist) {
      console.log("Missing queues - run migration:")
      console.log("  supabase db push")
    }
    
    if (!allFunctionsDeployed) {
      console.log("Missing Edge Functions - deploy with:")
      for (const fn of functions.filter((f) => !f.deployed)) {
        console.log(`  supabase functions deploy ${fn.name}`)
      }
    }
  }
  console.log("")
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error)
    process.exit(1)
  })
}

export { main as activateQueueSystem }
