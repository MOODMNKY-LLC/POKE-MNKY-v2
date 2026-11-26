import { expect, test, type Page } from "@playwright/test"

function contrast(a: number[], b: number[]) {
  const channel = (value: number) => {
    const s = value / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  const lum = (rgb: number[]) => 0.2126 * channel(rgb[0] ?? 0) + 0.7152 * channel(rgb[1] ?? 0) + 0.0722 * channel(rgb[2] ?? 0)
  const hi = Math.max(lum(a), lum(b))
  const lo = Math.min(lum(a), lum(b))
  return (hi + 0.05) / (lo + 0.05)
}

async function sampleLauncher(page: Page) {
  return page.getByTestId("assistant-launcher").evaluate((el) => {
    function parse(color: string): number[] {
      const match = color.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i)
      if (match) return [Number(match[1]), Number(match[2]), Number(match[3])]
      const canvas = document.createElement("canvas")
      canvas.width = 1
      canvas.height = 1
      const ctx = canvas.getContext("2d")
      if (!ctx) return [0, 0, 0]
      ctx.fillStyle = "#000000"
      ctx.fillStyle = color
      ctx.fillRect(0, 0, 1, 1)
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
      return [r, g, b]
    }
    const button = getComputedStyle(el)
    return {
      background: button.backgroundColor,
      foreground: button.color,
      backgroundRgb: parse(button.backgroundColor),
      foregroundRgb: parse(button.color),
    }
  })
}

async function expectContrast(page: Page) {
  let sample = await sampleLauncher(page)
  await expect.poll(async () => {
    sample = await sampleLauncher(page)
    return contrast(sample.backgroundRgb, sample.foregroundRgb)
  }).toBeGreaterThanOrEqual(4.5)
}

async function expectTouchTarget(page: Page, name: string) {
  const button = page.getByRole("button", { name })
  await expect(button).toBeVisible()
  await expect.poll(async () => {
    const box = await button.boundingBox()
    return Math.min(box?.width ?? 0, box?.height ?? 0)
  }, { message: `${name} is at least 44px` }).toBeGreaterThanOrEqual(44)
}

test.describe("Ask POKE MNKY dock", () => {
  test("desktop dialog has a title, returns focus, and keeps contrast", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto("/")
    const launcher = page.getByTestId("assistant-launcher")
    await expect(launcher).toBeVisible()
    await expectContrast(page)
    const launcherBox = await launcher.boundingBox()
    expect(launcherBox?.height ?? 0).toBeGreaterThanOrEqual(44)

    await launcher.click()
    const dialog = page.getByRole("dialog", { name: "POKE MNKY" })
    await expect(dialog).toBeVisible()
    await expect(dialog).toHaveAccessibleName("POKE MNKY")
    await expect(page.locator("[data-slot=dialog-title]")).toHaveText("POKE MNKY")
    await expectTouchTarget(page, "Close")
    const messageField = dialog.getByLabel("Message")
    if (await messageField.count()) {
      await expectTouchTarget(page, "Speak your question")
      await expectTouchTarget(page, "Read replies aloud")
      await expectTouchTarget(page, "Send message")
    } else {
      await expect(dialog.getByText(/unavailable/i)).toBeVisible()
    }

    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden()
    await expect(launcher).toBeFocused()

    await page.evaluate(() => document.documentElement.classList.add("dark"))
    await expect(page.locator("html.dark")).toHaveCount(1)
    await expectContrast(page)
  })

  for (const width of [320, 390]) {
    test(`phone sheet at ${width}px does not cover the page title`, async ({ page }) => {
      await page.setViewportSize({ width, height: 700 })
      await page.goto("/")
      await expect(page.getByTestId("assistant-dock")).toBeVisible()
      const closed = await page.evaluate(() => {
        const dock = document.querySelector("[data-testid='assistant-dock']")
        const heading = document.querySelector("h1, h2")
        if (!dock || !heading) return { ok: false }
        const dockBox = dock.getBoundingClientRect()
        const headingBox = heading.getBoundingClientRect()
        const overlaps = headingBox.bottom > dockBox.top + 1 && headingBox.top < dockBox.bottom && headingBox.right > dockBox.left && headingBox.left < dockBox.right
        return { ok: !overlaps && dockBox.bottom <= window.innerHeight + 1 }
      })
      expect(closed.ok).toBe(true)

      await page.getByTestId("assistant-launcher").click()
      const sheet = page.getByRole("dialog", { name: "POKE MNKY" })
      await expect(sheet).toBeVisible()
      await expect(sheet).toHaveAccessibleName("POKE MNKY")
      await expect(page.locator("[data-slot=sheet-title]")).toHaveText("POKE MNKY")
      const open = await page.evaluate(() => {
        const dock = document.querySelector("[data-testid='assistant-dock']")
        const dialog = document.querySelector("[role='dialog']")
        if (!dialog) return { ok: false }
        const dialogBox = dialog.getBoundingClientRect()
        const dockHidden = !dock || getComputedStyle(dock).display === "none" || dock.getBoundingClientRect().height === 0
        const onScreen = dialogBox.top >= -1 && dialogBox.left >= -1 && dialogBox.right <= window.innerWidth + 1
        return { ok: dockHidden && onScreen }
      })
      expect(open.ok).toBe(true)

      await page.keyboard.press("Escape")
      await expect(sheet).toBeHidden()
      await expect(page.getByTestId("assistant-launcher")).toBeFocused()
    })
  }
})
