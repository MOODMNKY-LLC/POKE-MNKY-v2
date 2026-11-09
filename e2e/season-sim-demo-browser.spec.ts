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

async function openAdvanced(page: Page) {
  const unit = page.locator("#sim-unit")
  if (await unit.isVisible()) return
  await page.getByRole("button", { name: "More controls" }).click()
  await expect(unit).toBeVisible()
}

async function selectUnit(page: Page, label: string) {
  await openAdvanced(page)
  await page.locator("#sim-unit").click()
  await page.getByRole("option", { name: label, exact: true }).click()
}

async function setCount(page: Page, n: number) {
  await openAdvanced(page)
  await page.locator("#sim-n").fill(String(n))
}

async function openRunOptions(page: Page) {
  const teamCount = page.getByLabel("Team count")
  if (await teamCount.isVisible()) return
  await page.getByRole("button", { name: "Practice settings" }).click()
  await expect(teamCount).toBeVisible()
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
  const expected = status.toLowerCase() === "completed" ? "finished" : status.toLowerCase()
  return text === expected
}

async function activeCommandId(page: Page): Promise<string | null> {
  const prepared = await page.getByTestId("sim-run-status").getAttribute("data-prepared")
  return prepared === "true" ? "prepared" : null
}

async function assertPlainLanguage(page: Page) {
  const visible = await page.locator("#sim-main").innerText()
  expect(visible).not.toMatch(/step_seq|event_seq|worker tick|active command|heuristic|lease|provisional_demo_v0/i)
  await expect(page.getByTestId("sim-stage-guide")).toBeVisible()
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
    const tick = page.getByRole("button", { name: "Simulate the prepared part" })
    if (await tick.isEnabled()) {
      await tick.click()
      await waitNotBusy(page)
    } else {
      // Resume if paused without goal met
      const resume = page.getByRole("button", { name: "Continue this practice season" })
      if ((await resume.count()) > 0 && (await resume.isEnabled())) {
        await resume.click()
        await waitNotBusy(page)
        continue
      }
      await page.waitForTimeout(400)
    }
  }
  const excerpt = (await page.locator("body").innerText().catch(() => "")).slice(0, 400)
  throw new Error(`driveUntil timeout: ${opts.label}\n${excerpt}`)
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
    const banner = page.getByRole("note")
    await expect(banner).toHaveCount(1)
    await expect(banner).toContainText(/practice season/i)
    await expect(banner).toContainText(/not league-approved/i)
    await expect(page.getByTestId("sim-stage-guide")).toContainText("Start")
    await expect(page.getByRole("button", { name: "Start a practice season" })).toBeVisible()
    await expect(banner).not.toContainText("provisional_demo_v0")
    await expect(page.getByText(/demo operator/i)).toHaveCount(0)
    await expect(page.getByRole("link", { name: "Sign in" }).first()).toHaveAttribute(
      "href",
      "/auth/login?next=/demo/season-sim",
    )
    await page.getByRole("link", { name: "Skip to practice season" }).focus()
    await page.keyboard.press("Enter")
    await assertPlainLanguage(page)
    await page.getByRole("button", { name: "Start a practice season" }).focus()
    await expect(page.getByRole("button", { name: "Start a practice season" })).toBeFocused()
    await page.evaluate(() => document.documentElement.classList.add("dark"))
    await expect(banner).toBeVisible()
    await page.evaluate(() => document.documentElement.classList.remove("dark"))
    await shot(page, `${testInfo.project.name}-anon-landing`)

    // Attempt create without session
    await openRunOptions(page)
    await page.getByLabel("Team count").fill("4")
    await page.getByLabel("Draft rounds").fill("2")
    await page.getByLabel("Schedule weeks").fill("2")
    await page.getByLabel("Playoff size").fill("2")
    await page.locator("#sim-queue").click()
    await page.getByRole("button", { name: "Start a practice season" }).click()

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
    await openRunOptions(page)
    await page.getByLabel("Team count").fill("4")
    await page.getByLabel("Draft rounds").fill("2")
    await page.getByLabel("Schedule weeks").fill("2")
    await page.getByLabel("Playoff size").fill("2")
    await page.locator("#sim-queue").click()
    await page.getByRole("button", { name: "Start a practice season" }).click()
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
    await page.goto(`${APP}/demo/season-sim`, { waitUntil: "domcontentloaded" })
    await expect(page.getByRole("heading", { name: /Season Simulator/i })).toBeVisible()
    // Auth cookie hydration can trigger a soft navigation on CI — settle first.
    await page.waitForLoadState("networkidle").catch(() => {})
    await assertNoWorkerKeyInPage(page)

    // Configure + create (small synthetic run)
    await openRunOptions(page)
    await page.getByLabel("Team count").fill("4")
    await page.getByLabel("Draft rounds").fill("2")
    await page.getByLabel("Schedule weeks").fill("2")
    await page.getByLabel("Playoff size").fill("2")
    await page.locator("#sim-queue").click()
    await page.getByRole("button", { name: "Start a practice season" }).click()

    await expect(page.getByText(/Practice season started with 4 made-up teams/i)).toBeVisible({
      timeout: 60_000,
    })
    await expect(page.getByTestId("sim-run-status")).toHaveText(/Ready to simulate|Simulating|Ready|Paused/i)
    await assertPlainLanguage(page)
    await expect(page.getByRole("button", { name: "Simulate what's ready" })).toBeVisible()
    await shot(page, `${testInfo.project.name}-created`)

    const auto = page.getByRole("button", { name: "Simulate ahead", exact: true })
    if (!(await auto.isVisible())) {
      await page.getByRole("button", { name: "More controls" }).click()
    }
    if (await auto.isEnabled()) {
      await auto.click()
      await page.getByRole("button", { name: "Stop simulating ahead" }).click()
      await expect(auto).toBeEnabled({ timeout: 20_000 })
    }

    // Granular draft: 4 teams × 2 rounds = 8 picks
    await selectUnit(page, "One draft pick")
    await setCount(page, 8)
    await page.getByRole("button", { name: "Prepare this amount", exact: true }).click()
    await waitNotBusy(page)
    await expect(page.getByText(/Ready to simulate|Results have not changed yet/i).first()).toBeVisible()
    await shot(page, `${testInfo.project.name}-run-active`)

    await driveUntil(page, {
      label: "draft complete → awaiting schedule",
      maxTicks: 40,
      done: async () =>
        (await bodyHas(page, /The draft is finished/i)),
    })
    await shot(page, `${testInfo.project.name}-draft-paused`)

    // Readable seat names on Draft tab
    await page.getByRole("tab", { name: "Draft" }).click()
    await expect(page.getByText(/Bot\s*\d|Synthetic/i).first()).toBeVisible({
      timeout: 15_000,
    })

    // Resume → whole season → ticks to champion
    const resume = page.getByRole("button", { name: "Continue this practice season" })
    if (await resume.isVisible() && (await resume.isEnabled())) {
      await resume.click()
      await waitNotBusy(page)
    }

    await selectUnit(page, "Rest of the season")
    await setCount(page, 1)
    await page.getByRole("button", { name: "Prepare this amount", exact: true }).click()
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
          const r = page.getByRole("button", { name: "Continue this practice season" })
          if (await r.isEnabled()) {
            await r.click()
            await waitNotBusy(page)
          }
        }
        const adv = page.getByRole("button", { name: "Prepare this amount", exact: true })
        if (!(await adv.isEnabled())) return
        const unit = page.locator("#sim-unit")
        const label = await unit.innerText()
        if (!/Rest of the season/i.test(label)) {
          await selectUnit(page, "Rest of the season")
          await setCount(page, 1)
        }
        await adv.click()
        await waitNotBusy(page)
      },
    })
    await expect(page.getByTestId("sim-run-status")).toHaveText(/finished/i)
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
    await page.getByRole("button", { name: /Reopen last practice season/i }).click()
    await expect(page.getByTestId("sim-run-status")).toHaveText(/finished/i, {
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

    // Reset + replay. Reset lives in More controls, which is closed after reload.
    await openAdvanced(page)
    await page.getByRole("button", { name: "Replay season", exact: true }).click()
    const confirm = page.getByLabel("Short season code")
    const expected = runIdMatch!.slice(0, 8)
    await confirm.fill(expected)
    await page.getByRole("button", { name: "Replay this season" }).click()
    await expect(page.getByText(/replay from the same repeatable number/i).first()).toBeVisible({
      timeout: 30_000,
    })
    await shot(page, `${testInfo.project.name}-reset`)

    // Replay: advance season path again briefly
    await selectUnit(page, "One draft round")
    await setCount(page, 2)
    await page.getByRole("button", { name: "Prepare this amount", exact: true }).click()
    await waitNotBusy(page)
    await page.getByRole("button", { name: "Simulate the prepared part" }).click()
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
    await page.goto(`${FLAGS_OFF_URL}/demo/season-sim`, { waitUntil: "domcontentloaded" })
    // A click before hydration submits the form as a navigation and never calls the API.
    await expect(page.locator("[data-hydrated=true]")).toBeVisible()
    await page.getByRole("button", { name: "Start a practice season" }).click()
    await expect(
      page.getByText(/disabled|503|SIM_SANDBOX_V2/i).first(),
    ).toBeVisible({ timeout: 30_000 })
    await shot(page, `${testInfo.project.name}-flags-off-503`)
  })
})
