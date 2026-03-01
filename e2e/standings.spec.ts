import { test, expect } from "@playwright/test"

/**
 * POKE MNKY v3: Standings page smoke test.
 * Public page - no auth required.
 */
test.describe("Standings page", () => {
  test("loads standings page", async ({ page }) => {
    await page.goto("/standings")
    await expect(page).toHaveTitle(/Average at Best|Battle League|Standings|Pokémon/i)
    await expect(page.getByRole("heading", { level: 1, name: "League Standings" })).toBeVisible({ timeout: 10000 })
  })
})
