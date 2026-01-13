/**
 * Test Local PokeAPI Configuration
 * 
 * Tests the local PokeAPI instance and verifies configuration
 * 
 * Usage:
 *   tsx --env-file=.env.local scripts/test-local-pokeapi.ts
 */

import { getPokeApiBaseUrl, isLocalPokeApi } from "../lib/pokeapi-config"

async function main() {
  console.log("=".repeat(70))
  console.log("🧪 Local PokeAPI Configuration Test")
  console.log("=".repeat(70))
  console.log("")

  const baseUrl = getPokeApiBaseUrl()
  const isLocal = isLocalPokeApi()

  console.log(`📋 Configuration:`)
  console.log(`   Base URL: ${baseUrl}`)
  console.log(`   Is Local: ${isLocal}`)
  console.log("")

  // Test API endpoint
  console.log("📋 Testing API endpoint...")
  try {
    const response = await fetch(`${baseUrl}/pokemon/1/`)
    if (!response.ok) {
      console.error(`   ❌ API request failed: ${response.status} ${response.statusText}`)
      process.exit(1)
    }

    const data = await response.json()
    console.log(`   ✅ API is accessible`)
    console.log(`   Pokemon: ${data.name} (ID: ${data.id})`)
    console.log("")

    // Test list endpoint
    const listResponse = await fetch(`${baseUrl}/pokemon/?limit=5`)
    if (!listResponse.ok) {
      console.error(`   ❌ List request failed: ${listResponse.status}`)
      process.exit(1)
    }

    const listData = await listResponse.json()
    console.log(`   ✅ List endpoint accessible`)
    console.log(`   Found ${listData.results?.length || 0} Pokemon`)
    console.log("")

    console.log("=".repeat(70))
    console.log("📊 Test Summary")
    console.log("=".repeat(70))
    console.log("✅ Local PokeAPI is configured and accessible!")
    console.log("")
    console.log("Next steps:")
    console.log("1. Update .env.local to include:")
    console.log("   POKEAPI_BASE_URL=http://localhost/api/v2")
    console.log("2. Test sync scripts with local instance")
    console.log("3. Verify Edge Functions use local instance")
    console.log("")
  } catch (error) {
    console.error(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`)
    console.log("")
    console.log("Troubleshooting:")
    console.log("1. Ensure PokeAPI containers are running:")
    console.log("   cd tools/pokeapi-local && docker compose ps")
    console.log("2. Check if port 80 is accessible:")
    console("   curl http://localhost/api/v2/")
    console.log("3. Verify .env.local includes:")
    console.log("   POKEAPI_BASE_URL=http://localhost/api/v2")
    console.log("")
    process.exit(1)
  }
}

main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
