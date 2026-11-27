import { expect, test } from "@playwright/test"
import { getPublicFooterHrefs, getPublicInternalHrefs } from "../lib/nav/public-nav"

const INTERNAL_HEADER_HREFS = getPublicInternalHrefs()
const FOOTER_INTERNAL_HREFS = getPublicFooterHrefs().filter((h) => h.startsWith("/"))

test.describe("public navigation shell", () => {
  test("skip link is the first tab stop and jumps to main", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    await page.keyboard.press("Tab")
    const focused = page.locator(":focus")
    await expect(focused).toHaveText("Skip to content")
    await expect(focused).toHaveAttribute("href", "#main-content")
    await page.keyboard.press("Enter")
    await expect(page.locator("#main-content")).toBeFocused()
  })

  test("header and footer internal links return 200", async ({ page, request }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    const hrefs = [...new Set([...INTERNAL_HEADER_HREFS, ...FOOTER_INTERNAL_HREFS])]
    for (const href of hrefs) {
      const response = await request.get(href)
      expect(response.status(), `${href} should return 200`).toBeLessThan(400)
    }
  })

  test("unauthenticated /admin redirects to login (admin shell hide covered by unit test)", async ({
    page,
  }) => {
    await page.goto("/admin")
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10000 })
  })

  test("404 shows branded recovery links", async ({ page }) => {
    await page.goto("/this-page-does-not-exist")
    await page.waitForLoadState("networkidle")
    await expect(page.getByRole("heading", { name: /This page fainted/i })).toBeVisible()
    await expect(page.getByRole("link", { name: "Home" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Standings" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Draft board" })).toBeVisible()
    await expect(page.locator("main")).toHaveCount(1)
  })

  test("header exposes Matches, Playoffs, MVP, Damage calc, and Apply to coach", async ({ page }) => {
    await page.goto("/")
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.waitForLoadState("networkidle")

    await page.getByRole("button", { name: /League/i }).click()
    await expect(page.getByRole("menuitem", { name: "Matches" })).toBeVisible()
    await expect(page.getByRole("menuitem", { name: "Playoffs" })).toBeVisible()
    await expect(page.getByRole("menuitem", { name: "MVP" })).toBeVisible()
    await page.keyboard.press("Escape")

    await page.getByRole("button", { name: /Battle/i }).click()
    await expect(page.getByRole("menuitem", { name: "Damage calc" })).toBeVisible()
    await page.keyboard.press("Escape")

    await page.getByRole("button", { name: /Join/i }).click()
    await expect(page.getByRole("menuitem", { name: "Apply to coach" })).toBeVisible()
  })
})
