/**
 * Responsive checks for /dev/mobile-layout-fixture at phone/tablet/desktop widths.
 * Requires a running Next server (default http://127.0.0.1:3000) and Playwright browsers.
 *
 * Usage: node scripts/verify-mobile-layout-polish.mjs [baseUrl]
 */
import { chromium } from "@playwright/test"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

const baseUrl = process.argv[2] || process.env.BASE_URL || "http://127.0.0.1:3000"
const outDir = path.resolve("test-results/mobile-layout-polish")
const viewports = [
  { name: "phone-320", width: 320, height: 740 },
  { name: "phone-360", width: 360, height: 740 },
  { name: "phone-390", width: 390, height: 844 },
  { name: "phone-412", width: 412, height: 915 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1280", width: 1280, height: 800 },
]

async function checkViewport(browser, viewport) {
  const page = await browser.newPage({
    viewport: { width: viewport.width, height: viewport.height },
    colorScheme: "dark",
  })
  const url = `${baseUrl}/dev/mobile-layout-fixture`
  const response = await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 })
  if (!response || !response.ok()) {
    throw new Error(`Failed to load ${url}: ${response?.status()}`)
  }

  await page.locator('[data-testid="coach-quick-view-card"]').first().waitFor({ state: "visible", timeout: 30_000 })

  // Root-layout assistant FAB is not tab-bar-aware outside /dashboard; hide it on the fixture so More is reachable.
  await page.addStyleTag({
    content: `[aria-label="Open POKE MNKY"]{display:none!important}`,
  })

  const metrics = await page.evaluate(() => {
    const doc = document.documentElement
    const card = document.querySelector('[data-testid="coach-quick-view-card"]')
    const tabBar = document.querySelector('[data-testid="mobile-tab-bar"]')
    const more = document.querySelector('[data-testid="mobile-tab-more"]')
    const fab = document.querySelector('[data-testid="fab-clearance-marker"]')
    const welcome = document.querySelector("h1")

    const cardText = card?.innerText ?? ""
    const cardRect = card?.getBoundingClientRect()
    const tabRect = tabBar?.getBoundingClientRect()
    const moreRect = more?.getBoundingClientRect()
    const fabRect = fab?.getBoundingClientRect()

    const overlaps = (a, b) =>
      Boolean(a && b && !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom))

    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      hasHorizontalOverflow: doc.scrollWidth > doc.clientWidth + 1,
      welcomeVisible: Boolean(welcome && welcome.getClientRects().length > 0),
      cardHasRecord: /\d+W\s*-\s*\d+L/i.test(cardText),
      cardHasUtilized: /%\s*utilized/i.test(cardText),
      cardHasCoachName: /POKE MNKY/i.test(cardText),
      cardFullyInViewport: Boolean(
        cardRect && cardRect.left >= -1 && cardRect.right <= window.innerWidth + 1,
      ),
      tabBarVisible: Boolean(tabBar && getComputedStyle(tabBar).display !== "none"),
      moreVisible: Boolean(more && more.getClientRects().length > 0),
      moreMinWidth: moreRect ? moreRect.width : 0,
      fabOverlapsMore: overlaps(fabRect, moreRect),
      fabOverlapsTabBar: overlaps(fabRect, tabRect),
    }
  })

  const shotPath = path.join(outDir, `${viewport.name}.png`)
  await page.screenshot({ path: shotPath, fullPage: true })

  const isMobile = viewport.width < 768
  const failures = []
  if (metrics.hasHorizontalOverflow) failures.push("horizontal page overflow")
  if (!metrics.welcomeVisible) failures.push("welcome heading missing")
  if (!metrics.cardHasRecord) failures.push("record not visible in card text")
  if (!metrics.cardHasUtilized) failures.push("utilization not visible in card text")
  if (!metrics.cardHasCoachName) failures.push("coach name missing")
  if (!metrics.cardFullyInViewport) failures.push("card clipped horizontally")
  if (isMobile) {
    if (!metrics.tabBarVisible) failures.push("mobile tab bar hidden")
    if (!metrics.moreVisible) failures.push("More control missing")
    if (metrics.moreMinWidth < 44) failures.push(`More target too small (${metrics.moreMinWidth}px)`)
    if (metrics.fabOverlapsMore) failures.push("fixture FAB marker overlaps More")
    if (metrics.fabOverlapsTabBar) failures.push("fixture FAB marker overlaps tab bar")

    await page.getByTestId("mobile-tab-more").click()
    await page.waitForTimeout(400)
    const moreOpen = await page.evaluate(() => ({
      expanded: document.querySelector('[data-testid="mobile-tab-more"]')?.getAttribute("aria-expanded") === "true",
      dialog: Boolean(document.querySelector('[role="dialog"]')),
    }))
    if (!moreOpen.expanded || !moreOpen.dialog) {
      failures.push("More sheet did not open")
    } else {
      const moreShot = path.join(outDir, `${viewport.name}-more-sheet.png`)
      await page.screenshot({ path: moreShot })
      await page.keyboard.press("Escape")
      await page.waitForTimeout(200)
    }
  } else if (metrics.tabBarVisible) {
    failures.push("tab bar should be hidden on tablet/desktop")
  }

  await page.close()
  return { viewport: viewport.name, width: viewport.width, failures, metrics, shotPath }
}

async function main() {
  await mkdir(outDir, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const results = []
  try {
    for (const viewport of viewports) {
      results.push(await checkViewport(browser, viewport))
    }
  } finally {
    await browser.close()
  }

  const reportPath = path.join(outDir, "report.json")
  await writeFile(reportPath, JSON.stringify({ baseUrl, results }, null, 2))

  const failed = results.filter((r) => r.failures.length > 0)
  for (const r of results) {
    const status = r.failures.length ? "FAIL" : "PASS"
    console.log(`${status} ${r.viewport} (${r.width}px) → ${r.shotPath}`)
    if (r.failures.length) console.log(`  ${r.failures.join("; ")}`)
  }
  console.log(`Report: ${reportPath}`)
  if (failed.length) {
    process.exitCode = 1
  }
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
