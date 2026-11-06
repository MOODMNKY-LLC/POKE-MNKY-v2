import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import type { RgbaImage } from "./png"
import { isProtectedNeutral, maskStrength } from "./composite"

const POC_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")

export type CircleHoldout = { cx: number; cy: number; rad: number; dilate_px?: number }

export type HoldoutsFile = {
  ball: CircleHoldout
  hand_near_ball: CircleHoldout
  face?: CircleHoldout
  bag_emblem_samples: Array<{ x: number; y: number; label: string }>
  emblem_discs?: Array<CircleHoldout & { label?: string }>
  policy?: {
    ball_chromatic_panels?: string
    ball_white_black_seam_highlights?: string
    [key: string]: unknown
  }
}

export function loadHoldouts(): HoldoutsFile {
  return JSON.parse(readFileSync(join(POC_ROOT, "holdouts.json"), "utf8")) as HoldoutsFile
}

/** Inclusive disk; optional dilate expands radius (matches author_masks MaxFilter intent). */
export function circleMask(
  width: number,
  height: number,
  circle: CircleHoldout,
): Uint8Array {
  const rad = circle.rad + (circle.dilate_px ?? 0)
  const out = new Uint8Array(width * height)
  const r2 = rad * rad
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - circle.cx
      const dy = y - circle.cy
      if (dx * dx + dy * dy <= r2) out[y * width + x] = 1
    }
  }
  return out
}

export type HoldoutReport = {
  roiPixels: number
  changedPixels: number
  maskIntersection: number
}

/** Semantic holdout: every RGBA pixel inside ROI must match base. */
export function assertHoldoutUnchanged(
  base: RgbaImage,
  result: RgbaImage,
  roi: Uint8Array,
  primaryMask: RgbaImage,
  secondaryMask: RgbaImage,
): HoldoutReport {
  let roiPixels = 0
  let changed = 0
  let maskIntersection = 0
  const n = base.width * base.height
  for (let i = 0; i < n; i++) {
    if (!roi[i]) continue
    roiPixels++
    const p = maskStrength(primaryMask, i)
    const s = maskStrength(secondaryMask, i)
    if (p > 0 || s > 0) maskIntersection++
    const idx = i * 4
    if (
      base.data[idx] !== result.data[idx] ||
      base.data[idx + 1] !== result.data[idx + 1] ||
      base.data[idx + 2] !== result.data[idx + 2] ||
      base.data[idx + 3] !== result.data[idx + 3]
    ) {
      changed++
    }
  }
  return { roiPixels, changedPixels: changed, maskIntersection }
}

export type BallPolicyReport = {
  roiPixels: number
  /** Near-white / near-black / low-chroma pixels inside ball — must stay identical. */
  neutralProtected: number
  neutralChanged: number
  neutralInMask: number
  /** Chromatic (non-neutral) ball pixels — may remappart of primary swap (t25u). */
  chromaticPixels: number
  chromaticChanged: number
  chromaticInMask: number
}

/**
 * t25u ball policy: protect white/black/seam/highlights; allow chromatic top to swap.
 */
export function assertBallPalettePolicy(
  base: RgbaImage,
  result: RgbaImage,
  ballRoi: Uint8Array,
  primaryMask: RgbaImage,
  secondaryMask: RgbaImage,
): BallPolicyReport {
  let roiPixels = 0
  let neutralProtected = 0
  let neutralChanged = 0
  let neutralInMask = 0
  let chromaticPixels = 0
  let chromaticChanged = 0
  let chromaticInMask = 0
  const n = base.width * base.height

  for (let i = 0; i < n; i++) {
    if (!ballRoi[i]) continue
    roiPixels++
    const idx = i * 4
    const r = base.data[idx]!
    const g = base.data[idx + 1]!
    const b = base.data[idx + 2]!
    const a = base.data[idx + 3]!
    if (a < 200) continue

    const p = maskStrength(primaryMask, i)
    const s = maskStrength(secondaryMask, i)
    const inMask = p > 0 || s > 0
    const changed =
      result.data[idx] !== r ||
      result.data[idx + 1] !== g ||
      result.data[idx + 2] !== b ||
      result.data[idx + 3] !== a

    if (isProtectedNeutral(r, g, b, a)) {
      neutralProtected++
      if (inMask) neutralInMask++
      if (changed) neutralChanged++
    } else {
      chromaticPixels++
      if (inMask) chromaticInMask++
      if (changed) chromaticChanged++
    }
  }

  return {
    roiPixels,
    neutralProtected,
    neutralChanged,
    neutralInMask,
    chromaticPixels,
    chromaticChanged,
    chromaticInMask,
  }
}

/** Bag emblem samples should remain near-white on base and unchanged after composite. */
export function assertBagEmblemSamplesUnchanged(
  base: RgbaImage,
  result: RgbaImage,
  samples: Array<{ x: number; y: number; label: string }>,
): void {
  for (const s of samples) {
    const i = (s.y * base.width + s.x) * 4
    const br = base.data[i]!
    const bg = base.data[i + 1]!
    const bb = base.data[i + 2]!
    const ba = base.data[i + 3]!
    // Skip if sample missed the emblem (not near-white / transparent)
    if (ba < 200 || br < 180 || bg < 180 || bb < 180) {
      throw new Error(
        `bag emblem sample ${s.label} @(${s.x},${s.y}) not near-white on base (got ${br},${bg},${bb},${ba}) — update holdouts.json`,
      )
    }
    if (
      result.data[i] !== br ||
      result.data[i + 1] !== bg ||
      result.data[i + 2] !== bb ||
      result.data[i + 3] !== ba
    ) {
      throw new Error(`bag emblem sample ${s.label} changed after composite`)
    }
  }
}
