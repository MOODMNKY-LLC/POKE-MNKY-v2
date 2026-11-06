/**
 * Offline logo→outfit recolor POC runner.
 * Usage (from repo root): pnpm logo-outfit:poc
 *
 * Does NOT call Jev, OpenAI, or any paid inference.
 * Does NOT touch app routes, storage, or DB.
 */

import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import {
  assertOutsideMaskUnchanged,
  compositeOutfit,
  type ResolvedPalette,
} from "./composite"
import { parseHex, suggestPaletteFromLogo } from "./extract"
import { readPng, writePng, type RgbaImage } from "./png"

const __dirname = dirname(fileURLToPath(import.meta.url))
const POC_ROOT = resolve(__dirname, "..")
const REPO_ROOT = resolve(POC_ROOT, "../..")

type FixtureDef = {
  id: string
  label: string
  logo: string
  useSuggested: boolean
  overrides: { primary: string; secondary: string; accent?: string } | null
}

type PaletteFile = {
  baseAvatar: string
  jevExercised: boolean
  fixtures: FixtureDef[]
}

function placeOnBackground(src: RgbaImage, bg: [number, number, number], size: number): RgbaImage {
  // Nearest-neighbor downscale then composite onto opaque bg
  const out: RgbaImage = {
    width: size,
    height: size,
    data: new Uint8Array(size * size * 4),
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sx = Math.min(src.width - 1, Math.floor((x / size) * src.width))
      const sy = Math.min(src.height - 1, Math.floor((y / size) * src.height))
      const si = (sy * src.width + sx) * 4
      const di = (y * size + x) * 4
      const a = src.data[si + 3]! / 255
      out.data[di] = Math.round(src.data[si]! * a + bg[0] * (1 - a))
      out.data[di + 1] = Math.round(src.data[si + 1]! * a + bg[1] * (1 - a))
      out.data[di + 2] = Math.round(src.data[si + 2]! * a + bg[2] * (1 - a))
      out.data[di + 3] = 255
    }
  }
  return out
}

function contactSheet(
  cells: RgbaImage[],
  cols: number,
  cellSize: number,
  labels?: string[],
): RgbaImage {
  const rows = Math.ceil(cells.length / cols)
  const labelH = labels ? 24 : 0
  const width = cols * cellSize
  const height = rows * (cellSize + labelH)
  const out: RgbaImage = {
    width,
    height,
    data: new Uint8Array(width * height * 4).fill(255),
  }
  // light gray canvas
  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i] = 240
    out.data[i + 1] = 240
    out.data[i + 2] = 242
    out.data[i + 3] = 255
  }

  cells.forEach((cell, idx) => {
    const col = idx % cols
    const row = Math.floor(idx / cols)
    const ox = col * cellSize
    const oy = row * (cellSize + labelH)
    for (let y = 0; y < cellSize; y++) {
      for (let x = 0; x < cellSize; x++) {
        const si = (y * cell.width + x) * 4
        const di = ((oy + y) * width + (ox + x)) * 4
        out.data[di] = cell.data[si]!
        out.data[di + 1] = cell.data[si + 1]!
        out.data[di + 2] = cell.data[si + 2]!
        out.data[di + 3] = 255
      }
    }
  })
  return out
}

function main(): void {
  const outDir = join(POC_ROOT, "out")
  mkdirSync(outDir, { recursive: true })

  const paletteFile = JSON.parse(
    readFileSync(join(POC_ROOT, "fixtures/palettes.json"), "utf8"),
  ) as PaletteFile

  const base = readPng(join(REPO_ROOT, paletteFile.baseAvatar))
  const primaryMask = readPng(join(POC_ROOT, "masks/primary-mask.png"))
  const secondaryMask = readPng(join(POC_ROOT, "masks/secondary-mask.png"))

  if (base.width !== 1600 || base.height !== 1600) {
    throw new Error(`Expected 1600x1600 base, got ${base.width}x${base.height}`)
  }

  const report: Record<string, unknown>[] = []
  const sheetCells: RgbaImage[] = []

  // Row 0: base + mask overlay preview (from authored overlay file, scaled)
  const baseLight = placeOnBackground(base, [245, 245, 247], 280)
  const baseDark = placeOnBackground(base, [24, 24, 28], 280)
  sheetCells.push(baseLight, baseDark)

  const overlayPath = join(POC_ROOT, "masks/mask-overlay.png")
  const overlay = readPng(overlayPath)
  sheetCells.push(placeOnBackground(overlay, [245, 245, 247], 280))

  for (const fixture of paletteFile.fixtures) {
    const logo = readPng(join(POC_ROOT, fixture.logo))
    const suggested = suggestPaletteFromLogo(logo)

    let palette: ResolvedPalette
    if (fixture.useSuggested || !fixture.overrides) {
      palette = {
        primary: suggested.primary,
        secondary: suggested.secondary,
        accent: suggested.accent,
      }
    } else {
      palette = {
        primary: parseHex(fixture.overrides.primary),
        secondary: parseHex(fixture.overrides.secondary),
        accent: fixture.overrides.accent
          ? parseHex(fixture.overrides.accent)
          : suggested.accent,
      }
    }

    const result = compositeOutfit(base, primaryMask, secondaryMask, palette)
    const invariant = assertOutsideMaskUnchanged(base, result, primaryMask, secondaryMask)
    if (invariant.outsidePixelsChanged !== 0 || invariant.alphaChangedAnywhere !== 0) {
      throw new Error(
        `Invariant failed for ${fixture.id}: ${JSON.stringify(invariant)}`,
      )
    }

    const outPng = join(outDir, `${fixture.id}.png`)
    writePng(outPng, result)
    writePng(join(outDir, `${fixture.id}-mobile-light.png`), placeOnBackground(result, [245, 245, 247], 160))
    writePng(join(outDir, `${fixture.id}-mobile-dark.png`), placeOnBackground(result, [24, 24, 28], 160))
    copyFileSync(join(POC_ROOT, fixture.logo), join(outDir, `${fixture.id}-logo.png`))

    sheetCells.push(placeOnBackground(result, [245, 245, 247], 280))
    sheetCells.push(placeOnBackground(result, [24, 24, 28], 280))

    report.push({
      id: fixture.id,
      label: fixture.label,
      exampleData: true,
      suggested,
      resolved: {
        primary: palette.primary,
        secondary: palette.secondary,
        accent: palette.accent,
        source: fixture.overrides ? "explicit_override" : "deterministic_suggestion",
      },
      invariant,
      outputs: {
        full: `out/${fixture.id}.png`,
        mobileLight: `out/${fixture.id}-mobile-light.png`,
        mobileDark: `out/${fixture.id}-mobile-dark.png`,
      },
    })

    console.log(
      `OK ${fixture.id} unionMask=${invariant.maskUnionPixels} outsideOk=${invariant.outsidePixelsChecked}`,
    )
  }

  const sheet = contactSheet(sheetCells, 3, 280)
  writePng(join(outDir, "contact-sheet.png"), sheet)

  const summary = {
    generatedAt: new Date().toISOString(),
    base: paletteFile.baseAvatar,
    jevExercised: false,
    policy: {
      ball_chromatic_panels: "may_recolor_with_primary",
      ball_white_black_seam_highlights: "protected_via_monochrome_gates",
      neutrals_identity_emblems: "unchanged",
      method: "source-color chroma fabric selection + luminance-preserving paletteSwapToward",
    },
    note:
      "EXAMPLE logos/palettes only. Offline POC (t24u+t25u fabric palette-swap). " +
      "Ball chroma MAY remappart of primary intentionally. Jev was not called. Partial artwork.",
    maskUnionPixels: (report[0] as { invariant: { maskUnionPixels: number } })?.invariant
      ?.maskUnionPixels,
    fixtures: report,
  }
  writeFileSync(join(outDir, "report.json"), JSON.stringify(summary, null, 2))
  console.log(`Wrote contact sheet and ${report.length} fixtures to ${outDir}`)
  console.log("jevExercised=false")
}

main()
