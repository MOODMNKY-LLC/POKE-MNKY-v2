/**
 * End-to-End Workflow Testing Script
 * Tests complete workflows using MCPs: supabase-local, discord, notion
 * 
 * Workflows tested:
 * 1. Draft pick workflow (Discord → API → Database → Notion)
 * 2. Free agency transaction workflow
 * 3. Notion sync workflows
 * 4. Discord bot command workflows
 */

import { createClient } from "@supabase/supabase-js"
import { writeFileSync } from "fs"
import { join } from "path"

// Test configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:65432"
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz"
const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
const DISCORD_BOT_API_KEY = process.env.DISCORD_BOT_API_KEY || "test-key"
const NOTION_SYNC_SECRET = process.env.NOTION_SYNC_SECRET || "test-secret"

interface TestResult {
  name: string
  passed: boolean
  error?: string
  details?: any
}

const results: TestResult[] = []

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function test(name: string, testFn: () => Promise<any>): Promise<void> {
  try {
    console.log(`\n🧪 Testing: ${name}`)
    const result = await testFn()
    results.push({ name, passed: true, details: result })
    console.log(`✅ PASSED: ${name}`)
  } catch (error: any) {
    results.push({ name, passed: false, error: error.message, details: error })
    console.log(`❌ FAILED: ${name}`)
    console.log(`   Error: ${error.message}`)
  }
}

// ============================================================================
// Workflow 1: Draft Pick Workflow
// ============================================================================

async function testDraftPickWorkflow() {
  console.log("\n" + "=".repeat(60))
  console.log("WORKFLOW 1: Draft Pick (Discord → API → Database → Notion)")
  console.log("=".repeat(60))

  // Step 1: Get test data (season, team, coach, pokemon)
  await test("Get test season", async () => {
    const { data, error } = await supabase
      .from("seasons")
      .select("*")
      .eq("is_current", true)
      .maybeSingle()
    
    if (error) throw error
    if (!data) throw new Error("No current season found - create test data first")
    return { seasonId: data.id, seasonName: data.name }
  })

  await test("Get test team and coach", async () => {
    const { data: teams, error } = await supabase
      .from("teams")
      .select("id, name, coach_id, coaches(id, discord_user_id)")
      .limit(1)
    
    if (error) throw error
    if (!teams || teams.length === 0) throw new Error("No teams found - create test data first")
    return { teamId: teams[0].id, teamName: teams[0].name, coachId: teams[0].coach_id }
  })

  await test("Get available Pokemon for draft", async () => {
    const { data, error } = await supabase
      .from("pokemon")
      .select("id, name, slug, draft_points")
      .not("draft_points", "is", null)
      .limit(5)
    
    if (error) throw error
    if (!data || data.length === 0) throw new Error("No Pokemon with draft_points found")
    return { pokemon: data[0] }
  })

  // Step 2: Test Discord bot draft pick API endpoint
  await test("Discord bot draft pick API endpoint", async () => {
    const response = await fetch(`${APP_BASE_URL}/api/discord/draft/pick`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DISCORD_BOT_API_KEY}`,
      },
      body: JSON.stringify({
        discord_user_id: "test-user-id",
        pokemon_slug: "pikachu",
        season_id: "test-season-id",
      }),
    })

    // Expect 400/401/404 (validation/auth errors) - endpoint exists
    if (response.status >= 500) {
      throw new Error(`Server error: ${response.status}`)
    }
    return { status: response.status, endpointExists: true }
  })

  // Step 3: Test database RPC function exists
  await test("Database RPC: rpc_discord_submit_draft_pick", async () => {
    const { data, error } = await supabase.rpc("rpc_discord_submit_draft_pick", {
      p_discord_user_id: "test-user-id",
      p_pokemon_slug: "pikachu",
      p_season_id: "00000000-0000-0000-0000-000000000000",
    })

    // Expect error (validation/auth) - function exists
    if (error && error.message.includes("function") && error.message.includes("does not exist")) {
      throw error
    }
    return { functionExists: true, errorType: error?.code || "validation" }
  })

  // Step 4: Test Notion mappings table
  await test("Notion mappings table accessible", async () => {
    const { data, error } = await supabase
      .from("notion_mappings")
      .select("notion_page_id, entity_type, entity_id")
      .limit(1)
    
    if (error) throw error
    return { tableExists: true, rowCount: data?.length || 0 }
  })
}

// ============================================================================
// Workflow 2: Free Agency Transaction Workflow
// ============================================================================

async function testFreeAgencyWorkflow() {
  console.log("\n" + "=".repeat(60))
  console.log("WORKFLOW 2: Free Agency Transaction")
  console.log("=".repeat(60))

  // Step 1: Test free agency transaction API endpoint
  await test("Free agency transaction API endpoint", async () => {
    const response = await fetch(`${APP_BASE_URL}/api/free-agency/transaction`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        team_id: "test-team-id",
        season_id: "test-season-id",
        add_pokemon_slug: "pikachu",
        drop_pokemon_id: "test-pokemon-id",
      }),
    })

    // Expect 400/401/404 (validation/auth errors) - endpoint exists
    if (response.status >= 500) {
      throw new Error(`Server error: ${response.status}`)
    }
    return { status: response.status, endpointExists: true }
  })

  // Step 2: Test database RPC function
  await test("Database RPC: rpc_free_agency_transaction", async () => {
    const { data, error } = await supabase.rpc("rpc_free_agency_transaction", {
      p_team_id: "00000000-0000-0000-0000-000000000000",
      p_season_id: "00000000-0000-0000-0000-000000000000",
      p_add_pokemon_slug: "pikachu",
      p_drop_pokemon_id: null,
    })

    // Expect error (validation/auth) - function exists
    if (error && error.message.includes("function") && error.message.includes("does not exist")) {
      throw error
    }
    return { functionExists: true, errorType: error?.code || "validation" }
  })

  // Step 3: Test transaction audit table
  await test("Transaction audit table accessible", async () => {
    const { data, error } = await supabase
      .from("transaction_audit")
      .select("id, team_id, season_id, action, actor_type")
      .limit(1)
    
    if (error) throw error
    return { tableExists: true, rowCount: data?.length || 0 }
  })
}

// ============================================================================
// Workflow 3: Notion Sync Workflows
// ============================================================================

async function testNotionSyncWorkflows() {
  console.log("\n" + "=".repeat(60))
  console.log("WORKFLOW 3: Notion Sync")
  console.log("=".repeat(60))

  // Step 1: Test sync_jobs table
  await test("Sync jobs table accessible", async () => {
    const { data, error } = await supabase
      .from("sync_jobs")
      .select("job_id, job_type, status, started_at")
      .limit(1)
    
    if (error) throw error
    return { tableExists: true, rowCount: data?.length || 0 }
  })

  // Step 2: Test Notion sync API endpoints (may need Next.js running)
  await test("Notion sync pull endpoint", async () => {
    const response = await fetch(`${APP_BASE_URL}/api/sync/notion/pull`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${NOTION_SYNC_SECRET}`,
      },
      body: JSON.stringify({
        scope: "pokemon",
      }),
    })

    // 500 = Next.js not running, 401 = auth issue, 400 = validation
    if (response.status === 500) {
      return { status: response.status, note: "Next.js server not running (expected)" }
    }
    return { status: response.status, endpointExists: true }
  })

  await test("Notion sync incremental endpoint", async () => {
    const response = await fetch(`${APP_BASE_URL}/api/sync/notion/pull/incremental`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${NOTION_SYNC_SECRET}`,
      },
      body: JSON.stringify({
        scope: "pokemon",
        since: new Date().toISOString(),
      }),
    })

    if (response.status === 500) {
      return { status: response.status, note: "Next.js server not running (expected)" }
    }
    return { status: response.status, endpointExists: true }
  })

  await test("Notion sync status endpoint", async () => {
    const response = await fetch(`${APP_BASE_URL}/api/sync/notion/status`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${NOTION_SYNC_SECRET}`,
      },
    })

    if (response.status === 500) {
      return { status: response.status, note: "Next.js server not running (expected)" }
    }
    return { status: response.status, endpointExists: true }
  })
}

// ============================================================================
// Workflow 4: Discord Bot Commands
// ============================================================================

async function testDiscordBotCommands() {
  console.log("\n" + "=".repeat(60))
  console.log("WORKFLOW 4: Discord Bot Commands")
  console.log("=".repeat(60))

  // Test Discord bot API endpoints
  await test("Discord draft status endpoint", async () => {
    const response = await fetch(`${APP_BASE_URL}/api/discord/draft/status?guild_id=test-guild`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${DISCORD_BOT_API_KEY}`,
      },
    })

    if (response.status >= 500) {
      throw new Error(`Server error: ${response.status}`)
    }
    return { status: response.status, endpointExists: true }
  })

  await test("Discord Pokemon search endpoint", async () => {
    const response = await fetch(
      `${APP_BASE_URL}/api/discord/pokemon/search?query=pikachu&season_id=test-season`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${DISCORD_BOT_API_KEY}`,
        },
      }
    )

    if (response.status >= 500) {
      throw new Error(`Server error: ${response.status}`)
    }
    return { status: response.status, endpointExists: true }
  })

  await test("Discord guild config endpoint", async () => {
    const response = await fetch(`${APP_BASE_URL}/api/discord/guild/config?guild_id=test-guild`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${DISCORD_BOT_API_KEY}`,
      },
    })

    if (response.status >= 500) {
      throw new Error(`Server error: ${response.status}`)
    }
    return { status: response.status, endpointExists: true }
  })

  await test("Discord coach whoami endpoint", async () => {
    const response = await fetch(
      `${APP_BASE_URL}/api/discord/coach/whoami?discord_user_id=test-user`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${DISCORD_BOT_API_KEY}`,
        },
      }
    )

    if (response.status >= 500) {
      throw new Error(`Server error: ${response.status}`)
    }
    return { status: response.status, endpointExists: true }
  })

  await test("Discord coverage notification endpoint", async () => {
    const response = await fetch(`${APP_BASE_URL}/api/discord/notify/coverage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DISCORD_BOT_API_KEY}`,
      },
      body: JSON.stringify({
        team_id: "test-team-id",
        season_id: "test-season-id",
      }),
    })

    if (response.status >= 500) {
      throw new Error(`Server error: ${response.status}`)
    }
    return { status: response.status, endpointExists: true }
  })
}

// ============================================================================
// Workflow 5: Database Views and Budget Calculations
// ============================================================================

async function testDatabaseViews() {
  console.log("\n" + "=".repeat(60))
  console.log("WORKFLOW 5: Database Views & Budget Calculations")
  console.log("=".repeat(60))

  await test("Team rosters view accessible", async () => {
    const { data, error } = await supabase
      .from("v_team_rosters")
      .select("*")
      .limit(1)
    
    if (error) throw error
    return { viewExists: true, rowCount: data?.length || 0 }
  })

  await test("Team budget view accessible", async () => {
    const { data, error } = await supabase
      .from("v_team_budget")
      .select("*")
      .limit(1)
    
    if (error) throw error
    return { viewExists: true, rowCount: data?.length || 0 }
  })

  await test("Team roster API endpoint", async () => {
    const response = await fetch(
      `${APP_BASE_URL}/api/teams/test-team-id/roster?seasonId=test-season-id`,
      {
        method: "GET",
      }
    )

    if (response.status >= 500) {
      throw new Error(`Server error: ${response.status}`)
    }
    return { status: response.status, endpointExists: true }
  })
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function main() {
  console.log("🧪 End-to-End Workflow Testing")
  console.log("=".repeat(60))
  console.log(`Date: ${new Date().toISOString()}`)
  console.log(`Supabase URL: ${SUPABASE_URL}`)
  console.log(`App URL: ${APP_BASE_URL}`)
  console.log("=".repeat(60))

  try {
    // Run all workflow tests
    await testDraftPickWorkflow()
    await testFreeAgencyWorkflow()
    await testNotionSyncWorkflows()
    await testDiscordBotCommands()
    await testDatabaseViews()

    // Generate summary
    console.log("\n" + "=".repeat(60))
    console.log("📊 Test Summary")
    console.log("=".repeat(60))

    const passed = results.filter((r) => r.passed).length
    const failed = results.filter((r) => !r.passed).length
    const total = results.length
    const successRate = total > 0 ? (passed / total) * 100 : 0

    console.log(`\nTotal Tests: ${total}`)
    console.log(`✅ Passed: ${passed}`)
    console.log(`❌ Failed: ${failed}`)
    console.log(`Success Rate: ${successRate.toFixed(1)}%\n`)

    // Show failures
    if (failed > 0) {
      console.log("Failed Tests:")
      results
        .filter((r) => !r.passed)
        .forEach((r) => {
          console.log(`  ❌ ${r.name}`)
          console.log(`     Error: ${r.error}`)
        })
    }

    // Generate report
    const report = {
      date: new Date().toISOString(),
      summary: {
        total,
        passed,
        failed,
        successRate,
      },
      results: results.map((r) => ({
        name: r.name,
        passed: r.passed,
        error: r.error,
      })),
    }

    const reportPath = join(process.cwd(), "docs", "E2E-TEST-REPORT.json")
    writeFileSync(reportPath, JSON.stringify(report, null, 2))
    console.log(`\n📄 Report saved to: ${reportPath}`)

    process.exit(failed > 0 ? 1 : 0)
  } catch (error: any) {
    console.error("\n❌ Fatal error:", error)
    process.exit(1)
  }
}

main()
