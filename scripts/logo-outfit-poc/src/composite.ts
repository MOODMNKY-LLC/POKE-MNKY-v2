import type { RgbaImage } from "./png"
import { assertSameSize, cloneImage } from "./png"

export type ResolvedPalette = {
  primary: [number, number, number]
  secondary: [number, number, number]
  /** Optional accent unused by this POC compositor (reserved). */
  accent?: [number, number, number]
}

function lum(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Luminance-preserving fabric palette swap toward `target`.
 * Keeps relative brightness so cell shading / panel texture survives a flat kit color.
 * (Formerly described as tintToward — same math, clearer intent for t24u.)
 */
export function paletteSwapToward(
  r: number,
  g: number,
  b: number,
  target: [number, number, number],
): [number, number, number] {
  const y = lum(r, g, b)
  const yt = Math.max(lum(target[0], target[1], target[2]), 1)
  const scale = y / yt
  return [
    Math.max(0, Math.min(255, Math.round(target[0] * scale))),
    Math.max(0, Math.min(255, Math.round(target[1] * scale))),
    Math.max(0, Math.min(255, Math.round(target[2] * scale))),
  ]
}

/** @deprecated alias — prefer paletteSwapToward */
export const tintToward = paletteSwapToward

/** Mask strength 0..1 from grayscale (or R of RGBA) mask pixel. */
export function maskStrength(mask: RgbaImage, i: number): number {
  // Prefer R; L masks decode as equal RGB in pngjs when saved as gray PNG via PIL L→ often RGB
  const idx = i * 4
  return mask.data[idx]! / 255
}

/**
 * True when a base pixel is treated as protected monochrome / neutral
 * (near-white, near-black low-chroma, or midtone low-chroma). Used by tests.
 */
export function isProtectedNeutral(
  r: number,
  g: number,
  b: number,
  a: number,
): boolean {
  if (a < 200) return false
  const y = lum(r, g, b)
  const chroma = Math.max(r, g, b) - Math.min(r, g, b)
  if (y >= 210 && chroma < 55) return true
  if (y <= 48 && chroma < 38) return true
  if (chroma < 28 && y > 48 && y < 210) return true
  return false
}

/**
 * Composite palette onto base using primary/secondary fabric masks.
 * Pixels with zero union mask strength are bitwise-identical RGBA.
 * Alpha is never written.
 */
export function compositeOutfit(
  base: RgbaImage,
  primaryMask: RgbaImage,
  secondaryMask: RgbaImage,
  palette: ResolvedPalette,
): RgbaImage {
  assertSameSize(base, primaryMask, "primaryMask")
  assertSameSize(base, secondaryMask, "secondaryMask")
  const out = cloneImage(base)
  const n = base.width * base.height

  for (let i = 0; i < n; i++) {
    const p = maskStrength(primaryMask, i)
    const s = maskStrength(secondaryMask, i)
    if (p <= 0 && s <= 0) continue

    const idx = i * 4
    const r = base.data[idx]!
    const g = base.data[idx + 1]!
    const b = base.data[idx + 2]!
    // alpha untouched: out already cloned

    let nr = r
    let ng = g
    let nb = b

    if (p > 0) {
      const [tr, tg, tb] = paletteSwapToward(r, g, b, palette.primary)
      nr = Math.round(r * (1 - p) + tr * p)
      ng = Math.round(g * (1 - p) + tg * p)
      nb = Math.round(b * (1 - p) + tb * p)
    }
    if (s > 0) {
      // If both (shouldn't after authoring), secondary wins proportionally on residual
      const [tr, tg, tb] = paletteSwapToward(nr, ng, nb, palette.secondary)
      nr = Math.round(nr * (1 - s) + tr * s)
      ng = Math.round(ng * (1 - s) + tg * s)
      nb = Math.round(nb * (1 - s) + tb * s)
    }

    out.data[idx] = nr
    out.data[idx + 1] = ng
    out.data[idx + 2] = nb
  }

  return out
}

/** Count pixels where RGBA differs between a and b. */
export function countChangedPixels(a: RgbaImage, b: RgbaImage): number {
  assertSameSize(a, b, "countChangedPixels")
  let changed = 0
  const n = a.width * a.height
  for (let p = 0; p < n; p++) {
    const i = p * 4
    if (
      a.data[i] !== b.data[i] ||
      a.data[i + 1] !== b.data[i + 1] ||
      a.data[i + 2] !== b.data[i + 2] ||
      a.data[i + 3] !== b.data[i + 3]
    ) {
      changed++
    }
  }
  return changed
}

export type OutsideMaskReport = {
  outsidePixelsChecked: number
  outsidePixelsChanged: number
  alphaChangedAnywhere: number
  maskUnionPixels: number
}

/** Prove RGBA outside union(mask) is unchanged and alpha never changes. */
export function assertOutsideMaskUnchanged(
  base: RgbaImage,
  result: RgbaImage,
  primaryMask: RgbaImage,
  secondaryMask: RgbaImage,
): OutsideMaskReport {
  assertSameSize(base, result, "result")
  const n = base.width * base.height
  let outside = 0
  let outsideChanged = 0
  let alphaChanged = 0
  let union = 0

  for (let i = 0; i < n; i++) {
    const p = maskStrength(primaryMask, i)
    const s = maskStrength(secondaryMask, i)
    const idx = i * 4
    if (base.data[idx + 3] !== result.data[idx + 3]) alphaChanged++

    if (p <= 0 && s <= 0) {
      outside++
      if (
        base.data[idx] !== result.data[idx] ||
        base.data[idx + 1] !== result.data[idx + 1] ||
        base.data[idx + 2] !== result.data[idx + 2] ||
        base.data[idx + 3] !== result.data[idx + 3]
      ) {
        outsideChanged++
      }
    } else {
      union++
    }
  }

  return {
    outsidePixelsChecked: outside,
    outsidePixelsChanged: outsideChanged,
    alphaChangedAnywhere: alphaChanged,
    maskUnionPixels: union,
  }
}

export type NeutralProtectReport = {
  protectedChecked: number
  protectedChanged: number
  maskIntersection: number
}

/**
 * All protected-neutral base pixels must be bitwise-identical after composite,
 * and must not sit inside the fabric masks.
 */
export function assertProtectedNeutralsUnchanged(
  base: RgbaImage,
  result: RgbaImage,
  primaryMask: RgbaImage,
  secondaryMask: RgbaImage,
): NeutralProtectReport {
  assertSameSize(base, result, "result")
  const n = base.width * base.height
  let checked = 0
  let changed = 0
  let maskIntersection = 0

  for (let i = 0; i < n; i++) {
    const idx = i * 4
    const r = base.data[idx]!
    const g = base.data[idx + 1]!
    const b = base.data[idx + 2]!
    const a = base.data[idx + 3]!
    if (!isProtectedNeutral(r, g, b, a)) continue
    checked++
    const p = maskStrength(primaryMask, i)
    const s = maskStrength(secondaryMask, i)
    if (p > 0 || s > 0) maskIntersection++
    if (
      result.data[idx] !== r ||
      result.data[idx + 1] !== g ||
      result.data[idx + 2] !== b ||
      result.data[idx + 3] !== a
    ) {
      changed++
    }
  }

  return {
    protectedChecked: checked,
    protectedChanged: changed,
    maskIntersection,
  }
}
