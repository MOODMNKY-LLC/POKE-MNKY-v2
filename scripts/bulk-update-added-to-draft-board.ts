#!/usr/bin/env tsx
/**
 * Bulk Update "Added to Draft Board" Checkbox
 *
 * Bulk updates the "Added to Draft Board" checkbox for all Pokémon in the Draft Board database.
 * Can set all to checked, all to unchecked, or filter by criteria (Point Value, Status, etc.).
 *
 * Usage:
 *   # Set ALL Pokémon to checked
 *   pnpm exec tsx --env-file=.env.local scripts/bulk-update-added-to-draft-board.ts --set-checked
 *
 *   # Set ALL Pokémon to unchecked
 *   pnpm exec tsx --env-file=.env.local scripts/bulk-update-added-to-draft-board.ts --set-unchecked
 *
 *   # Set only Pokémon with Point Value set to checked
 *   pnpm exec tsx --env-file=.env.local scripts/bulk-update-added-to-draft-board.ts --set-checked --only-with-point-value
 *
 *   # Set only Pokémon with Status = Available to checked
 *   pnpm exec tsx --env-file=.env.local scripts/bulk-update-added-to-draft-board.ts --set-checked --status Available
 *
 *   # Dry run (preview what would change)
 *   pnpm exec tsx --env-file=.env.local scripts/bulk-update-added-to-draft-board.ts --set-checked --dry-run
 *
 *   # Limit to first N entries (for testing)
 *   pnpm exec tsx --env-file=.env.local scripts/bulk-update-added-to-draft-board.ts --set-checked --limit 50
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
} from "../lib/notion/client"

config({ path: resolve(process.cwd(), ".env.local") })

const DRAFT_BOARD_DATABASE_ID = "5e58ccd73ceb44ed83de826b51cf5c36"
const NOTION_DELAY_MS = 350

interface Options {
  setChecked: boolean
  setUnchecked: boolean
  onlyWithPointValue: boolean
  status?: string
  dryRun: boolean
  limit?: number
}

function parseArgs(): Options {
  const args = process.argv.slice(2)
  const setChecked = args.includes("--set-checked")
  const setUnchecked = args.includes("--set-unchecked")
  const onlyWithPointValue = args.includes("--only-with-point-value")
  const statusIdx = args.indexOf("--status")
  const status = statusIdx >= 0 && args[statusIdx + 1] ? args[statusIdx + 1] : undefined
  const dryRun = args.includes("--dry-run")
  const limitIdx = args.indexOf("--limit")
  const limit =
    limitIdx >= 0 && args[limitIdx + 1] ? parseInt(args[limitIdx + 1], 10) : undefined

  if (!setChecked && !setUnchecked) {
    console.error("Error: Must specify --set-checked or --set-unchecked")
    process.exit(1)
  }

  if (setChecked && setUnchecked) {
    console.error("Error: Cannot specify both --set-checked and --set-unchecked")
    process.exit(1)
  }

  return {
    setChecked,
    setUnchecked,
    onlyWithPointValue,
    status,
    dryRun,
    limit,
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function main(): Promise<void> {
  const options = parseArgs()

  if (!process.env.NOTION_API_KEY) {
    console.error("NOTION_API_KEY is required. Set it in .env.local")
    process.exit(1)
  }

  const notion = createNotionClient()
  const targetValue = options.setChecked

  console.log(`🔍 Querying Draft Board pages...`)
  console.log(`   Target value: ${targetValue ? "CHECKED ✅" : "UNCHECKED ❌"}`)
  if (options.onlyWithPointValue) {
    console.log(`   Filter: Only Pokémon with Point Value set`)
  }
  if (options.status) {
    console.log(`   Filter: Status = "${options.status}"`)
  }
  if (options.dryRun) {
    console.log(`   Mode: DRY RUN (no changes will be made)`)
  }
  if (options.limit) {
    console.log(`   Limit: First ${options.limit} entries`)
  }
  console.log()

  // Build filter
  const filter: any = {}
  if (options.status) {
    filter.and = [
      {
        property: "Status",
        select: {
          equals: options.status,
        },
      },
    ]
  }

  const pages = await queryAllPages(notion, DRAFT_BOARD_DATABASE_ID, {
    filter: Object.keys(filter).length > 0 ? filter : undefined,
    maxPages: options.limit ? Math.ceil((options.limit || 100) / 100) : undefined,
  })

  const toProcess = options.limit ? pages.slice(0, options.limit) : pages
  console.log(`Found ${toProcess.length} page(s). Processing...\n`)

  let updated = 0
  let skipped = 0
  let failed = 0
  let unchanged = 0

  for (const page of toProcess) {
    const currentValue = extractPropertyValue(page.properties["Added to Draft Board"], "checkbox")
    const pointValue = extractPropertyValue(page.properties["Point Value"], "number")
    const name = extractPropertyValue(page.properties.Name, "title")
    const nameStr = name?.toString().trim() ?? page.id

    // Apply filters
    if (options.onlyWithPointValue && (pointValue === null || typeof pointValue !== "number")) {
      skipped++
      continue
    }

    // Skip if already at target value
    if (currentValue === targetValue) {
      unchanged++
      continue
    }

    if (options.dryRun) {
      console.log(
        `  Would update ${nameStr}: "Added to Draft Board" ${currentValue ? "✅" : "❌"} → ${targetValue ? "✅" : "❌"}`
      )
      updated++
      continue
    }

    try {
      await updatePage(notion, page.id, {
        properties: {
          "Added to Draft Board": buildNotionProperty("checkbox", targetValue),
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

  console.log(`\n✅ Done!`)
  console.log(`   Updated: ${updated}`)
  console.log(`   Unchanged: ${unchanged}`)
  console.log(`   Skipped: ${skipped}`)
  console.log(`   Failed: ${failed}`)

  if (!options.dryRun && updated > 0) {
    console.log(`\n💡 Tip: Run validation script to verify:`)
    console.log(`   pnpm exec tsx --env-file=.env.local scripts/validate-draft-board-inclusions.ts\n`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
