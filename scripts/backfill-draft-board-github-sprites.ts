/**
 * Backfill "GitHub Sprite URL", "Sprite" (files), page icon, and page cover on existing Notion Draft Board rows.
 *
 * Reads each page's "Pokemon ID (PokeAPI)" and sets:
 * - "GitHub Sprite URL" (URL)
 * - "Sprite" (Files & media) for table thumbnail
 * - Page icon (artwork image) so it displays next to the name in the database view
 * - Page cover (artwork image) so it displays prominently in Gallery View cards
 *
 * Usage:
 *   pnpm exec tsx --env-file=.env.local scripts/ensure-draft-board-schema.ts   # add column if missing
 *   pnpm exec tsx --env-file=.env.local scripts/backfill-draft-board-github-sprites.ts
 *   pnpm exec tsx --env-file=.env.local scripts/backfill-draft-board-github-sprites.ts --dry-run
 *   pnpm exec tsx --env-file=.env.local scripts/backfill-draft-board-github-sprites.ts --limit 50
 *
 * Requires: NOTION_API_KEY.
 */

import { config } from "dotenv"
import { resolve } from "path"
import {
  createNotionClient,
  queryAllPages,
  updatePage,
  extractPropertyValue,
  buildNotionProperty,
} from "@/lib/notion/client"
import type { NotionUpdatePageRequest } from "@/lib/notion/client"
import { getFallbackSpriteUrl } from "@/lib/pokemon-utils"

config({ path: resolve(process.cwd(), ".env.local") })

const DRAFT_BOARD_DATABASE_ID = "5e58ccd73ceb44ed83de826b51cf5c36"
const NOTION_DELAY_MS = 350

function parseArgs(): { dryRun: boolean; limit?: number } {
  const args = process.argv.slice(2)
  const dryRun = args.includes("--dry-run")
  const limitIdx = args.indexOf("--limit")
  const limit =
    limitIdx >= 0 && args[limitIdx + 1]
      ? parseInt(args[limitIdx + 1], 10)
      : undefined
  return { dryRun, limit }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function main(): Promise<void> {
  const { dryRun, limit } = parseArgs()

  if (!process.env.NOTION_API_KEY) {
    console.error("NOTION_API_KEY is required. Set it in .env.local")
    process.exit(1)
  }

  const notion = createNotionClient()
  console.log("Querying Draft Board pages...")
  const pages = await queryAllPages(notion, DRAFT_BOARD_DATABASE_ID, {
    maxPages: limit ? Math.ceil(limit / 100) : undefined,
  })
  const toProcess = limit ? pages.slice(0, limit) : pages
  console.log("Found %d page(s). Backfilling GitHub Sprite URL...", toProcess.length)

  let updated = 0
  let skipped = 0
  let failed = 0

  for (const page of toProcess) {
    const pokemonId = extractPropertyValue(
      page.properties["Pokemon ID (PokeAPI)"],
      "number"
    )
    const name = extractPropertyValue(page.properties["Name"], "title")
    const nameStr = name?.toString().trim() ?? page.id

    if (pokemonId == null || typeof pokemonId !== "number") {
      console.warn("  Skip %s: no Pokemon ID (PokeAPI)", nameStr)
      skipped++
      continue
    }

    const url = getFallbackSpriteUrl(pokemonId, false, "artwork")
    const nameForFile = nameStr?.replace(/\s+/g, "-") || `pokemon-${pokemonId}`

    if (dryRun) {
      console.log("  Would set %s (id=%s) -> %s", nameStr, pokemonId, url)
      updated++
      continue
    }

    const propertiesWithSprite: NotionUpdatePageRequest["properties"] = {
      "GitHub Sprite URL": buildNotionProperty("url", url),
      Sprite: buildNotionProperty("files", [
        { type: "external", name: `${nameForFile}.png`, external: { url } },
      ]),
    }

    const propertiesWithoutSprite: NotionUpdatePageRequest["properties"] = {
      "GitHub Sprite URL": buildNotionProperty("url", url),
    }

    const payload = {
      properties: propertiesWithSprite,
      icon: { type: "external" as const, external: { url } },
      cover: { type: "external" as const, external: { url } },
    }

    try {
      await updatePage(notion, page.id, payload)
      updated++
      if (updated % 50 === 0) {
        console.log("  Updated %d...", updated)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const spriteMissing = /Sprite.*not a property|property.*Sprite/i.test(msg)
      if (spriteMissing) {
        try {
          await updatePage(notion, page.id, {
            properties: propertiesWithoutSprite,
            icon: { type: "external", external: { url } },
            cover: { type: "external", external: { url } },
          })
          updated++
          if (updated % 50 === 0) console.log("  Updated %d...", updated)
        } catch (retryErr) {
          console.error("  Failed %s: %s", nameStr, retryErr instanceof Error ? retryErr.message : retryErr)
          failed++
        }
      } else {
        console.error("  Failed %s: %s", nameStr, msg)
        failed++
      }
    }

    await sleep(NOTION_DELAY_MS)
  }

  console.log("Done. Updated: %d, Skipped: %d, Failed: %d", updated, skipped, failed)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
