import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8")

describe.each(["light", "dark"])("bg-league-%s utility", (theme) => {
  const start = css.indexOf(`@utility bg-league-${theme}`)
  const block = css.slice(start, css.indexOf("\n}\n", start))

  it("uses image-set with AVIF, WebP and PNG", () => {
    expect(block).toContain(`url("/league-bg-${theme}.avif") type("image/avif")`)
    expect(block).toContain(`url("/league-bg-${theme}.webp") type("image/webp")`)
    expect(block).toContain(`url("/league-bg-${theme}.png") type("image/png")`)
  })

  it("keeps a plain WebP fallback in @supports so the minifier cannot merge it away", () => {
    expect(block).toMatch(/@supports not \(background-image: image-set\(/)
    expect(block).toMatch(
      new RegExp(`@supports not[^{]*\\{\\s*background-image: url\\("/league-bg-${theme}\\.webp"\\);`),
    )
  })
})
