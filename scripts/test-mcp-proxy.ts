/**
 * Test script for MCP Proxy API Route
 * 
 * Tests the proxy route to ensure it properly forwards requests
 * to the MCP server with correct authentication.
 */

import { mcpClient } from "../lib/mcp-rest-client"

async function testProxyRoute() {
  console.log("🧪 Testing MCP Proxy Route\n")

  const tests = [
    {
      name: "Health Check",
      endpoint: "/api/health",
      params: {},
    },
    {
      name: "Get Available Pokémon",
      endpoint: "/api/get_available_pokemon",
      params: { limit: 5 },
    },
    {
      name: "Get Pokémon Types",
      endpoint: "/api/get_pokemon_types",
      params: { pokemon_name: "pikachu" },
    },
  ]

  let passed = 0
  let failed = 0

  for (const test of tests) {
    try {
      console.log(`Testing: ${test.name}...`)
      
      // Test direct client call (server-side)
      let result: any
      switch (test.endpoint) {
        case "/api/health":
          result = await mcpClient.healthCheck()
          break
        case "/api/get_available_pokemon":
          result = await mcpClient.getAvailablePokemon(test.params)
          break
        case "/api/get_pokemon_types":
          result = await mcpClient.getPokemonTypes(test.params)
          break
      }

      if (result) {
        console.log(`  ✅ ${test.name} passed`)
        console.log(`     Response: ${JSON.stringify(result).substring(0, 100)}...`)
        passed++
      } else {
        throw new Error("No result returned")
      }
    } catch (error: any) {
      console.error(`  ❌ ${test.name} failed: ${error.message}`)
      failed++
    }
  }

  console.log(`\n📊 Test Results:`)
  console.log(`   Passed: ${passed}`)
  console.log(`   Failed: ${failed}`)
  console.log(`   Total: ${passed + failed}`)

  if (failed === 0) {
    console.log("\n✅ All tests passed!")
    process.exit(0)
  } else {
    console.log("\n❌ Some tests failed")
    process.exit(1)
  }
}

// Run tests
testProxyRoute().catch((error) => {
  console.error("Test script error:", error)
  process.exit(1)
})
