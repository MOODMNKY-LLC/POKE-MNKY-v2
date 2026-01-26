/**
 * Phase 7.4: Notion Integration Testing Script
 * Tests Notion database schemas and sync functionality
 */

import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:65432"
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz"
const NOTION_SYNC_SECRET = process.env.NOTION_SYNC_SECRET || "test_secret"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

interface TestResult {
  test: string
  passed: boolean
  error?: string
  details?: any
}

const results: TestResult[] = []

function logTest(test: string, passed: boolean, error?: string, details?: any) {
  results.push({ test, passed, error, details })
  const status = passed ? "✅" : "❌"
  console.log(`${status} ${test}`)
  if (error) console.log(`   Error: ${error}`)
  if (details) console.log(`   Details:`, JSON.stringify(details, null, 2))
}

async function testNotionSyncEndpoints() {
  console.log("\n📋 Testing Notion Sync API Endpoints...\n")

  // Test full pull endpoint (will fail without auth)
  const result1 = await fetch(`${APP_URL}/api/sync/notion/pull`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ scope: ["pokemon"] }),
  })
  const data1 = await result1.json().catch(() => ({ error: result1.statusText }))
  logTest("POST /api/sync/notion/pull (no auth)", result1.status === 401, data1.error)

  // Test with auth
  const result2 = await fetch(`${APP_URL}/api/sync/notion/pull`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${NOTION_SYNC_SECRET}`,
    },
    body: JSON.stringify({ scope: ["pokemon"], dryRun: true }),
  })
  const data2 = await result2.json().catch(() => ({ error: result2.statusText }))
  logTest("POST /api/sync/notion/pull (with auth, dry-run)", result2.ok || result2.status === 200, data2.error, {
    status: result2.status,
  })

  // Test incremental pull
  const result3 = await fetch(`${APP_URL}/api/sync/notion/pull/incremental`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${NOTION_SYNC_SECRET}`,
    },
    body: JSON.stringify({ scope: ["pokemon"], since: new Date().toISOString(), dryRun: true }),
  })
  const data3 = await result3.json().catch(() => ({ error: result3.statusText }))
  logTest("POST /api/sync/notion/pull/incremental (with auth, dry-run)", result3.ok || result3.status === 200, data3.error, {
    status: result3.status,
  })

  // Test status endpoint
  const result4 = await fetch(`${APP_URL}/api/sync/notion/status`, {
    headers: {
      Authorization: `Bearer ${NOTION_SYNC_SECRET}`,
    },
  })
  const data4 = await result4.json().catch(() => ({ error: result4.statusText }))
  logTest("GET /api/sync/notion/status (with auth)", result4.ok || result4.status === 200, data4.error, {
    status: result4.status,
  })
}

async function testNotionMappingsTable() {
  console.log("\n📋 Testing Notion Mappings Table...\n")

  // Test table exists and is queryable
  try {
    const { data, error } = await supabase.from("notion_mappings").select("*").limit(1)
    logTest("notion_mappings table exists and queryable", !error, error?.message, {
      rowCount: data?.length || 0,
    })
  } catch (error: any) {
    logTest("notion_mappings table exists and queryable", false, error.message)
  }

  // Test required columns exist
  const requiredColumns = ["notion_page_id", "entity_type", "entity_id"]
  for (const column of requiredColumns) {
    try {
      const { error } = await supabase.from("notion_mappings").select(column).limit(1)
      logTest(`notion_mappings.${column} column exists`, !error, error?.message)
    } catch (error: any) {
      logTest(`notion_mappings.${column} column exists`, false, error.message)
    }
  }
}

async function testSyncJobsTable() {
  console.log("\n📋 Testing Sync Jobs Table...\n")

  // Test table exists
  try {
    const { data, error } = await supabase.from("sync_jobs").select("*").limit(1)
    logTest("sync_jobs table exists and queryable", !error, error?.message, {
      rowCount: data?.length || 0,
    })
  } catch (error: any) {
    logTest("sync_jobs table exists and queryable", false, error.message)
  }
}

async function main() {
  console.log("🧪 Phase 7.4: Notion Integration Testing\n")
  console.log(`Testing API at: ${APP_URL}\n`)

  await testNotionMappingsTable()
  await testSyncJobsTable()
  await testNotionSyncEndpoints()

  console.log("\n" + "=".repeat(60))
  console.log("📊 Test Summary")
  console.log("=".repeat(60))

  const passed = results.filter((r) => r.passed).length
  const failed = results.filter((r) => !r.passed).length
  const total = results.length

  console.log(`\nTotal Tests: ${total}`)
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`)

  if (failed > 0) {
    console.log("Failed Tests:")
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  ❌ ${r.test}`)
        if (r.error) console.log(`     Error: ${r.error}`)
      })
  }

  process.exit(failed > 0 ? 1 : 0)
}

main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
