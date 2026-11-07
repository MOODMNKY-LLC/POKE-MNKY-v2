import { readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import {
  assertOutsideMaskUnchanged,
  assertProtectedNeutralsUnchanged,
  compositeOutfit,
  countChangedPixels,
  maskStrength,
  paletteSwapToward,
} from "../src/composite"
import { parseHex, suggestPaletteFromLogo } from "../src/extract"
import {
  assertBagEmblemSamplesUnchanged,
  assertBallPalettePolicy,
  assertHoldoutUnchanged,
  boxMask,
  circleMask,
  loadHoldouts,
} from "../src/holdouts"
import { readPng } from "../src/png"

const __dirname = dirname(fileURLToPath(import.meta.url))
const POC = resolve(__dirname, "..")
const REPO = resolve(POC, "../..")

const SAMPLE_PALETTES = [
  {
    primary: [34, 197, 94] as [number, number, number],
    secondary: [124, 58, 237] as [number, number, number],
  },
  {
    primary: [32, 32, 32] as [number, number, number],
    secondary: [200, 200, 200] as [number, number, number],
  },
  {
    primary: [13, 148, 136] as [number, number, number],
    secondary: [234, 88, 12] as [number, number, number],
  },
]

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
    const out = compositeOutfit(base, primary, secondary, SAMPLE_PALETTES[0]!)
    let alphaDiffs = 0
    for (let i = 3; i < base.data.length; i += 4) {
      if (out.data[i] !== base.data[i]) alphaDiffs++
    }
    expect(alphaDiffs).toBe(0)
  }, 30_000)

  it("leaves all pixels outside union mask bitwise-identical", () => {
    const out = compositeOutfit(base, primary, secondary, SAMPLE_PALETTES[0]!)
    const report = assertOutsideMaskUnchanged(base, out, primary, secondary)
    expect(report.outsidePixelsChanged).toBe(0)
    expect(report.alphaChangedAnywhere).toBe(0)
    // Mask must be non-vacuous: some clothing pixels included
    expect(report.maskUnionPixels).toBeGreaterThan(20_000)
    // But not most of the character (would indicate over-broad mask)
    expect(report.maskUnionPixels).toBeLessThan(400_000)
  })

  it("is deterministic for the same palette", () => {
    const palette = SAMPLE_PALETTES[2]!
    const a = compositeOutfit(base, primary, secondary, palette)
    const b = compositeOutfit(base, primary, secondary, palette)
    expect(countChangedPixels(a, b)).toBe(0)
  })

  it("paletteSwapToward preserves relative ordering of luminance (shading)", () => {
    const dark = paletteSwapToward(40, 10, 10, [0, 200, 0])
    const bright = paletteSwapToward(220, 40, 40, [0, 200, 0])
    const ld = 0.2126 * dark[0] + 0.7152 * dark[1] + 0.0722 * dark[2]
    const lb = 0.2126 * bright[0] + 0.7152 * bright[1] + 0.0722 * bright[2]
    expect(lb).toBeGreaterThan(ld)
  })

  it("suggests a monochrome-aware palette for example-mono logo", () => {
    const logo = readPng(join(POC, "fixtures/logos/example-mono.png"))
    const s = suggestPaletteFromLogo(logo)
    expect(s.flags.monochrome_logo).toBe(true)
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

  it("protected B/W/neutral pixels stay unchanged and out of fabric masks (all 3 palettes)", () => {
    for (const palette of SAMPLE_PALETTES) {
      const out = compositeOutfit(base, primary, secondary, palette)
      const report = assertProtectedNeutralsUnchanged(base, out, primary, secondary)
      expect(report.protectedChecked).toBeGreaterThan(50_000)
      expect(report.protectedChanged).toBe(0)
      expect(report.maskIntersection).toBe(0)
    }
  }, 90_000)

  it("t25u ball policy: neutrals protected; chromatic top may remappart of primary", () => {
    const holdouts = loadHoldouts()
    expect(holdouts.policy?.ball_chromatic_panels).toBe("may_recolor_with_primary")
    const ballRoi = circleMask(base.width, base.height, {
      ...holdouts.ball,
      rad: holdouts.ball.rad + (holdouts.ball.dilate_px ?? 0),
      dilate_px: 0,
    })

    for (const palette of SAMPLE_PALETTES) {
      const out = compositeOutfit(base, primary, secondary, palette)
      const report = assertBallPalettePolicy(base, out, ballRoi, primary, secondary)
      expect(report.roiPixels).toBeGreaterThan(10_000)
      expect(report.neutralProtected).toBeGreaterThan(1_000)
      expect(report.neutralChanged).toBe(0)
      expect(report.neutralInMask).toBe(0)
      // Chromatic ball panels are intentionally eligible (coordinated with outfit)
      expect(report.chromaticInMask).toBeGreaterThan(500)
      expect(report.chromaticChanged).toBeGreaterThan(500)
    }
  }, 90_000)

  it("face / hand identity ROIs and bag emblems stay unchanged", () => {
    const holdouts = loadHoldouts()
    const handRoi = circleMask(base.width, base.height, holdouts.hand_near_ball)
    const faceRoi = circleMask(
      base.width,
      base.height,
      holdouts.face ?? { cx: 800, cy: 515, rad: 175 },
    )
    const out = compositeOutfit(base, primary, secondary, SAMPLE_PALETTES[0]!)
    const handReport = assertHoldoutUnchanged(base, out, handRoi, primary, secondary)
    expect(handReport.changedPixels).toBe(0)
    const faceReport = assertHoldoutUnchanged(base, out, faceRoi, primary, secondary)
    // Face ROI may overlap a few jacket edge pixels; require near-zero identity leak
    expect(faceReport.changedPixels).toBeLessThan(200)
    assertBagEmblemSamplesUnchanged(base, out, holdouts.bag_emblem_samples)
    // Emblem samples must also be outside masks
    for (const s of holdouts.bag_emblem_samples) {
      const i = s.y * base.width + s.x
      expect(maskStrength(primary, i) + maskStrength(secondary, i)).toBe(0)
    }
  }, 30_000)

  it("REGRESSION: old 2ef33e8 masks contained ear flesh; corrected masks must not", () => {
    const holdouts = loadHoldouts()
    expect(holdouts.regression?.failing_commit).toBe("2ef33e8")
    const oldPrimary = readPng(
      join(POC, holdouts.regression!.old_primary_mask ?? "regression/primary-mask-ear-leak-2ef33e8.png"),
    )
    const samples = holdouts.ear_flesh_regression_samples ?? []
    expect(samples.length).toBeGreaterThanOrEqual(8)

    let oldHits = 0
    let newHits = 0
    for (const s of samples) {
      if (s.base_rgb) {
        const i = (s.y * base.width + s.x) * 4
        expect(base.data[i]).toBe(s.base_rgb[0])
        expect(base.data[i + 1]).toBe(s.base_rgb[1])
        expect(base.data[i + 2]).toBe(s.base_rgb[2])
      }
      const idx = s.y * base.width + s.x
      if (maskStrength(oldPrimary, idx) > 0) oldHits++
      if (maskStrength(primary, idx) > 0 || maskStrength(secondary, idx) > 0) newHits++
    }
    // Known-failing samples were inside the old primary mask
    expect(oldHits).toBeGreaterThanOrEqual(8)
    // Corrected masks must exclude every regression sample
    expect(newHits).toBe(0)

    // Semantic right-ear ROI: old mask had thousands of hits; new must be near-zero on flesh samples path
    const rightRoi = boxMask(base.width, base.height, holdouts.ears!.right.roi_xyxy)
    let oldRoiMask = 0
    let newRoiMask = 0
    for (let i = 0; i < rightRoi.length; i++) {
      if (!rightRoi[i]) continue
      if (maskStrength(oldPrimary, i) > 0) oldRoiMask++
      if (maskStrength(primary, i) > 0 || maskStrength(secondary, i) > 0) newRoiMask++
    }
    expect(oldRoiMask).toBeGreaterThan(2000)
    // Allow tiny cloth-at-border residue; not thousands of flesh pixels
    expect(newRoiMask).toBeLessThan(80)
  })

  it("ear flesh samples + ear ROIs unchanged for all 3 palettes", () => {
    const holdouts = loadHoldouts()
    const samples = holdouts.ear_flesh_regression_samples ?? []
    const rightRoi = boxMask(base.width, base.height, holdouts.ears!.right.roi_xyxy)
    const leftRoi = boxMask(base.width, base.height, holdouts.ears!.left.roi_xyxy)

    for (const palette of SAMPLE_PALETTES) {
      const out = compositeOutfit(base, primary, secondary, palette)
      for (const s of samples) {
        const i = (s.y * base.width + s.x) * 4
        expect(out.data[i]).toBe(base.data[i])
        expect(out.data[i + 1]).toBe(base.data[i + 1])
        expect(out.data[i + 2]).toBe(base.data[i + 2])
        expect(out.data[i + 3]).toBe(base.data[i + 3])
        const idx = s.y * base.width + s.x
        expect(maskStrength(primary, idx) + maskStrength(secondary, idx)).toBe(0)
      }
      // Within ear ROIs: any changed pixel must be rare (cloth border only)
      let rightChanged = 0
      let leftChanged = 0
      for (let i = 0; i < rightRoi.length; i++) {
        if (!rightRoi[i]) continue
        const idx = i * 4
        if (
          out.data[idx] !== base.data[idx] ||
          out.data[idx + 1] !== base.data[idx + 1] ||
          out.data[idx + 2] !== base.data[idx + 2]
        ) {
          rightChanged++
        }
      }
      for (let i = 0; i < leftRoi.length; i++) {
        if (!leftRoi[i]) continue
        const idx = i * 4
        if (
          out.data[idx] !== base.data[idx] ||
          out.data[idx + 1] !== base.data[idx + 1] ||
          out.data[idx + 2] !== base.data[idx + 2]
        ) {
          leftChanged++
        }
      }
      expect(rightChanged).toBeLessThan(80)
      expect(leftChanged).toBeLessThan(80)
    }
  }, 90_000)
})
