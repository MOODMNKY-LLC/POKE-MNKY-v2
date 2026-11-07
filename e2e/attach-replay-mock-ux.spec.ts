import { test, expect } from "@playwright/test"
import path from "path"

/**
 * MOCK UX ONLY — does not prove Supabase Auth JWT sessions or Postgres RLS.
 * Isolated HTML fixture with in-page stubs; no production DB/routes/credentials.
 */
const fixture = path.join(
  process.cwd(),
  "e2e/fixtures/attach-replay-mock-ux.html",
)

const artifactDir = "/opt/cursor/artifacts"

test.describe("Attach replay mock UX (not Auth/RLS proof)", () => {
  test("desktop public_ok preview → confirm", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto(`file://${fixture}?scenario=public_ok`)
    await expect(page.getByRole("status")).toContainText("MOCK UX FIXTURE")
    await page.getByRole("button", { name: "Attach replay" }).click()
    await page.getByLabel("Replay URL").fill(
      "https://replay.pokemonshowdown.com/gen9ou-1097585496",
    )
    await page.getByRole("button", { name: "Preview" }).click()
    await expect(page.getByText("Players:")).toBeVisible()
    await page.getByRole("button", { name: "Confirm archive" }).click()
    await expect(page.getByRole("status").filter({ hasText: "Archived" })).toBeVisible()
    await page.screenshot({
      path: `${artifactDir}/attach-replay-mock-ux-desktop-ok.png`,
      fullPage: true,
    })
  })

  test("mobile 390 private + foreign deny paths", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`file://${fixture}?scenario=private`)
    await page.getByRole("button", { name: "Attach replay" }).click()
    await page.getByLabel("Replay URL").fill(
      "https://replay.pokemonshowdown.com/gen9ou-1",
    )
    await page.getByRole("button", { name: "Preview" }).click()
    await expect(page.getByRole("alert")).toContainText("not public")
    await page.screenshot({
      path: `${artifactDir}/attach-replay-mock-ux-mobile390-private.png`,
      fullPage: true,
    })

    await page.goto(`file://${fixture}?scenario=foreign`)
    await page.getByRole("button", { name: "Attach replay" }).click()
    await page.getByLabel("Replay URL").fill(
      "https://replay.pokemonshowdown.com/gen9ou-1",
    )
    await page.getByRole("button", { name: "Preview" }).click()
    await expect(page.getByRole("alert")).toContainText("Not a participant")
    await page.screenshot({
      path: `${artifactDir}/attach-replay-mock-ux-mobile390-foreign.png`,
      fullPage: true,
    })
  })

  test("feature-off does not open archive dialog", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    page.once("dialog", async (d) => {
      expect(d.message()).toMatch(/archive is off/i)
      await d.dismiss()
    })
    await page.goto(`file://${fixture}?scenario=off`)
    await page.getByRole("button", { name: "Attach replay" }).click()
  })
})
