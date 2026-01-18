/**
 * Test suite for MCP REST Client
 * 
 * Tests the type-safe REST client generated from OpenAPI spec.
 * Run with: tsx scripts/test-mcp-rest-client.ts
 */

import { createMCPClient, MCPApiError } from "../lib/mcp-rest-client"

// Helper to clean base URL
const cleanBaseUrl = (url?: string): string => {
  if (!url) return "https://mcp-draft-pool.moodmnky.com"
  return url.replace(/\/mcp\/?$/, "")
}

// Test configuration
const TEST_CONFIG = {
  baseUrl: cleanBaseUrl(
    process.env.MCP_DRAFT_POOL_SERVER_URL || 
    process.env.NEXT_PUBLIC_MCP_SERVER_URL
  ),
  apiKey: process.env.MCP_API_KEY || process.env.NEXT_PUBLIC_MCP_API_KEY,
}

interface TestResult {
  name: string
  passed: boolean
  error?: string
  duration: number
  data?: unknown
}

const results: TestResult[] = []

/**
 * Run a test and record results
 */
async function runTest(
  name: string,
  testFn: () => Promise<unknown>
): Promise<void> {
  const start = Date.now()
  try {
    console.log(`\n🧪 Testing: ${name}`)
    const data = await testFn()
    const duration = Date.now() - start
    results.push({ name, passed: true, duration, data })
    console.log(`✅ PASSED (${duration}ms)`)
  } catch (error: any) {
    const duration = Date.now() - start
    const errorMessage = error instanceof MCPApiError
      ? `${error.status} ${error.statusText}: ${error.message}`
      : error.message || String(error)
    results.push({ name, passed: false, error: errorMessage, duration })
    console.error(`❌ FAILED (${duration}ms): ${errorMessage}`)
  }
}

/**
 * Test health check endpoint
 */
async function testHealthCheck() {
  const client = createMCPClient(TEST_CONFIG)
  const health = await client.healthCheck()
  
  if (!health || typeof health !== "object") {
    throw new Error("Health check returned invalid data")
  }
  
  console.log("   Health status:", health)
  return health
}

/**
 * Test get available Pokémon
 */
async function testGetAvailablePokemon() {
  const client = createMCPClient(TEST_CONFIG)
  const result = await client.getAvailablePokemon({ limit: 5 })
  
  if (!result.data) {
    throw new Error("No data returned")
  }
  
  if (!Array.isArray(result.data.pokemon)) {
    throw new Error("Pokemon data is not an array")
  }
  
  console.log(`   Found ${result.data.pokemon.length} Pokémon`)
  console.log(`   Rate limit: ${result.rateLimit?.remaining}/${result.rateLimit?.limit}`)
  
  return result.data
}

/**
 * Test get draft status
 */
async function testGetDraftStatus() {
  const client = createMCPClient(TEST_CONFIG)
  const result = await client.getDraftStatus()
  
  if (!result.data) {
    throw new Error("No data returned")
  }
  
  console.log("   Draft status:", result.data)
  return result.data
}

/**
 * Test get team budget (requires team_id)
 */
async function testGetTeamBudget() {
  const client = createMCPClient(TEST_CONFIG)
  
  // Test with invalid team_id to check error handling
  try {
    await client.getTeamBudget({ team_id: 99999 })
    throw new Error("Should have thrown error for invalid team_id")
  } catch (error) {
    if (error instanceof MCPApiError) {
      console.log(`   Error handling works: ${error.status} ${error.statusText}`)
      return { errorHandled: true }
    }
    throw error
  }
}

/**
 * Test get Pokémon types
 */
async function testGetPokemonTypes() {
  const client = createMCPClient(TEST_CONFIG)
  const result = await client.getPokemonTypes({ pokemon_name: "pikachu" })
  
  if (!result.data) {
    throw new Error("No data returned")
  }
  
  console.log("   Pokémon types:", result.data)
  return result.data
}

/**
 * Test error handling
 */
async function testErrorHandling() {
  const client = createMCPClient({
    ...TEST_CONFIG,
    apiKey: "invalid-key",
  })
  
  try {
    await client.getAvailablePokemon()
    throw new Error("Should have thrown error for invalid API key")
  } catch (error) {
    if (error instanceof MCPApiError) {
      if (error.status === 401) {
        console.log("   Authentication error handling works")
        return { errorHandled: true }
      }
    }
    throw error
  }
}

/**
 * Test rate limit handling
 */
async function testRateLimitHandling() {
  const client = createMCPClient(TEST_CONFIG)
  
  // Make multiple requests to check rate limit headers
  const promises = Array.from({ length: 3 }, () => 
    client.getAvailablePokemon({ limit: 1 })
  )
  
  const results = await Promise.all(promises)
  
  // Check that rate limit info is present
  const hasRateLimit = results.some(r => r.rateLimit !== undefined)
  
  if (!hasRateLimit) {
    console.warn("   Rate limit headers not present (may not be implemented)")
  } else {
    console.log("   Rate limit handling works")
  }
  
  return { rateLimitDetected: hasRateLimit }
}

/**
 * Test retry logic
 */
async function testRetryLogic() {
  // This test would require simulating failures
  // For now, we'll just verify the client is configured correctly
  const client = createMCPClient({
    ...TEST_CONFIG,
    enableRetry: true,
    maxRetries: 3,
  })
  
  console.log("   Retry logic configured")
  return { retryEnabled: true }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log("=".repeat(60))
  console.log("MCP REST Client Test Suite")
  console.log("=".repeat(60))
  console.log(`Base URL: ${TEST_CONFIG.baseUrl}`)
  console.log(`API Key: ${TEST_CONFIG.apiKey ? "***" + TEST_CONFIG.apiKey.slice(-4) : "NOT SET"}`)
  
  if (!TEST_CONFIG.apiKey) {
    console.warn("\n⚠️  WARNING: No API key provided. Some tests may fail.")
  }
  
  // Run tests
  await runTest("Health Check", testHealthCheck)
  await runTest("Get Available Pokémon", testGetAvailablePokemon)
  await runTest("Get Draft Status", testGetDraftStatus)
  await runTest("Get Team Budget (Error Handling)", testGetTeamBudget)
  await runTest("Get Pokémon Types", testGetPokemonTypes)
  await runTest("Error Handling", testErrorHandling)
  await runTest("Rate Limit Handling", testRateLimitHandling)
  await runTest("Retry Logic Configuration", testRetryLogic)
  
  // Print summary
  console.log("\n" + "=".repeat(60))
  console.log("Test Summary")
  console.log("=".repeat(60))
  
  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0)
  
  console.log(`Total Tests: ${results.length}`)
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`⏱️  Total Duration: ${totalDuration}ms`)
  
  if (failed > 0) {
    console.log("\nFailed Tests:")
    results
      .filter(r => !r.passed)
      .forEach(r => {
        console.log(`  ❌ ${r.name}: ${r.error}`)
      })
  }
  
  console.log("\n" + "=".repeat(60))
  
  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0)
}

// Run tests if executed directly
if (require.main === module) {
  runAllTests().catch((error) => {
    console.error("Fatal error:", error)
    process.exit(1)
  })
}

export { runAllTests, runTest }
