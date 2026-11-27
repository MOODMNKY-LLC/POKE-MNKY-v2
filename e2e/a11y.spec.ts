import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

const ROUTES = [
  "/",
  "/standings",
  "/teams",
  "/schedule",
  "/matches",
  "/playoffs",
  "/mvp",
  "/draft",
  "/draft/board",
  "/pokedex",
  "/insights",
  "/videos",
  "/showdown",
  "/teams/builder",
  "/auth/login",
  "/apply/coach",
  "/demo/season-sim",
  "/this-page-does-not-exist",
]

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`a11y (${colorScheme})`, () => {
    test.use({ colorScheme })

    for (const route of ROUTES) {
      test(`${route} has no serious/critical axe violations`, async ({ page }) => {
        await page.addInitScript((scheme) => {
          window.localStorage.setItem("theme", scheme)
        }, colorScheme)
        await page.goto(route)
        await page.waitForLoadState("networkidle")

        const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
        const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical")
        const report = blocking
          .map(
            (v) =>
              `${v.id} (${v.impact}): ${v.nodes
                .slice(0, 5)
                .map((n) => n.target.join(" "))
                .join(" | ")}`,
          )
          .join("\n")
        expect(blocking, `axe violations on ${route}:\n${report}`).toEqual([])
      })

      test(`${route} has one main landmark and a skip link first`, async ({ page }) => {
        await page.goto(route)
        await page.waitForLoadState("networkidle")

        await expect(page.locator("main")).toHaveCount(1)

        await page.keyboard.press("Tab")
        const focused = page.locator(":focus")
        await expect(focused).toHaveText("Skip to content")
        await expect(focused).toHaveAttribute("href", "#main-content")
      })
    }
  })
}
