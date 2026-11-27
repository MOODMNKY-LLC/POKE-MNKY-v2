import { expect, test, type Locator, type Page } from "@playwright/test"

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
})

function boxesOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  )
}

async function boxOrNull(locator: Locator) {
  if ((await locator.count()) === 0) return null
  if (!(await locator.first().isVisible())) return null
  return locator.first().boundingBox()
}

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement
    return doc.scrollWidth > doc.clientWidth + 1
  })
  expect(overflow, "page should not scroll horizontally at 390px").toBe(false)
}

async function assertNoDockMusicCtaOverlap(page: Page, ctaName: RegExp | string) {
  const dockLauncher = page.getByTestId("assistant-launcher")
  const musicInMenu = page.getByTestId("mobile-menu-music")
  // Floating music button must not exist anymore
  await expect(page.locator("button[title*='Music Player']")).toHaveCount(0)

  const cta = page.getByRole("link", { name: ctaName }).or(page.getByRole("button", { name: ctaName })).first()

  const dockBox = await boxOrNull(dockLauncher)
  const ctaBox = await boxOrNull(cta)

  if (dockBox && ctaBox) {
    expect(boxesOverlap(dockBox, ctaBox), "dock and primary CTA must not overlap").toBe(false)
  }

  // Open menu and confirm music control exists with accessible name, then close
  await page.getByRole("button", { name: /Toggle menu/i }).click()
  await expect(musicInMenu).toBeVisible()
  await expect(musicInMenu).toHaveAttribute("aria-label", "Open music player")
  await page.keyboard.press("Escape")
}

test.describe("mobile layout (390×844)", () => {
  test("home: no floating music overlap; no unexpected horizontal overflow", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    await assertNoHorizontalOverflow(page)
    await assertNoDockMusicCtaOverlap(page, /View standings|Sign in|Open draft/i)
  })

  test("apply to coach: no floating music; no unexpected horizontal overflow", async ({ page }) => {
    await page.goto("/apply/coach")
    await page.waitForLoadState("networkidle")
    await assertNoHorizontalOverflow(page)
    await assertNoDockMusicCtaOverlap(page, /Apply|Submit|Sign in/i)
  })
})
