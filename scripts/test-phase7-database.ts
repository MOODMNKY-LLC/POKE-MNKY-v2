/**
 * Phase 7.1: Database Testing Script
 * Tests RPC functions, RLS policies, views, and helper functions
 */

import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:65432"
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz"

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

async function testHelperFunctions() {
  console.log("\n📋 Testing Helper Functions...\n")

  // Test is_coach_of_team (takes only p_team_id)
  try {
    const { data, error } = await supabase.rpc("is_coach_of_team", {
      p_team_id: "00000000-0000-0000-0000-000000000000",
    })
    // Function exists if no "function not found" error
    const exists = !error || !error.message?.includes("Could not find the function")
    logTest("is_coach_of_team() exists and callable", exists, exists ? undefined : error?.message, data)
  } catch (error: any) {
    const exists = !error.message?.includes("Could not find the function")
    logTest("is_coach_of_team() exists and callable", exists, exists ? undefined : error.message)
  }

  // Test is_admin (takes no parameters)
  try {
    const { data, error } = await supabase.rpc("is_admin", {})
    const exists = !error || !error.message?.includes("Could not find the function")
    logTest("is_admin() exists and callable", exists, exists ? undefined : error?.message, data)
  } catch (error: any) {
    const exists = !error.message?.includes("Could not find the function")
    logTest("is_admin() exists and callable", exists, exists ? undefined : error.message)
  }

  // Test sha256_hex (parameter is p, not p_input)
  try {
    const { data, error } = await supabase.rpc("sha256_hex", {
      p: "test",
    })
    const exists = !error || !error.message?.includes("Could not find the function")
    logTest("sha256_hex() exists and callable", exists, exists ? undefined : error?.message, {
      result: data,
      expectedHash: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    })
  } catch (error: any) {
    const exists = !error.message?.includes("Could not find the function")
    logTest("sha256_hex() exists and callable", exists, exists ? undefined : error.message)
  }

  // Test is_valid_api_key (takes p_plaintext and p_scope)
  try {
    const { data, error } = await supabase.rpc("is_valid_api_key", {
      p_plaintext: "test_key",
      p_scope: "draft:submit",
    })
    const exists = !error || !error.message?.includes("Could not find the function")
    logTest("is_valid_api_key() exists and callable", exists, exists ? undefined : error?.message, data)
  } catch (error: any) {
    const exists = !error.message?.includes("Could not find the function")
    logTest("is_valid_api_key() exists and callable", exists, exists ? undefined : error.message)
  }
}

async function testViews() {
  console.log("\n📋 Testing Database Views...\n")

  // Test v_team_rosters
  try {
    const { data, error } = await supabase.from("v_team_rosters").select("*").limit(1)
    logTest("v_team_rosters view exists and queryable", !error, error?.message, {
      rowCount: data?.length || 0,
    })
  } catch (error: any) {
    logTest("v_team_rosters view exists and queryable", false, error.message)
  }

  // Test v_team_budget
  try {
    const { data, error } = await supabase.from("v_team_budget").select("*").limit(1)
    logTest("v_team_budget view exists and queryable", !error, error?.message, {
      rowCount: data?.length || 0,
    })
  } catch (error: any) {
    logTest("v_team_budget view exists and queryable", false, error.message)
  }
}

async function testRPCFunctions() {
  console.log("\n📋 Testing RPC Functions...\n")

  // Test rpc_submit_draft_pick (will fail without valid data, but should exist)
  try {
    const { data, error } = await supabase.rpc("rpc_submit_draft_pick", {
      p_season_id: "00000000-0000-0000-0000-000000000000",
      p_team_id: "00000000-0000-0000-0000-000000000000",
      p_pokemon_id: "00000000-0000-0000-0000-000000000000",
      p_acquisition: "draft",
    })
    // We expect an error (invalid data or FORBIDDEN), but function should exist
    const exists =
      error?.message?.includes("FORBIDDEN") ||
      error?.message?.includes("SEASON_NOT_FOUND") ||
      error?.message?.includes("TEAM_NOT_FOUND") ||
      error?.message?.includes("POKEMON_POINTS_MISSING")
    logTest("rpc_submit_draft_pick() exists", exists, exists ? undefined : error?.message)
  } catch (error: any) {
    const exists = !error.message?.includes("Could not find the function")
    logTest("rpc_submit_draft_pick() exists", exists, exists ? undefined : error.message)
  }

  // Test rpc_free_agency_transaction
  try {
    const { data, error } = await supabase.rpc("rpc_free_agency_transaction", {
      p_season_id: "00000000-0000-0000-0000-000000000000",
      p_team_id: "00000000-0000-0000-0000-000000000000",
      p_drop_pokemon_id: "00000000-0000-0000-0000-000000000000",
      p_add_pokemon_id: "00000000-0000-0000-0000-000000000000",
    })
    const exists =
      error?.message?.includes("FORBIDDEN") ||
      error?.message?.includes("SEASON_NOT_FOUND") ||
      error?.message?.includes("TEAM_NOT_FOUND")
    logTest("rpc_free_agency_transaction() exists", exists, exists ? undefined : error?.message)
  } catch (error: any) {
    const exists = !error.message?.includes("Could not find the function")
    logTest("rpc_free_agency_transaction() exists", exists, exists ? undefined : error.message)
  }

  // Test rpc_discord_submit_draft_pick
  try {
    const { data, error } = await supabase.rpc("rpc_discord_submit_draft_pick", {
      p_bot_key: "test",
      p_season_id: "00000000-0000-0000-0000-000000000000",
      p_discord_user_id: "test",
      p_pokemon_id: "00000000-0000-0000-0000-000000000000",
    })
    const exists =
      error?.message?.includes("BOT_UNAUTHORIZED") ||
      error?.message?.includes("SEASON_NOT_FOUND") ||
      error?.message?.includes("COACH_NOT_FOUND")
    logTest("rpc_discord_submit_draft_pick() exists", exists, exists ? undefined : error?.message)
  } catch (error: any) {
    logTest("rpc_discord_submit_draft_pick() exists", false, error.message)
  }
}

async function testTables() {
  console.log("\n📋 Testing Required Tables...\n")

  const requiredTables = [
    "pokemon",
    "role_tags",
    "moves",
    "pokemon_role_tags",
    "draft_picks",
    "draft_pools",
    "draft_pool_pokemon",
    "coaches",
    "teams",
    "seasons",
    "discord_guild_config",
    "transaction_audit",
    "notion_mappings",
    "api_keys",
  ]

  for (const table of requiredTables) {
    try {
      const { data, error } = await supabase.from(table).select("*").limit(1)
      logTest(`Table ${table} exists`, !error, error?.message, {
        rowCount: data?.length || 0,
      })
    } catch (error: any) {
      logTest(`Table ${table} exists`, false, error.message)
    }
  }
}

async function main() {
  console.log("🧪 Phase 7.1: Database Testing\n")
  console.log(`Connecting to: ${SUPABASE_URL}\n`)

  await testTables()
  await testHelperFunctions()
  await testViews()
  await testRPCFunctions()

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
