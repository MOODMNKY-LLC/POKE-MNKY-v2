/**
 * Validate all three fixture composites + mask honesty metrics.
 * Usage: pnpm exec tsx scripts/logo-outfit-poc/src/validate-fixtures.ts
 */
import { readFileSync } from "node:fs"
import { join, resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import {
  assertOutsideMaskUnchanged,
  assertProtectedNeutralsUnchanged,
  compositeOutfit,
  countChangedPixels,
  maskStrength,
  type ResolvedPalette,
} from "./composite"
import { parseHex, suggestPaletteFromLogo } from "./extract"
import {
  assertBagEmblemSamplesUnchanged,
  assertBallPalettePolicy,
  assertHoldoutUnchanged,
  boxMask,
  circleMask,
  loadHoldouts,
} from "./holdouts"
import { readPng } from "./png"

const POC = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const REPO = resolve(POC, "../..")

type FixtureDef = {
  id: string
  logo: string
  useSuggested: boolean
  overrides: { primary: string; secondary: string; accent?: string } | null
}

function resolvePalette(f: FixtureDef): ResolvedPalette {
  const logo = readPng(join(POC, f.logo))
  const suggested = suggestPaletteFromLogo(logo)
  if (f.useSuggested || !f.overrides) {
    return {
      primary: suggested.primary,
      secondary: suggested.secondary,
      accent: suggested.accent,
    }
  }
  return {
    primary: parseHex(f.overrides.primary),
    secondary: parseHex(f.overrides.secondary),
    accent: f.overrides.accent ? parseHex(f.overrides.accent) : suggested.accent,
  }
}

function main(): void {
  const manifest = JSON.parse(
    readFileSync(join(POC, "fixtures/palettes.json"), "utf8"),
  ) as { fixtures: FixtureDef[]; jevExercised: boolean }

  if (manifest.jevExercised !== false) {
    throw new Error("jevExercised must be false for this POC")
  }
  if (manifest.fixtures.length !== 3) {
    throw new Error(`Expected 3 fixtures, got ${manifest.fixtures.length}`)
  }

  const base = readPng(join(REPO, "public/poke-mnky/avatars/red-blue.png"))
  const primary = readPng(join(POC, "masks/primary-mask.png"))
  const secondary = readPng(join(POC, "masks/secondary-mask.png"))

  if (base.width !== 1600 || base.height !== 1600) throw new Error("base dims")
  if (primary.width !== 1600 || secondary.width !== 1600) throw new Error("mask dims")

  // Mask honesty: count mask pixels that look like skin
  let skinInMask = 0
  let union = 0
  const n = 1600 * 1600
  for (let i = 0; i < n; i++) {
    const p = maskStrength(primary, i)
    const s = maskStrength(secondary, i)
    if (p <= 0 && s <= 0) continue
    union++
    const idx = i * 4
    const r = base.data[idx]!
    const g = base.data[idx + 1]!
    const b = base.data[idx + 2]!
    const a = base.data[idx + 3]!
    if (a < 200) continue
    if (r > 170 && g > 120 && b > 90 && b < 210 && r - b < 100) {
      skinInMask++
    }
  }

  console.log(`mask_union_pixels=${union} skinish_in_mask=${skinInMask}`)
  if (union < 20_000) throw new Error("mask union vacuous")
  if (union > 400_000) throw new Error("mask union over-broad")
  if (skinInMask > 800) {
    throw new Error(`Too much skin-like content in masks: ${skinInMask}`)
  }

  const holdouts = loadHoldouts()
  const ballRoi = circleMask(base.width, base.height, {
    ...holdouts.ball,
    rad: holdouts.ball.rad + (holdouts.ball.dilate_px ?? 0),
    dilate_px: 0,
  })
  const handRoi = circleMask(base.width, base.height, holdouts.hand_near_ball)
  const faceRoi = circleMask(
    base.width,
    base.height,
    holdouts.face ?? { cx: 800, cy: 515, rad: 160 },
  )

  for (const fixture of manifest.fixtures) {
    const palette = resolvePalette(fixture)
    const once = compositeOutfit(base, primary, secondary, palette)
    const twice = compositeOutfit(base, primary, secondary, palette)
    if (countChangedPixels(once, twice) !== 0) {
      throw new Error(`${fixture.id}: non-deterministic`)
    }

    const inv = assertOutsideMaskUnchanged(base, once, primary, secondary)
    if (inv.outsidePixelsChanged !== 0) {
      throw new Error(`${fixture.id}: outside mask changed ${inv.outsidePixelsChanged}`)
    }
    if (inv.alphaChangedAnywhere !== 0) {
      throw new Error(`${fixture.id}: alpha changed`)
    }

    const neutrals = assertProtectedNeutralsUnchanged(base, once, primary, secondary)
    if (neutrals.protectedChanged !== 0 || neutrals.maskIntersection !== 0) {
      throw new Error(`${fixture.id}: neutral protect failed ${JSON.stringify(neutrals)}`)
    }

    const changed = countChangedPixels(base, once)
    if (changed < 5_000) {
      throw new Error(`${fixture.id}: too few clothing pixels changed (${changed})`)
    }

    for (let i = 3; i < base.data.length; i += 4) {
      if (base.data[i] !== once.data[i]) {
        throw new Error(`${fixture.id}: alpha mismatch at ${i}`)
      }
    }

    // t25u: ball neutrals protected; chromatic top may remappart of primary
    const ball = assertBallPalettePolicy(base, once, ballRoi, primary, secondary)
    if (ball.neutralChanged !== 0 || ball.neutralInMask !== 0) {
      throw new Error(`${fixture.id}: ball neutral protect failed ${JSON.stringify(ball)}`)
    }
    if (ball.chromaticInMask < 500 || ball.chromaticChanged < 500) {
      throw new Error(
        `${fixture.id}: expected ball chroma to remappart of palette (t25u) ${JSON.stringify(ball)}`,
      )
    }

    const hand = assertHoldoutUnchanged(base, once, handRoi, primary, secondary)
    if (hand.changedPixels !== 0) {
      throw new Error(`${fixture.id}: hand holdout failed ${JSON.stringify(hand)}`)
    }
    const face = assertHoldoutUnchanged(base, once, faceRoi, primary, secondary)
    if (face.changedPixels > 200) {
      throw new Error(`${fixture.id}: face holdout leaked ${JSON.stringify(face)}`)
    }
    assertBagEmblemSamplesUnchanged(base, once, holdouts.bag_emblem_samples)

    // Ear identity: regression samples + ROI change ceilings
    for (const s of holdouts.ear_flesh_regression_samples ?? []) {
      const i = (s.y * base.width + s.x) * 4
      if (
        once.data[i] !== base.data[i] ||
        once.data[i + 1] !== base.data[i + 1] ||
        once.data[i + 2] !== base.data[i + 2] ||
        once.data[i + 3] !== base.data[i + 3]
      ) {
        throw new Error(`${fixture.id}: ear sample ${s.label} changed`)
      }
      const idx = s.y * base.width + s.x
      if (maskStrength(primary, idx) > 0 || maskStrength(secondary, idx) > 0) {
        throw new Error(`${fixture.id}: ear sample ${s.label} still in fabric mask`)
      }
    }
    let earChanged = 0
    for (const side of ["left", "right"] as const) {
      const roi = boxMask(base.width, base.height, holdouts.ears![side].roi_xyxy)
      for (let i = 0; i < roi.length; i++) {
        if (!roi[i]) continue
        const idx = i * 4
        if (
          once.data[idx] !== base.data[idx] ||
          once.data[idx + 1] !== base.data[idx + 1] ||
          once.data[idx + 2] !== base.data[idx + 2]
        ) {
          earChanged++
        }
      }
    }
    if (earChanged > 100) {
      throw new Error(`${fixture.id}: ear ROI recolor leak earChanged=${earChanged}`)
    }

    console.log(
      `PASS ${fixture.id} changed=${changed} union=${inv.maskUnionPixels} ` +
        `neutralsOk=${neutrals.protectedChecked} ballChromaChanged=${ball.chromaticChanged} ` +
        `ballNeutralOk=${ball.neutralProtected} handOk faceChanged=${face.changedPixels} earChanged=${earChanged}`,
    )
  }

  console.log("ALL_THREE_FIXTURES_VALIDATED")
  console.log(
    "POLICY ball_chromatic_panels=may_recolor_with_primary (t25u intentional)",
  )
}

main()
