/**
 * Backfill Notion "Pokemon ID (PokeAPI)" for Master Draft Board pages that are missing it.
 * Uses pokenode-ts to resolve Pokemon by name (Name property) and updates the page with the PokeAPI id.
 *
 * Usage:
 *   pnpm exec tsx --env-file=.env.local scripts/backfill-notion-pokemon-id.ts
 *   pnpm exec tsx --env-file=.env.local scripts/backfill-notion-pokemon-id.ts --dry-run
 *   pnpm exec tsx --env-file=.env.local scripts/backfill-notion-pokemon-id.ts --limit 50
 *
 * Requires: NOTION_API_KEY. Uses PokeAPI via pokenode-ts (no key required).
 */

import { config } from "dotenv"
import { resolve } from "path"
import { PokemonClient } from "pokenode-ts"
import {
  createNotionClient,
  queryAllPages,
  updatePage,
  extractPropertyValue,
  buildNotionProperty,
} from "@/lib/notion/client"

config({ path: resolve(process.cwd(), ".env.local") })

const DRAFT_BOARD_DATABASE_ID = "5e58ccd73ceb44ed83de826b51cf5c36"

const NOTION_DELAY_MS = 350
const POKEAPI_DELAY_MS = 120

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

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/** Normalize display name to PokeAPI slug (lowercase, spaces to hyphens, specials handled) */
function nameToSlug(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return ""
  return trimmed
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[.'']/g, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

async function main(): Promise<void> {
  const { dryRun, limit } = parseArgs()

  if (!process.env.NOTION_API_KEY) {
    console.error("NOTION_API_KEY is required. Set it in .env.local")
    process.exit(1)
  }

  const notion = createNotionClient()
  const poke = new PokemonClient()

  console.log("Fetching Master Draft Board pages...")
  const pages = await queryAllPages(notion, DRAFT_BOARD_DATABASE_ID, {
    maxPages: limit,
  })

  const missingId: Array<{ id: string; name: string }> = []
  for (const page of pages) {
    const name = extractPropertyValue(page.properties?.Name, "title")
    const pokemonId = extractPropertyValue(
      page.properties?.["Pokemon ID (PokeAPI)"],
      "number"
    )
    const nameStr = typeof name === "string" ? name.trim() : ""
    if (!nameStr) continue
    const idNum = typeof pokemonId === "number" && Number.isInteger(pokemonId) ? pokemonId : null
    if (idNum == null) {
      missingId.push({ id: page.id, name: nameStr })
    }
  }

  console.log(
    `Found ${pages.length} pages; ${missingId.length} missing "Pokemon ID (PokeAPI)".\n`
  )
  if (missingId.length === 0) {
    console.log("Nothing to backfill.")
    return
  }

  if (dryRun) {
    console.log("Dry run. Would update:")
    missingId.slice(0, 20).forEach(({ name }) => console.log(`  - ${name}`))
    if (missingId.length > 20) console.log(`  ... and ${missingId.length - 20} more`)
    return
  }

  let updated = 0
  let failed = 0
  for (const { id: pageId, name } of missingId) {
    const slug = nameToSlug(name)
    if (!slug) {
      console.warn(`  Skip "${name}": empty slug`)
      failed++
      continue
    }
    try {
      const pokemon = await poke.getPokemonByName(slug)
      const apiId = pokemon.id
      await updatePage(notion, pageId, {
        properties: {
          "Pokemon ID (PokeAPI)": buildNotionProperty("number", apiId),
        },
      })
      updated++
      console.log(`  OK ${name} → ${apiId}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`  Skip "${name}" (slug: ${slug}): ${msg}`)
      failed++
    }
    await sleep(NOTION_DELAY_MS)
    await sleep(POKEAPI_DELAY_MS)
  }

  console.log(`\nDone. Updated: ${updated}, Failed/Skipped: ${failed}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
