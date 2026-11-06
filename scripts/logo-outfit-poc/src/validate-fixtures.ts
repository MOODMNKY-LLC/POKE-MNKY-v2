/**
 * Validate all three fixture composites + mask honesty metrics.
 * Usage: pnpm exec tsx scripts/logo-outfit-poc/src/validate-fixtures.ts
 */
import { readFileSync } from "node:fs"
import { join, resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import {
  assertOutsideMaskUnchanged,
  compositeOutfit,
  countChangedPixels,
  maskStrength,
  type ResolvedPalette,
} from "./composite"
import { parseHex, suggestPaletteFromLogo } from "./extract"
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

  // Mask honesty: count mask pixels that look like skin / near-white ball band
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
    // peach-ish skin (broad) — masks must not include face/ear flesh
    if (r > 170 && g > 120 && b > 90 && b < 210 && r - b < 100) {
      skinInMask++
    }
  }

  console.log(`mask_union_pixels=${union} skinish_in_mask=${skinInMask}`)
  if (union < 20_000) throw new Error("mask union vacuous")
  if (union > 400_000) throw new Error("mask union over-broad")
  // Honest ceiling: residual highlight/edge ambiguity OK in low hundreds; thousands = leak
  if (skinInMask > 800) {
    throw new Error(`Too much skin-like content in masks: ${skinInMask}`)
  }

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

    const changed = countChangedPixels(base, once)
    if (changed < 5_000) {
      throw new Error(`${fixture.id}: too few clothing pixels changed (${changed})`)
    }

    // Alpha identical byte-for-byte
    for (let i = 3; i < base.data.length; i += 4) {
      if (base.data[i] !== once.data[i]) {
        throw new Error(`${fixture.id}: alpha mismatch at ${i}`)
      }
    }

    console.log(
      `PASS ${fixture.id} changed=${changed} outsideOk=${inv.outsidePixelsChecked} union=${inv.maskUnionPixels}`,
    )
  }

  console.log("ALL_THREE_FIXTURES_VALIDATED")
}

main()
