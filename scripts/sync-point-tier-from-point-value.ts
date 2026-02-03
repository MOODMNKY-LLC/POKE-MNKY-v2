#!/usr/bin/env tsx
/**
 * Sync Point Tier Select Property from Point Value Number
 *
 * Creates or updates a "Point Tier" Select property based on the "Point Value" Number property.
 * This enables Kanban views with individual columns for each point value (1-20).
 *
 * Usage:
 *   pnpm exec tsx --env-file=.env.local scripts/sync-point-tier-from-point-value.ts
 *   pnpm exec tsx --env-file=.env.local scripts/sync-point-tier-from-point-value.ts --dry-run
 *   pnpm exec tsx --env-file=.env.local scripts/sync-point-tier-from-point-value.ts --limit 50
 *
 * Requires: NOTION_API_KEY. Draft Board DB must be shared with your integration.
 */

import { config } from "dotenv"
import { resolve } from "path"
import {
  createNotionClient,
  queryAllPages,
  updatePage,
  extractPropertyValue,
  buildNotionProperty,
  getDatabase,
  updateDatabase,
} from "../lib/notion/client"
import type { NotionPropertySchema } from "../lib/notion/client"

config({ path: resolve(process.cwd(), ".env.local") })

const DRAFT_BOARD_DATABASE_ID = "5e58ccd73ceb44ed83de826b51cf5c36"
const POINT_TIER_PROPERTY_NAME = "Point Tier"
const NOTION_DELAY_MS = 350

function parseArgs(): { dryRun: boolean; limit?: number } {
  const args = process.argv.slice(2)
  const dryRun = args.includes("--dry-run")
  const limitIdx = args.indexOf("--limit")
  const limit =
    limitIdx >= 0 && args[limitIdx + 1] ? parseInt(args[limitIdx + 1], 10) : undefined
  return { dryRun, limit }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function ensurePointTierProperty(notion: ReturnType<typeof createNotionClient>): Promise<boolean> {
  console.log("Checking if Point Tier property exists...")
  const db = await getDatabase(notion, DRAFT_BOARD_DATABASE_ID)
  const existing = new Set(Object.keys(db.properties || {}))

  if (existing.has(POINT_TIER_PROPERTY_NAME)) {
    console.log("✅ Point Tier property already exists.\n")
    return true
  }

  console.log("⚠️  Point Tier property not found. Creating it...")

  // Create Select property with options 1-20
  const pointTierSchema: NotionPropertySchema = {
    type: "select",
    select: {
      options: Array.from({ length: 20 }, (_, i) => ({
        name: String(i + 1),
      })),
    },
  }

  await updateDatabase(notion, DRAFT_BOARD_DATABASE_ID, {
    properties: {
      [POINT_TIER_PROPERTY_NAME]: pointTierSchema,
    },
  })

  console.log("✅ Created Point Tier property with options 1-20.\n")
  return true
}

async function main(): Promise<void> {
  const { dryRun, limit } = parseArgs()

  if (!process.env.NOTION_API_KEY) {
    console.error("NOTION_API_KEY is required. Set it in .env.local")
    process.exit(1)
  }

  const notion = createNotionClient()

  // Ensure Point Tier property exists
  await ensurePointTierProperty(notion)

  console.log("Querying Draft Board pages...")
  const pages = await queryAllPages(notion, DRAFT_BOARD_DATABASE_ID, {
    maxPages: limit ? Math.ceil((limit || 100) / 100) : undefined,
  })
  const toProcess = limit ? pages.slice(0, limit) : pages
  console.log(`Found ${toProcess.length} page(s). Syncing Point Tier from Point Value...\n`)

  let updated = 0
  let skipped = 0
  let failed = 0
  let unchanged = 0

  for (const page of toProcess) {
    const pointValue = extractPropertyValue(page.properties["Point Value"], "number")
    const currentPointTier = extractPropertyValue(
      page.properties[POINT_TIER_PROPERTY_NAME],
      "select"
    )
    const name = extractPropertyValue(page.properties.Name, "title")
    const nameStr = name?.toString().trim() ?? page.id

    // Skip if no Point Value
    if (pointValue === null || typeof pointValue !== "number") {
      if (skipped < 5) {
        console.log(`  Skip ${nameStr}: no Point Value`)
      }
      skipped++
      continue
    }

    // Validate point value is 1-20
    if (pointValue < 1 || pointValue > 20) {
      console.warn(`  Skip ${nameStr}: Point Value ${pointValue} is out of range (1-20)`)
      skipped++
      continue
    }

    const expectedTier = String(pointValue)
    const currentTierStr = typeof currentPointTier === "string" ? currentPointTier : null

    // Skip if already correct
    if (currentTierStr === expectedTier) {
      unchanged++
      continue
    }

    if (dryRun) {
      console.log(
        `  Would update ${nameStr}: Point Tier "${currentTierStr || "(empty)"}" → "${expectedTier}"`
      )
      updated++
      continue
    }

    try {
      await updatePage(notion, page.id, {
        properties: {
          [POINT_TIER_PROPERTY_NAME]: buildNotionProperty("select", expectedTier),
        },
      })
      updated++
      if (updated % 50 === 0) {
        console.log(`  Updated ${updated}...`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`  Failed ${nameStr}: ${msg}`)
      failed++
    }

    await sleep(NOTION_DELAY_MS)
  }

  console.log(
    `\nDone. Updated: ${updated}, Unchanged: ${unchanged}, Skipped: ${skipped}, Failed: ${failed}`
  )

  if (!dryRun && updated > 0) {
    console.log("\n✅ Point Tier property synced! You can now group Kanban views by 'Point Tier'.")
    console.log("   This will create individual columns for each point value (1, 2, 3...20).\n")
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
