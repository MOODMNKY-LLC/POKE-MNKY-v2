import type { RgbaImage } from "./png"

export type SuggestedPalette = {
  primary: [number, number, number]
  secondary: [number, number, number]
  accent: [number, number, number]
  flags: {
    monochrome_logo: boolean
    low_chroma: boolean
    transparent_heavy: boolean
  }
  /** Hex strings for fixtures / docs */
  primaryHex: string
  secondaryHex: string
  accentHex: string
}

function toHex(rgb: [number, number, number]): string {
  return (
    "#" +
    rgb
      .map((c) => c.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  )
}

function lum(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function chroma(r: number, g: number, b: number): number {
  return Math.max(r, g, b) - Math.min(r, g, b)
}

/**
 * Deterministic, offline palette suggestions from a logo raster.
 * Quantizes opaque pixels into coarse RGB buckets, ranks by count,
 * then picks up to three distinct hues. Not ML / not Jev.
 */
export function suggestPaletteFromLogo(logo: RgbaImage): SuggestedPalette {
  const buckets = new Map<string, { rgb: [number, number, number]; count: number }>()
  let opaque = 0
  let transparent = 0
  let chromaSum = 0

  const n = logo.width * logo.height
  for (let i = 0; i < n; i++) {
    const idx = i * 4
    const a = logo.data[idx + 3]!
    if (a < 128) {
      transparent++
      continue
    }
    opaque++
    const r = logo.data[idx]!
    const g = logo.data[idx + 1]!
    const b = logo.data[idx + 2]!
    chromaSum += chroma(r, g, b)
    // 32-level quantization
    const qr = Math.min(224, r & ~31)
    const qg = Math.min(224, g & ~31)
    const qb = Math.min(224, b & ~31)
    const key = `${qr},${qg},${qb}`
    const prev = buckets.get(key)
    if (prev) prev.count++
    else buckets.set(key, { rgb: [qr, qg, qb], count: 1 })
  }

  const ranked = [...buckets.values()].sort((a, b) => b.count - a.count)
  const avgChroma = opaque ? chromaSum / opaque : 0
  const transparentHeavy = opaque + transparent > 0 && transparent / (opaque + transparent) > 0.55
  const monochrome = avgChroma < 28
  const lowChroma = avgChroma < 48

  const pickDistinct = (minDelta: number): [number, number, number][] => {
    const out: [number, number, number][] = []
    for (const entry of ranked) {
      if (out.every((c) => colorDist(c, entry.rgb) >= minDelta)) {
        out.push(entry.rgb)
      }
      if (out.length >= 3) break
    }
    return out
  }

  let colors = pickDistinct(55)
  if (colors.length < 2) colors = pickDistinct(30)
  if (colors.length === 0) colors = [[32, 32, 32], [220, 220, 220], [128, 128, 128]]

  // Prefer higher-chroma as primary when available
  const byChroma = [...colors].sort(
    (a, b) => chroma(b[0], b[1], b[2]) - chroma(a[0], a[1], a[2]),
  )
  const primary = byChroma[0] ?? ([32, 32, 32] as [number, number, number])
  const secondary =
    byChroma.find((c) => colorDist(c, primary) >= 40) ??
    ([220, 220, 220] as [number, number, number])
  const accent =
    byChroma.find((c) => colorDist(c, primary) >= 35 && colorDist(c, secondary) >= 35) ??
    ([lum(...primary) > 128 ? 20 : 230, lum(...primary) > 128 ? 20 : 230, lum(...primary) > 128 ? 20 : 230] as [
      number,
      number,
      number,
    ])

  // Monochrome logos: keep meaningful B/W roles (dark primary, light secondary)
  let resolvedPrimary = primary
  let resolvedSecondary = secondary
  let resolvedAccent = accent
  if (monochrome) {
    const dark = colors.reduce((a, c) => (lum(...c) < lum(...a) ? c : a), colors[0]!)
    const light = colors.reduce((a, c) => (lum(...c) > lum(...a) ? c : a), colors[0]!)
    resolvedPrimary = dark
    resolvedSecondary = light
    resolvedAccent = [128, 128, 128]
  }

  return {
    primary: resolvedPrimary,
    secondary: resolvedSecondary,
    accent: resolvedAccent,
    flags: {
      monochrome_logo: monochrome,
      low_chroma: lowChroma,
      transparent_heavy: transparentHeavy,
    },
    primaryHex: toHex(resolvedPrimary),
    secondaryHex: toHex(resolvedSecondary),
    accentHex: toHex(resolvedAccent),
  }
}

function colorDist(a: [number, number, number], b: [number, number, number]): number {
  const dr = a[0] - b[0]
  const dg = a[1] - b[1]
  const db = a[2] - b[2]
  return Math.sqrt(dr * dr + dg * dg + db * db)
}

export function parseHex(hex: string): [number, number, number] {
  const h = hex.replace("#", "").trim()
  if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error(`Invalid hex color: ${hex}`)
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
