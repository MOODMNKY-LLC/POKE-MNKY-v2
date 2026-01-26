/**
 * Phase 7.2: API Endpoint Testing Script
 * Tests all API endpoints with validation, auth, error handling
 */

import { createClient } from "@supabase/supabase-js"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
const BOT_API_KEY = process.env.DISCORD_BOT_API_KEY || "test_bot_key"

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

async function testEndpoint(
  method: string,
  path: string,
  body?: any,
  headers?: Record<string, string>
): Promise<{ ok: boolean; status: number; data?: any; error?: string }> {
  try {
    const response = await fetch(`${APP_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    const data = await response.json().catch(() => ({ error: response.statusText }))
    return {
      ok: response.ok,
      status: response.status,
      data,
      error: data.error || response.statusText,
    }
  } catch (error: any) {
    return {
      ok: false,
      status: 0,
      error: error.message,
    }
  }
}

async function testPokemonSearchEndpoint() {
  console.log("\n📋 Testing GET /api/pokemon...\n")

  // Test basic search
  const result1 = await testEndpoint("GET", "/api/pokemon?limit=5")
  logTest("GET /api/pokemon (basic)", result1.ok || result1.status === 200, result1.error, {
    status: result1.status,
    resultCount: result1.data?.results?.length || 0,
  })

  // Test with filters
  const result2 = await testEndpoint("GET", "/api/pokemon?points_lte=15&type1=fire&limit=5")
  logTest("GET /api/pokemon (with filters)", result2.ok || result2.status === 200, result2.error, {
    status: result2.status,
  })
}

async function testTeamRosterEndpoint() {
  console.log("\n📋 Testing GET /api/teams/{teamId}/roster...\n")

  // Test without seasonId (should fail)
  const result1 = await testEndpoint("GET", "/api/teams/00000000-0000-0000-0000-000000000000/roster")
  logTest("GET /api/teams/{teamId}/roster (missing seasonId)", result1.status === 400, result1.error)

  // Test with seasonId
  const result2 = await testEndpoint(
    "GET",
    "/api/teams/00000000-0000-0000-0000-000000000000/roster?seasonId=00000000-0000-0000-0000-000000000000"
  )
  logTest("GET /api/teams/{teamId}/roster (with seasonId)", result2.ok || result2.status === 200, result2.error, {
    status: result2.status,
  })
}

async function testDraftPickEndpoint() {
  console.log("\n📋 Testing POST /api/draft/pick...\n")

  // Test validation (missing required fields)
  const result1 = await testEndpoint("POST", "/api/draft/pick", {})
  logTest("POST /api/draft/pick (validation error)", result1.status === 400, result1.error)

  // Test with invalid UUID
  const result2 = await testEndpoint("POST", "/api/draft/pick", {
    season_id: "invalid",
    team_id: "invalid",
    pokemon_id: "invalid",
    acquisition: "draft",
  })
  logTest("POST /api/draft/pick (invalid UUID)", result2.status === 400, result2.error)
}

async function testFreeAgencyEndpoint() {
  console.log("\n📋 Testing POST /api/free-agency/transaction...\n")

  // Test validation
  const result1 = await testEndpoint("POST", "/api/free-agency/transaction", {})
  logTest("POST /api/free-agency/transaction (validation error)", result1.status === 400, result1.error)
}

async function testDiscordEndpoints() {
  console.log("\n📋 Testing Discord Bot Endpoints...\n")

  // Test bot key authentication
  const result1 = await testEndpoint("GET", "/api/discord/draft/status?discord_user_id=test")
  logTest("GET /api/discord/draft/status (no auth)", result1.status === 401, result1.error)

  // Test with bot key
  const result2 = await testEndpoint(
    "GET",
    "/api/discord/draft/status?discord_user_id=test",
    undefined,
    { Authorization: `Bearer ${BOT_API_KEY}` }
  )
  logTest("GET /api/discord/draft/status (with auth)", result2.ok || result2.status !== 401, result2.error, {
    status: result2.status,
  })

  // Test Pokemon search
  const result3 = await testEndpoint(
    "GET",
    "/api/discord/pokemon/search?query=pika",
    undefined,
    { Authorization: `Bearer ${BOT_API_KEY}` }
  )
  logTest("GET /api/discord/pokemon/search (with auth)", result3.ok || result3.status !== 401, result3.error, {
    status: result3.status,
  })

  // Test guild config
  const result4 = await testEndpoint(
    "GET",
    "/api/discord/guild/config?guild_id=test_guild",
    undefined,
    { Authorization: `Bearer ${BOT_API_KEY}` }
  )
  logTest("GET /api/discord/guild/config (with auth)", result4.ok || result4.status !== 401, result4.error, {
    status: result4.status,
  })

  // Test coach whoami
  const result5 = await testEndpoint(
    "GET",
    "/api/discord/coach/whoami?discord_user_id=test",
    undefined,
    { Authorization: `Bearer ${BOT_API_KEY}` }
  )
  logTest("GET /api/discord/coach/whoami (with auth)", result5.ok || result5.status !== 401, result5.error, {
    status: result5.status,
  })
}

async function main() {
  console.log("🧪 Phase 7.2: API Endpoint Testing\n")
  console.log(`Testing API at: ${APP_URL}\n`)

  await testPokemonSearchEndpoint()
  await testTeamRosterEndpoint()
  await testDraftPickEndpoint()
  await testFreeAgencyEndpoint()
  await testDiscordEndpoints()

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
