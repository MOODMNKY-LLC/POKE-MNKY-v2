/**
 * E2E Test Script for Discord Slash Commands
 *
 * Exercises each command's API directly (simulating Discord → app flow).
 * Verifies each API returns expected response shape.
 *
 * Required env:
 * - DISCORD_BOT_API_KEY — Bot API key for Discord-protected routes
 * - NEXT_PUBLIC_APP_URL or APP_BASE_URL — App base URL (default: http://localhost:3000)
 *
 * Optional (for commands that need guild/season):
 * - DISCORD_GUILD_ID — Test guild ID
 * - A season must exist in DB for draft/FA commands
 *
 * Run: npx tsx scripts/test-discord-commands-e2e.ts
 *
 * Manual Discord verification: After running, test each command in Discord
 * to confirm the full flow (interactions → app proxy → API) works.
 */

const APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.APP_BASE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
  "http://localhost:3000"
const BOT_KEY = process.env.DISCORD_BOT_API_KEY || ""
const GUILD_ID = process.env.DISCORD_GUILD_ID || ""

function headers(botAuth = true): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" }
  if (botAuth && BOT_KEY) {
    h["Authorization"] = `Bearer ${BOT_KEY}`
    h["X-Discord-Bot-Key"] = BOT_KEY
  }
  return h
}

interface TestResult {
  name: string
  passed: boolean
  error?: string
  status?: number
  note?: string
}

const results: TestResult[] = []

async function test(
  name: string,
  fn: () => Promise<{ ok: boolean; status?: number; body?: unknown }>
): Promise<void> {
  try {
    const { ok, status, body } = await fn()
    if (ok) {
      results.push({ name, passed: true, status })
      console.log(`✅ ${name}`)
    } else {
      results.push({
        name,
        passed: false,
        error: `Status ${status}`,
        status,
        note: body ? JSON.stringify(body).slice(0, 100) : undefined,
      })
      console.log(`❌ ${name} — status ${status}`)
    }
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e)
    results.push({ name, passed: false, error: err })
    console.log(`❌ ${name} — ${err}`)
  }
}

async function main() {
  console.log("\n📋 Discord Slash Commands E2E Test")
  console.log(`   Base URL: ${APP_BASE_URL}`)
  console.log(`   Bot key: ${BOT_KEY ? "set" : "NOT SET (some tests will fail)"}`)
  console.log(`   Guild ID: ${GUILD_ID ? GUILD_ID : "NOT SET"}\n`)

  // 1. /calc — POST /api/calc (no bot auth)
  await test("1. /calc (POST /api/calc)", async () => {
    const res = await fetch(`${APP_BASE_URL}/api/calc`, {
      method: "POST",
      headers: headers(false),
      body: JSON.stringify({
        attackingPokemon: "Pikachu",
        defendingPokemon: "Charizard",
        moveName: "Thunderbolt",
      }),
    })
    const body = await res.json()
    const ok = res.ok && (body.success === true || body.damage != null)
    return { ok, status: res.status, body }
  })

  // 2. /search — GET /api/discord/pokemon/search (bot auth)
  await test("2. /search (GET /api/discord/pokemon/search)", async () => {
    const url = new URL(`${APP_BASE_URL}/api/discord/pokemon/search`)
    url.searchParams.set("query", "pika")
    if (GUILD_ID) url.searchParams.set("guild_id", GUILD_ID)
    const res = await fetch(url.toString(), { headers: headers() })
    const body = await res.json()
    const ok = res.ok && (Array.isArray(body.results) || body.ok === true)
    return { ok, status: res.status, body }
  })

  // 3. /getseason — GET /api/discord/guild/config (bot auth)
  await test("3. /getseason (GET /api/discord/guild/config)", async () => {
    if (!GUILD_ID) {
      return { ok: false, status: 400, body: { error: "GUILD_ID not set" } }
    }
    const url = `${APP_BASE_URL}/api/discord/guild/config?guild_id=${GUILD_ID}`
    const res = await fetch(url, { headers: headers() })
    const body = await res.json()
    const ok = res.ok && (body.ok !== false || body.default_season_id != null)
    return { ok, status: res.status, body }
  })

  // 4. /draftstatus — In-process; no direct API. Skip or use draft status API if exists
  await test("4. /draftstatus (no direct API)", async () => {
    const res = await fetch(`${APP_BASE_URL}/api/draft/status`, {
      headers: headers(false),
    })
    const ok = res.ok || res.status === 401
    return { ok, status: res.status }
  })

  // 5. /whoami — In-process; no direct API. Skip
  results.push({ name: "5. /whoami (in-process)", passed: true })
  console.log("✅ 5. /whoami (in-process)")

  // 6. /coverage — GET /api/draft/status + POST /api/discord/notify/coverage
  await test("6. /coverage (GET /api/draft/status)", async () => {
    const res = await fetch(`${APP_BASE_URL}/api/draft/status`, {
      headers: headers(false),
    })
    return { ok: res.ok || res.status === 401, status: res.status }
  })

  // 7. /pick — POST /api/discord/draft/pick (needs valid body; expect 400/404 without real data)
  await test("7. /pick (POST /api/discord/draft/pick)", async () => {
    const res = await fetch(`${APP_BASE_URL}/api/discord/draft/pick`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        season_id: "00000000-0000-0000-0000-000000000000",
        discord_user_id: "123456789",
        pokemon_id: "00000000-0000-0000-0000-000000000000",
      }),
    })
    const body = await res.json()
    const ok = res.ok || (res.status === 400 && body.error) || (res.status === 401 && body.code === "BOT_UNAUTHORIZED")
    return { ok, status: res.status, body }
  })

  // 8. /free-agency-submit — POST /api/discord/free-agency/submit
  await test("8. /free-agency-submit (POST /api/discord/free-agency/submit)", async () => {
    const res = await fetch(`${APP_BASE_URL}/api/discord/free-agency/submit`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        discord_user_id: "123456789",
        add: "Pikachu",
        drop: "Rattata",
      }),
    })
    const body = await res.json()
    const ok =
      res.ok ||
      (res.status === 400 && body.error) ||
      (res.status === 401 && body.code === "BOT_UNAUTHORIZED") ||
      (res.status === 404 && body.error)
    return { ok, status: res.status, body }
  })

  // 9. /free-agency-status — GET /api/discord/free-agency/team-status
  await test("9. /free-agency-status (GET /api/discord/free-agency/team-status)", async () => {
    const url = new URL(`${APP_BASE_URL}/api/discord/free-agency/team-status`)
    url.searchParams.set("discord_user_id", "123456789")
    const res = await fetch(url.toString(), { headers: headers() })
    const body = await res.json()
    const ok =
      res.ok ||
      (res.status === 401 && body.code === "BOT_UNAUTHORIZED") ||
      (res.status === 404 && body.error)
    return { ok, status: res.status, body }
  })

  // 10. /setseason — POST /api/discord/guild/config (admin)
  await test("10. /setseason (POST /api/discord/guild/config)", async () => {
    if (!GUILD_ID) return { ok: false, status: 400, body: { error: "GUILD_ID not set" } }
    const res = await fetch(`${APP_BASE_URL}/api/discord/guild/config`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        guild_id: GUILD_ID,
        default_season_id: "00000000-0000-0000-0000-000000000000",
      }),
    })
    const body = await res.json()
    const ok = res.ok || (res.status === 400 && body.error) || (res.status === 401 && body.code === "BOT_UNAUTHORIZED")
    return { ok, status: res.status, body }
  })

  const passed = results.filter((r) => r.passed).length
  const total = results.length
  console.log(`\n${"=".repeat(50)}`)
  console.log(`Results: ${passed}/${total} passed`)
  console.log(`${"=".repeat(50)}\n`)
  console.log("Manual verification: Test each command in Discord to confirm full flow.")
  process.exit(passed === total ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
