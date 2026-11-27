/**
 * One-off generator for the smaller image copies used on hot paths
 * (background, logo, POKE MNKY avatars). Originals are never modified or removed.
 *
 * Run: node scripts/optimize-hot-path-images.mjs
 *
 * sharp is not a dependency of this repo; it is resolved through Next.js,
 * which bundles it for image optimization.
 */
import { createRequire } from "node:module"
import { statSync } from "node:fs"
import path from "node:path"

const require = createRequire(import.meta.url)
const sharp = createRequire(require.resolve("next/package.json"))("sharp")

const pub = path.resolve("public")

const jobs = [
  // Background (shown at 10-15% opacity under a 90-95% overlay, so heavy compression is invisible)
  { src: "league-bg-light.png", out: "league-bg-light.webp", width: 1536, webp: { quality: 62, effort: 6 } },
  { src: "league-bg-light.png", out: "league-bg-light.avif", width: 1536, avif: { quality: 45, effort: 6 } },
  { src: "league-bg-dark.png", out: "league-bg-dark.webp", width: 1536, webp: { quality: 62, effort: 6 } },
  { src: "league-bg-dark.png", out: "league-bg-dark.avif", width: 1536, avif: { quality: 45, effort: 6 } },
  // League logo (transparent)
  { src: "league-logo.png", out: "league-logo-512.webp", width: 512, webp: { quality: 85, alphaQuality: 100, effort: 6 } },
  { src: "league-logo.png", out: "league-logo-256.webp", width: 256, webp: { quality: 85, alphaQuality: 100, effort: 6 } },
  { src: "league-logo.png", out: "league-logo-128.webp", width: 128, webp: { quality: 85, alphaQuality: 100, effort: 6 } },
  // POKE MNKY avatars (transparent)
  ...["red-blue", "gold-black"].map((name) => ({
    src: `poke-mnky/avatars/${name}.png`,
    out: `poke-mnky/avatars/${name}-512.webp`,
    width: 512,
    webp: { quality: 85, alphaQuality: 100, effort: 6 },
  })),
]

const kb = (file) => `${(statSync(file).size / 1024).toFixed(1)} KB`

for (const job of jobs) {
  const input = path.join(pub, job.src)
  const output = path.join(pub, job.out)
  const meta = await sharp(input).metadata()
  let pipeline = sharp(input).resize({ width: job.width, withoutEnlargement: true })
  pipeline = job.avif ? pipeline.avif(job.avif) : pipeline.webp(job.webp)
  const info = await pipeline.toFile(output)
  console.log(
    `${job.src} (${meta.width}x${meta.height}, ${kb(input)}) -> ${job.out} (${info.width}x${info.height}, ${kb(output)})`,
  )
}
