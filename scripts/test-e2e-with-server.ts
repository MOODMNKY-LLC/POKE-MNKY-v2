/**
 * End-to-End Workflow Testing Script with Next.js Server
 * Starts Next.js dev server, runs tests, then cleans up
 */

import { spawn, ChildProcess } from "child_process"
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
let nextjsServer: ChildProcess | null = null

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

async function checkServerRunning(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "HEAD" })
    return response.ok || response.status < 500
  } catch {
    return false
  }
}

async function waitForServer(url: string, maxAttempts = 30): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    const isRunning = await checkServerRunning(url)
    if (isRunning) {
      return true
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
    process.stdout.write(".")
  }
  return false
}

function startNextjsServer(): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    console.log("\n🚀 Starting Next.js development server...")
    const server = spawn("pnpm", ["dev"], {
      cwd: process.cwd(),
      shell: true,
      stdio: "pipe",
    })

    let serverReady = false

    server.stdout?.on("data", (data: Buffer) => {
      const output = data.toString()
      if (output.includes("Ready") || output.includes("started server")) {
        if (!serverReady) {
          serverReady = true
          console.log("✅ Next.js server started")
          resolve(server)
        }
      }
    })

    server.stderr?.on("data", (data: Buffer) => {
      const output = data.toString()
      if (output.includes("error") && !serverReady) {
        reject(new Error(`Server error: ${output}`))
      }
    })

    server.on("error", (error) => {
      reject(error)
    })

    // Timeout after 60 seconds
    setTimeout(() => {
      if (!serverReady) {
        reject(new Error("Server startup timeout"))
      }
    }, 60000)
  })
}

async function testApiEndpoints() {
  console.log("\n" + "=".repeat(60))
  console.log("API ENDPOINT TESTING")
  console.log("=".repeat(60))

  // Test Discord bot draft pick API endpoint
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

    const responseText = await response.text()
    let responseData: any
    try {
      responseData = JSON.parse(responseText)
    } catch {
      responseData = { raw: responseText }
    }

    // Expect 400/401/404 (validation/auth errors) - endpoint exists
    if (response.status >= 500) {
      throw new Error(`Server error: ${response.status} - ${responseData.error || responseData.raw || 'Unknown error'}`)
    }
    return { status: response.status, endpointExists: true, response: responseData }
  })

  // Test free agency transaction API endpoint
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

    if (response.status >= 500) {
      throw new Error(`Server error: ${response.status}`)
    }
    return { status: response.status, endpointExists: true }
  })

  // Test Discord bot endpoints
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

  // Test Notion sync endpoints
  await test("Notion sync pull endpoint", async () => {
    const response = await fetch(`${APP_BASE_URL}/api/sync/notion/pull`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${NOTION_SYNC_SECRET}`,
      },
      body: JSON.stringify({
        scope: ["pokemon"],
      }),
    })

    const responseText = await response.text()
    let responseData: any
    try {
      responseData = JSON.parse(responseText)
    } catch {
      responseData = { raw: responseText }
    }

    if (response.status >= 500) {
      throw new Error(`Server error: ${response.status} - ${responseData.error || responseData.raw || 'Unknown error'}`)
    }
    return { status: response.status, endpointExists: true, response: responseData }
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

    if (response.status >= 500) {
      throw new Error(`Server error: ${response.status}`)
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

    if (response.status >= 500) {
      throw new Error(`Server error: ${response.status}`)
    }
    return { status: response.status, endpointExists: true }
  })

  // Test team roster endpoint
  await test("Team roster API endpoint", async () => {
    const response = await fetch(
      `${APP_BASE_URL}/api/teams/test-team-id/roster?seasonId=test-season-id`,
      {
        method: "GET",
      }
    )

    const responseText = await response.text()
    let responseData: any
    try {
      responseData = JSON.parse(responseText)
    } catch {
      responseData = { raw: responseText }
    }

    if (response.status >= 500) {
      throw new Error(`Server error: ${response.status} - ${responseData.error || responseData.raw || 'Unknown error'}`)
    }
    return { status: response.status, endpointExists: true, response: responseData }
  })
}

async function main() {
  console.log("🧪 End-to-End Workflow Testing with Next.js Server")
  console.log("=".repeat(60))
  console.log(`Date: ${new Date().toISOString()}`)
  console.log(`Supabase URL: ${SUPABASE_URL}`)
  console.log(`App URL: ${APP_BASE_URL}`)
  console.log("=".repeat(60))

  try {
    // Check if server is already running
    console.log("\n🔍 Checking if Next.js server is already running...")
    const isAlreadyRunning = await checkServerRunning(APP_BASE_URL)
    
    if (isAlreadyRunning) {
      console.log("✅ Next.js server is already running, using existing instance")
    } else {
      // Start Next.js server
      nextjsServer = await startNextjsServer()
      
      // Wait for server to be ready
      console.log("\n⏳ Waiting for server to be ready...")
      const serverReady = await waitForServer(APP_BASE_URL)
      
      if (!serverReady) {
        throw new Error("Server did not become ready in time")
      }
    }
    
    console.log("\n✅ Server is ready, starting tests...\n")

    // Run API endpoint tests
    await testApiEndpoints()

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

    const reportPath = join(process.cwd(), "docs", "E2E-TEST-REPORT-WITH-SERVER.json")
    writeFileSync(reportPath, JSON.stringify(report, null, 2))
    console.log(`\n📄 Report saved to: ${reportPath}`)

    process.exit(failed > 0 ? 1 : 0)
  } catch (error: any) {
    console.error("\n❌ Fatal error:", error)
    process.exit(1)
  } finally {
    // Cleanup: only kill server if we started it
    if (nextjsServer) {
      console.log("\n🛑 Stopping Next.js server (we started it)...")
      nextjsServer.kill()
    } else {
      console.log("\n✅ Leaving Next.js server running (was already running)")
    }
  }
}

// Handle cleanup on exit (only kill server if we started it)
process.on("SIGINT", () => {
  if (nextjsServer) {
    console.log("\n🛑 Stopping Next.js server...")
    nextjsServer.kill()
  }
  process.exit(0)
})

process.on("SIGTERM", () => {
  if (nextjsServer) {
    console.log("\n🛑 Stopping Next.js server...")
    nextjsServer.kill()
  }
  process.exit(0)
})

main()
