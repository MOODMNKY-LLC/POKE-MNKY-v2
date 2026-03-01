import { test, expect } from "@playwright/test"

/**
 * POKE MNKY v3: Auth flow – protected routes redirect to login.
 */
test.describe("Auth protection", () => {
  test("dashboard redirects to login when unauthenticated", async ({ page }) => {
    await page.goto("/dashboard")
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10000 })
  })

  test("admin redirects to login when unauthenticated", async ({ page }) => {
    await page.goto("/admin")
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10000 })
  })
})
