import { test, expect, type Page } from "@playwright/test"
import fs from "fs"

/**
 * Opt-in isolated Auth verification against experimental native Supabase stack.
 * Requires PHASE1_NATIVE_AUTH=1, BASE_URL to local Next, and users.json from seed.
 * NOT for CI by default — no Docker; uses local loopback stack only.
 */
const enabled = process.env.PHASE1_NATIVE_AUTH === "1"
const base = process.env.BASE_URL || "http://127.0.0.1:3010"
const usersPath = "/tmp/phase1-native-logs/users.json"
const REPLAY =
  "https://replay.pokemonshowdown.com/gen8doublesubers-1097585496"
const artifacts = "/opt/cursor/artifacts"

test.describe("Phase1 native Auth attach flow", () => {
  test.skip(!enabled || !fs.existsSync(usersPath), "PHASE1_NATIVE_AUTH harness not active")

  const users = enabled && fs.existsSync(usersPath)
    ? JSON.parse(fs.readFileSync(usersPath, "utf8"))
    : null

  async function login(page: Page, email: string, password: string) {
    await page.goto(`${base}/auth/login`)
    // Controlled React inputs: type() fires input events (fill can leave React state empty).
    await page.locator("#email").click()
    await page.locator("#email").pressSequentially(email, { delay: 15 })
    await page.locator("#password").click()
    await page.locator("#password").pressSequentially(password, { delay: 15 })
    await Promise.all([
      page.waitForURL(/\/dashboard/, { timeout: 45000 }),
      page.locator('form button[type="submit"]').click(),
    ])
  }

  test("coach A JWT login → preview → confirm archive (desktop)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await login(page, users.coachA.email, "Phase1Test-A-Pass!")

    const cookies = await page.context().cookies()
    const authCookie = cookies.find(
      (c) => /auth-token|sb-/.test(c.name) && c.value.length > 20,
    )
    expect(authCookie, "expected Supabase auth session cookie").toBeTruthy()
    fs.writeFileSync(
      "/tmp/phase1-native-logs/cookie-proof.json",
      JSON.stringify(
        {
          names: cookies.map((c) => c.name),
          authCookiePresent: Boolean(authCookie),
          authCookieName: authCookie?.name,
          valueLen: authCookie?.value.length,
        },
        null,
        2,
      ),
    )

    await page.goto(`${base}/dashboard/weekly-matches/history`)
    await expect(
      page.getByText(/Week 3|Team Alpha|Attach replay/i).first(),
    ).toBeVisible({ timeout: 20000 })
    await page.screenshot({
      path: `${artifacts}/native-auth-history-desktop.png`,
      fullPage: true,
    })

    await page.getByRole("button", { name: /Attach replay/i }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await dialog.getByLabel(/Replay URL/i).fill(REPLAY)
    await dialog.getByRole("button", { name: /^Preview$/i }).click()
    await expect(dialog.getByText(/Players:|Preview/i).first()).toBeVisible({
      timeout: 30000,
    })
    await page.screenshot({
      path: `${artifacts}/native-auth-preview-desktop.png`,
      fullPage: true,
    })
    await dialog.getByRole("button", { name: /Confirm archive/i }).click()
    await expect(
      page.getByText(/archived|standings unchanged/i).first(),
    ).toBeVisible({ timeout: 30000 })
    await page.screenshot({
      path: `${artifacts}/native-auth-confirm-desktop.png`,
      fullPage: true,
    })
  })

  test("foreign coach: no match / attach denied (390)", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    })
    const page = await context.newPage()
    await login(page, users.foreign.email, "Phase1Test-F-Pass!")
    await page.goto(`${base}/dashboard/weekly-matches/history`)
    const attach = page.getByRole("button", { name: /Attach replay/i })
    const count = await attach.count()
    if (count === 0) {
      await page.screenshot({
        path: `${artifacts}/native-auth-foreign-mobile390-no-match.png`,
        fullPage: true,
      })
      expect(count).toBe(0)
    } else {
      await attach.first().click()
      const dialog = page.getByRole("dialog")
      await dialog.getByLabel(/Replay URL/i).fill(REPLAY)
      await dialog.getByRole("button", { name: /^Preview$/i }).click()
      await dialog.getByRole("button", { name: /Confirm archive/i }).click()
      await expect(
        page.getByText(/Not a participant|No league team|FOREIGN|denied/i).first(),
      ).toBeVisible({ timeout: 20000 })
      await page.screenshot({
        path: `${artifacts}/native-auth-foreign-mobile390-denied.png`,
        fullPage: true,
      })
    }
    await context.close()
  })

  test("anon API 401 on preview", async ({ request }) => {
    const preview = await request.post(`${base}/api/replays/preview`, {
      data: { url: REPLAY },
    })
    expect(preview.status()).toBe(401)
  })
})
