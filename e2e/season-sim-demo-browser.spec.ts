/**
 * Playwright Chromium acceptance for /demo/season-sim on the disposable
 * real-GoTrue + DB + Next stack (allowlisted NONADMIN operator).
 *
 * Requires env from scripts/season-sim/bring-up-real-server-stack.sh with
 * RUN_BROWSER_ACCEPTANCE=1. Does not start its own webServer.
 */

import { expect, test, type Page } from "@playwright/test"
import path from "node:path"
import { assertNoWorkerKeyInPage, signInAs } from "./helpers/season-sim-auth"

const APP = (
  process.env.BASE_URL ??
  process.env.APP_BASE_URL ??
  "http://127.0.0.1:3010"
).replace(/\/$/, "")
const SUPABASE_URL = (
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321"
).replace(/\/$/, "")
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
const NONADMIN_EMAIL =
  process.env.SEASON_SIM_NONADMIN_EMAIL ?? "season-sim-coach@example.invalid"
const NONADMIN_PASSWORD = process.env.SEASON_SIM_NONADMIN_PASSWORD ?? ""
const OUTSIDER_EMAIL =
  process.env.SEASON_SIM_OUTSIDER_EMAIL ?? "season-sim-outsider@example.invalid"
const OUTSIDER_PASSWORD = process.env.SEASON_SIM_OUTSIDER_PASSWORD ?? ""
const FLAGS_OFF_URL = (process.env.SEASON_SIM_FLAGS_OFF_URL ?? "").replace(
  /\/$/,
  "",
)
const ARTIFACT_DIR =
  process.env.SEASON_SIM_BROWSER_ARTIFACT_DIR ??
  "/opt/cursor/artifacts/season-sim-browser"

function requireEnv() {
  test.skip(!ANON, "NEXT_PUBLIC_SUPABASE_ANON_KEY missing — stack not wired")
  test.skip(!NONADMIN_PASSWORD, "SEASON_SIM_NONADMIN_PASSWORD missing")
}

async function shot(page: Page, name: string) {
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "screenshots", `${name}.png`),
    fullPage: true,
  })
}

async function signInNonadmin(page: Page) {
  await signInAs(page, {
    appOrigin: APP,
    supabaseUrl: SUPABASE_URL,
    anonKey: ANON,
    email: NONADMIN_EMAIL,
    password: NONADMIN_PASSWORD,
  })
}

async function selectUnit(page: Page, label: string) {
  await page.locator("#sim-unit").click()
  await page.getByRole("option", { name: label, exact: true }).click()
}

async function setCount(page: Page, n: number) {
  await page.locator("#sim-n").fill(String(n))
}

async function waitNotBusy(page: Page) {
  await expect(page.locator("button .animate-spin")).toHaveCount(0, {
    timeout: 120_000,
  })
}

async function bodyHas(page: Page, re: RegExp): Promise<boolean> {
  const text = await page.locator("body").innerText()
  return re.test(text)
}

/** Run lifecycle badge only — never match help copy like "until completed/paused". */
async function runStatusIs(page: Page, status: string): Promise<boolean> {
  const badge = page.getByTestId("sim-run-status")
  if ((await badge.count()) === 0) return false
  const text = (await badge.innerText()).trim().toLowerCase()
  return text === status.toLowerCase()
}

async function activeCommandId(page: Page): Promise<string | null> {
  const row = page.locator("dt", { hasText: /^Active command$/ }).locator("..")
  const value = (await row.locator("dd").innerText().catch(() => "")).trim()
  if (!value || /^none$/i.test(value)) return null
  return value
}

/**
 * Deterministic drive: queue Advance when needed, then owner-scoped worker steps.
 * Avoids Auto-run stopping on intermediate `paused` without meeting the goal.
 */
async function driveUntil(
  page: Page,
  opts: {
    label: string
    done: () => Promise<boolean>
    ensureCommand?: () => Promise<void>
    maxTicks?: number
  },
) {
  const maxTicks = opts.maxTicks ?? 80
  for (let i = 0; i < maxTicks; i++) {
    if (await opts.done()) return
    if (opts.ensureCommand) await opts.ensureCommand()
    const tick = page.getByRole("button", { name: "Run worker step" })
    if (await tick.isEnabled()) {
      await tick.click()
      await waitNotBusy(page)
    } else {
      // Resume if paused without goal met
      const resume = page.getByRole("button", { name: "Resume" })
      if (await resume.isEnabled()) {
        await resume.click()
        await waitNotBusy(page)
        continue
      }
      await page.waitForTimeout(400)
    }
  }
  throw new Error(`driveUntil timeout: ${opts.label}`)
}

test.describe("season-sim demo browser acceptance", () => {
  requireEnv()
  // Tests are independent (each signs in as needed). Do not use serial —
  // a champion-path failure must not skip deny/403/503 coverage.

  test("anonymous is denied create / sees unauthorized path", async ({
    page,
  }, testInfo) => {
    await page.goto(`${APP}/demo/season-sim`)
    await expect(page.getByRole("heading", { name: /Season Simulator/i })).toBeVisible()
    await shot(page, `${testInfo.project.name}-anon-landing`)

    // Attempt create without session
    await page.getByLabel("Team count").fill("4")
    await page.getByLabel("Draft rounds").fill("2")
    await page.getByLabel("Schedule weeks").fill("2")
    await page.getByLabel("Playoff size").fill("2")
    await page.locator("#sim-queue").click()
    await page.getByRole("button", { name: "Create run" }).click()

    await expect(
      page.getByText(/Could not create run|Unauthorized|not on SIM_DEMO|sign in|Forbidden/i).first(),
    ).toBeVisible({ timeout: 30_000 })
    await shot(page, `${testInfo.project.name}-anon-denied`)
  })

  test("outsider authenticated but not allowlisted is denied", async ({
    page,
  }, testInfo) => {
    test.skip(!OUTSIDER_PASSWORD, "outsider fixture password not provided by stack")
    await signInAs(page, {
      appOrigin: APP,
      supabaseUrl: SUPABASE_URL,
      anonKey: ANON,
      email: OUTSIDER_EMAIL,
      password: OUTSIDER_PASSWORD,
    })
    await page.goto(`${APP}/demo/season-sim`)
    await page.getByLabel("Team count").fill("4")
    await page.getByLabel("Draft rounds").fill("2")
    await page.getByLabel("Schedule weeks").fill("2")
    await page.getByLabel("Playoff size").fill("2")
    await page.locator("#sim-queue").click()
    await page.getByRole("button", { name: "Create run" }).click()
    await expect(
      page.getByText(/not on SIM_DEMO_OPERATOR_ALLOWLIST|Forbidden|Could not create run/i).first(),
    ).toBeVisible({ timeout: 30_000 })
    await shot(page, `${testInfo.project.name}-outsider-denied`)
  })

  test("nonadmin allowlisted: create→draft→season champion→reset + recovery", async ({
    page,
  }, testInfo) => {
    // Body can take ~6–8m of ticks; keep margin above config default for teardown.
    testInfo.setTimeout(15 * 60 * 1000)
    await signInNonadmin(page)
    await page.goto(`${APP}/demo/season-sim`)
    await expect(page.getByRole("heading", { name: /Season Simulator/i })).toBeVisible()
    await assertNoWorkerKeyInPage(page)

    // Configure + create (small synthetic run)
    await page.getByLabel("Team count").fill("4")
    await page.getByLabel("Draft rounds").fill("2")
    await page.getByLabel("Schedule weeks").fill("2")
    await page.getByLabel("Playoff size").fill("2")
    await page.locator("#sim-queue").click()
    await page.getByRole("button", { name: "Create run" }).click()

    await expect(page.getByText(/Run created with 4 synthetic teams/i)).toBeVisible({
      timeout: 60_000,
    })
    await expect(page.getByText(/queued|running|configured|paused/i).first()).toBeVisible()
    await shot(page, `${testInfo.project.name}-created`)

    // Granular draft: 4 teams × 2 rounds = 8 picks
    await selectUnit(page, "Pick")
    await setCount(page, 8)
    await page.getByRole("button", { name: "Advance" }).click()
    await waitNotBusy(page)

    await driveUntil(page, {
      label: "draft complete → awaiting schedule",
      maxTicks: 40,
      done: async () =>
        (await bodyHas(page, /Awaiting:\s*schedule/i)) ||
        (await bodyHas(page, /Draft finished/i)),
    })
    await shot(page, `${testInfo.project.name}-draft-paused`)

    // Readable seat names on Draft tab
    await page.getByRole("tab", { name: "Draft" }).click()
    await expect(page.getByText(/Bot\s*\d|Synthetic/i).first()).toBeVisible({
      timeout: 15_000,
    })

    // Resume → whole season → ticks to champion
    const resume = page.getByRole("button", { name: "Resume" })
    if (await resume.isEnabled()) {
      await resume.click()
      await waitNotBusy(page)
    }

    await selectUnit(page, "Whole season")
    await setCount(page, 1)
    await page.getByRole("button", { name: "Advance" }).click()
    await waitNotBusy(page)

    await driveUntil(page, {
      label: "season complete / champion",
      maxTicks: 80,
      done: async () => runStatusIs(page, "completed"),
      ensureCommand: async () => {
        if (await runStatusIs(page, "completed")) return
        // Do not re-queue while a command is already active — just tick.
        if (await activeCommandId(page)) return
        if (await runStatusIs(page, "paused")) {
          const r = page.getByRole("button", { name: "Resume" })
          if (await r.isEnabled()) {
            await r.click()
            await waitNotBusy(page)
          }
        }
        const adv = page.getByRole("button", { name: "Advance" })
        if (!(await adv.isEnabled())) return
        const unit = page.locator("#sim-unit")
        const label = await unit.innerText()
        if (!/Whole season/i.test(label)) {
          await selectUnit(page, "Whole season")
          await setCount(page, 1)
        }
        await adv.click()
        await waitNotBusy(page)
      },
    })
    await expect(page.getByTestId("sim-run-status")).toHaveText(/completed/i)
    await shot(page, `${testInfo.project.name}-season-complete`)

    // Season tab: matches + standings with readable names
    await page.getByRole("tab", { name: "Season" }).click()
    await expect(page.getByText(/ vs /i).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole("columnheader", { name: "Seed" })).toBeVisible()
    await expect(page.getByText(/Regular-season schedule/i)).toBeVisible()
    await expect(page.getByText(/Bot\s*\d|Synthetic/i).first()).toBeVisible()
    await shot(page, `${testInfo.project.name}-season-tab`)

    // Playoffs / champion / bracket
    await page.getByRole("tab", { name: "Playoffs" }).click()
    await expect(page.getByText(/Champion/i).first()).toBeVisible()
    await expect(page.getByText(/No champion yet/i)).toHaveCount(0)
    await expect(page.getByText(/Bot\s*\d|Synthetic/i).first()).toBeVisible()
    await shot(page, `${testInfo.project.name}-playoffs-champion`)

    // Refresh reload recovery (localStorage last run id)
    const runIdMatch = await page.evaluate(() =>
      window.localStorage.getItem("season-sim-v2:last-run-id"),
    )
    expect(runIdMatch).toBeTruthy()
    await page.reload()
    await expect(page.getByRole("heading", { name: /Season Simulator/i })).toBeVisible()
    // Prefer "Resume last run" after reload
    await page.getByRole("tab", { name: "Load run by ID" }).click()
    await page.getByRole("button", { name: /Resume last run/i }).click()
    await expect(page.getByTestId("sim-run-status")).toHaveText(/completed/i, {
      timeout: 30_000,
    })
    await shot(page, `${testInfo.project.name}-reload-recovery`)

    // Scoped tick: no worker key in page; tick button works without exposing secret
    await assertNoWorkerKeyInPage(page)
    const tickRequests: string[] = []
    page.on("request", (req) => {
      if (req.url().includes("/tick")) tickRequests.push(req.url())
      const headers = req.headers()
      if (
        headers["x-simulation-worker-key"] ||
        headers["authorization"]?.includes("local-disposable-sim-worker")
      ) {
        throw new Error("Browser sent worker key header")
      }
    })

    // Stale 409 via API with session cookies (exact cursor mismatch)
    const stale = await page.evaluate(async (runId) => {
      const detail = await fetch(`/api/admin/simulation/runs/${runId}`, {
        credentials: "include",
      }).then((r) => r.json())
      const progress = detail.progress
      const res = await fetch(`/api/admin/simulation/runs/${runId}/advance`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command_id: crypto.randomUUID(),
          unit: "pick",
          n: 1,
          expected_step_seq: Math.max(0, (progress.step_seq ?? 0) - 1),
          expected_run_version: (progress.run_version ?? 1) - 1,
        }),
      })
      const body = await res.json().catch(() => ({}))
      return { status: res.status, code: body.code ?? null }
    }, runIdMatch!)
    expect(stale.status).toBe(409)
    await shot(page, `${testInfo.project.name}-stale-409`)

    // Reset + replay
    await page.getByRole("button", { name: "Reset" }).click()
    const confirm = page.getByLabel(/Type/i)
    const expected = runIdMatch!.slice(0, 8)
    await confirm.fill(expected)
    await page.getByRole("button", { name: "Reset run" }).click()
    await expect(page.getByText(/Sandbox domain reset|replay/i).first()).toBeVisible({
      timeout: 30_000,
    })
    await shot(page, `${testInfo.project.name}-reset`)

    // Replay: advance season path again briefly
    await selectUnit(page, "Draft round")
    await setCount(page, 2)
    await page.getByRole("button", { name: "Advance" }).click()
    await waitNotBusy(page)
    await page.getByRole("button", { name: "Run worker step" }).click()
    await waitNotBusy(page)
    await shot(page, `${testInfo.project.name}-replay-tick`)
  })

  test("nonadmin forbidden on league admin users page", async ({
    page,
  }, testInfo) => {
    await signInNonadmin(page)
    await page.goto(`${APP}/admin/users`)
    // Spectator is bounced toward /admin (or login) — not granted user admin UI
    await page.waitForURL(/\/(admin|auth\/login)(\?|$)/, { timeout: 30_000 })
    const url = page.url()
    expect(url.includes("/admin/users")).toBe(false)
    await shot(page, `${testInfo.project.name}-admin-forbidden`)
  })

  test("503 when flags off (second Next if provided)", async ({ page }, testInfo) => {
    test.skip(
      !FLAGS_OFF_URL,
      "SEASON_SIM_FLAGS_OFF_URL not set — 503 browser case blocked without second Next",
    )
    await signInNonadmin(page)
    await page.goto(`${FLAGS_OFF_URL}/demo/season-sim`)
    await page.getByLabel("Team count").fill("4")
    await page.getByRole("button", { name: "Create run" }).click()
    await expect(
      page.getByText(/disabled|503|SIM_SANDBOX_V2/i).first(),
    ).toBeVisible({ timeout: 30_000 })
    await shot(page, `${testInfo.project.name}-flags-off-503`)
  })
})
