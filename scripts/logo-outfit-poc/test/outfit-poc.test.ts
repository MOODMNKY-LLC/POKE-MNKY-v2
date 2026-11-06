import { readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import {
  assertOutsideMaskUnchanged,
  compositeOutfit,
  countChangedPixels,
  tintToward,
} from "../src/composite"
import { parseHex, suggestPaletteFromLogo } from "../src/extract"
import { readPng } from "../src/png"

const __dirname = dirname(fileURLToPath(import.meta.url))
const POC = resolve(__dirname, "..")
const REPO = resolve(POC, "../..")

describe("logo-outfit-poc", () => {
  const base = readPng(join(REPO, "public/poke-mnky/avatars/red-blue.png"))
  const primary = readPng(join(POC, "masks/primary-mask.png"))
  const secondary = readPng(join(POC, "masks/secondary-mask.png"))

  it("registers masks to 1600x1600 base", () => {
    expect(base.width).toBe(1600)
    expect(base.height).toBe(1600)
    expect(primary.width).toBe(1600)
    expect(primary.height).toBe(1600)
    expect(secondary.width).toBe(1600)
    expect(secondary.height).toBe(1600)
  })

  it("keeps alpha channel of base intact after composite", () => {
    const out = compositeOutfit(base, primary, secondary, {
      primary: [34, 197, 94],
      secondary: [124, 58, 237],
    })
    let alphaDiffs = 0
    for (let i = 3; i < base.data.length; i += 4) {
      if (out.data[i] !== base.data[i]) alphaDiffs++
    }
    expect(alphaDiffs).toBe(0)
  }, 30_000)

  it("leaves all pixels outside union mask bitwise-identical", () => {
    const out = compositeOutfit(base, primary, secondary, {
      primary: [34, 197, 94],
      secondary: [124, 58, 237],
    })
    const report = assertOutsideMaskUnchanged(base, out, primary, secondary)
    expect(report.outsidePixelsChanged).toBe(0)
    expect(report.alphaChangedAnywhere).toBe(0)
    // Mask must be non-vacuous: some clothing pixels included
    expect(report.maskUnionPixels).toBeGreaterThan(20_000)
    // But not most of the character (would indicate over-broad mask)
    expect(report.maskUnionPixels).toBeLessThan(400_000)
  })

  it("is deterministic for the same palette", () => {
    const palette = { primary: [13, 148, 136] as [number, number, number], secondary: [234, 88, 12] as [number, number, number] }
    const a = compositeOutfit(base, primary, secondary, palette)
    const b = compositeOutfit(base, primary, secondary, palette)
    expect(countChangedPixels(a, b)).toBe(0)
  })

  it("tintToward preserves relative ordering of luminance", () => {
    const dark = tintToward(40, 10, 10, [0, 200, 0])
    const bright = tintToward(220, 40, 40, [0, 200, 0])
    const ld = 0.2126 * dark[0] + 0.7152 * dark[1] + 0.0722 * dark[2]
    const lb = 0.2126 * bright[0] + 0.7152 * bright[1] + 0.0722 * bright[2]
    expect(lb).toBeGreaterThan(ld)
  })

  it("suggests a monochrome-aware palette for example-mono logo", () => {
    const logo = readPng(join(POC, "fixtures/logos/example-mono.png"))
    const s = suggestPaletteFromLogo(logo)
    expect(s.flags.monochrome_logo).toBe(true)
    // Dark primary, light secondary
    const lp = 0.2126 * s.primary[0] + 0.7152 * s.primary[1] + 0.0722 * s.primary[2]
    const ls = 0.2126 * s.secondary[0] + 0.7152 * s.secondary[1] + 0.0722 * s.secondary[2]
    expect(lp).toBeLessThan(ls)
  })

  it("honors explicit hex overrides via parseHex", () => {
    expect(parseHex("#0D9488")).toEqual([13, 148, 136])
  })

  it("fixture manifest marks example data and jevExercised=false", () => {
    const raw = JSON.parse(readFileSync(join(POC, "fixtures/palettes.json"), "utf8"))
    expect(raw.jevExercised).toBe(false)
    expect(raw.fixtures).toHaveLength(3)
  })
})
