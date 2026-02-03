#!/usr/bin/env tsx
/**
 * Verify Draft Board Icons and Completeness
 *
 * Checks the Notion Draft Board database for:
 * - Missing page icons (sprites)
 * - Missing page covers
 * - Incomplete entries (missing Pokemon ID, Name, etc.)
 * - Entries with missing Sprite property
 *
 * Usage:
 *   pnpm exec tsx --env-file=.env.local scripts/verify-draft-board-icons.ts
 *   pnpm exec tsx --env-file=.env.local scripts/verify-draft-board-icons.ts --limit 100
 *   pnpm exec tsx --env-file=.env.local scripts/verify-draft-board-icons.ts --only-missing
 */

import { config } from "dotenv"
import { resolve } from "path"
import {
  createNotionClient,
  queryAllPages,
  extractPropertyValue,
} from "../lib/notion/client"

config({ path: resolve(process.cwd(), ".env.local") })

const DRAFT_BOARD_DATABASE_ID = "5e58ccd73ceb44ed83de826b51cf5c36"

interface VerificationResult {
  total: number
  withIcon: number
  withoutIcon: number
  withCover: number
  withoutCover: number
  withSprite: number
  withoutSprite: number
  missingPokemonId: number
  missingName: number
  incomplete: Array<{
    id: string
    name: string
    pokemonId: number | null
    hasIcon: boolean
    hasCover: boolean
    hasSprite: boolean
  }>
}

function parseArgs(): { limit?: number; onlyMissing: boolean } {
  const args = process.argv.slice(2)
  const limitIdx = args.indexOf("--limit")
  const limit =
    limitIdx >= 0 && args[limitIdx + 1] ? parseInt(args[limitIdx + 1], 10) : undefined
  const onlyMissing = args.includes("--only-missing")
  return { limit, onlyMissing }
}

async function main() {
  const { limit, onlyMissing } = parseArgs()

  console.log("🔍 Verifying Draft Board icons and completeness...\n")

  const notion = createNotionClient()

  try {
    // Query all pages (or limited subset)
    const pages = await queryAllPages(notion, DRAFT_BOARD_DATABASE_ID, {
      maxPages: limit,
    })

    if (pages.length === 0) {
      console.log("❌ No pages found in Draft Board database.\n")
      process.exit(0)
    }

    const result: VerificationResult = {
      total: pages.length,
      withIcon: 0,
      withoutIcon: 0,
      withCover: 0,
      withoutCover: 0,
      withSprite: 0,
      withoutSprite: 0,
      missingPokemonId: 0,
      missingName: 0,
      incomplete: [],
    }

    // Check each page
    for (const page of pages) {
      const name = extractPropertyValue(page.properties.Name, "title")
      const pokemonId = extractPropertyValue(
        page.properties["Pokemon ID (PokeAPI)"],
        "number"
      )
      const sprite = extractPropertyValue(page.properties.Sprite, "files")

      const nameStr = typeof name === "string" ? name : String(name || "Unknown")
      const pokemonIdNum =
        typeof pokemonId === "number" ? pokemonId : null

      // Check page icon
      const hasIcon =
        page.icon !== null &&
        page.icon !== undefined &&
        (page.icon.type === "external" || page.icon.type === "emoji")

      // Check page cover
      const hasCover =
        page.cover !== null &&
        page.cover !== undefined &&
        (page.cover.type === "external" || page.cover.type === "file")

      // Check Sprite property (Files & media)
      const hasSprite = Array.isArray(sprite) && sprite.length > 0

      // Count statistics
      if (hasIcon) result.withIcon++
      else result.withoutIcon++

      if (hasCover) result.withCover++
      else result.withoutCover++

      if (hasSprite) result.withSprite++
      else result.withoutSprite++

      if (pokemonIdNum === null) result.missingPokemonId++
      if (!name || nameStr === "Unknown") result.missingName++

      // Track incomplete entries
      if (!hasIcon || !hasCover || !hasSprite || pokemonIdNum === null) {
        result.incomplete.push({
          id: page.id,
          name: nameStr,
          pokemonId: pokemonIdNum,
          hasIcon,
          hasCover,
          hasSprite,
        })
      }
    }

    // Print summary
    console.log("📊 Verification Summary:\n")
    console.log(`   Total entries:        ${result.total}`)
    console.log(`   With page icon:       ${result.withIcon} (${((result.withIcon / result.total) * 100).toFixed(1)}%)`)
    console.log(`   Without page icon:    ${result.withoutIcon} (${((result.withoutIcon / result.total) * 100).toFixed(1)}%)`)
    console.log(`   With page cover:      ${result.withCover} (${((result.withCover / result.total) * 100).toFixed(1)}%)`)
    console.log(`   Without page cover:   ${result.withoutCover} (${((result.withoutCover / result.total) * 100).toFixed(1)}%)`)
    console.log(`   With Sprite property: ${result.withSprite} (${((result.withSprite / result.total) * 100).toFixed(1)}%)`)
    console.log(`   Without Sprite prop:  ${result.withoutSprite} (${((result.withoutSprite / result.total) * 100).toFixed(1)}%)`)
    console.log(`   Missing Pokemon ID:   ${result.missingPokemonId}`)
    console.log(`   Missing Name:        ${result.missingName}`)
    console.log()

    // Show incomplete entries
    if (result.incomplete.length > 0) {
      const displayCount = onlyMissing ? result.incomplete.length : Math.min(20, result.incomplete.length)
      console.log(`⚠️  Found ${result.incomplete.length} incomplete entries (showing first ${displayCount}):\n`)

      result.incomplete.slice(0, displayCount).forEach((entry, idx) => {
        const issues: string[] = []
        if (!entry.hasIcon) issues.push("no icon")
        if (!entry.hasCover) issues.push("no cover")
        if (!entry.hasSprite) issues.push("no sprite")
        if (entry.pokemonId === null) issues.push("no Pokemon ID")

        console.log(
          `   ${(idx + 1).toString().padStart(3)}. ${entry.name.padEnd(20)} [ID: ${entry.pokemonId ?? "?"}] - ${issues.join(", ")}`
        )
      })

      if (result.incomplete.length > displayCount && !onlyMissing) {
        console.log(`   ... and ${result.incomplete.length - displayCount} more`)
      }
      console.log()

      // Recommendations
      console.log("💡 Recommendations:\n")
      if (result.withoutIcon > 0 || result.withoutCover > 0 || result.withoutSprite > 0) {
        console.log("   To fix missing icons/covers/sprites, run:")
        console.log("   pnpm exec tsx --env-file=.env.local scripts/backfill-draft-board-github-sprites.ts\n")
      }
      if (result.missingPokemonId > 0) {
        console.log("   To fix missing Pokemon IDs, ensure the populate script ran correctly:")
        console.log("   pnpm exec tsx --env-file=.env.local scripts/populate-notion-draft-board.ts\n")
      }
    } else {
      console.log("✅ All entries have icons, covers, and sprites!\n")
    }

    // Show sample of entries with icons for verification
    if (!onlyMissing && result.withIcon > 0) {
      console.log("✅ Sample entries with icons (first 5):\n")
      let shown = 0
      for (const page of pages) {
        if (shown >= 5) break
        const name = extractPropertyValue(page.properties.Name, "title")
        const nameStr = typeof name === "string" ? name : String(name || "Unknown")
        const hasIcon =
          page.icon !== null &&
          page.icon !== undefined &&
          (page.icon.type === "external" || page.icon.type === "emoji")

        if (hasIcon) {
          const iconUrl =
            page.icon?.type === "external"
              ? page.icon.external.url
              : page.icon?.type === "emoji"
                ? `emoji: ${page.icon.emoji}`
                : "unknown"
          console.log(`   ${nameStr.padEnd(20)} Icon: ${iconUrl.substring(0, 60)}${iconUrl.length > 60 ? "..." : ""}`)
          shown++
        }
      }
      console.log()
    }
  } catch (error) {
    console.error("❌ Error verifying Draft Board:", error)
    if (error instanceof Error) {
      console.error("   Message:", error.message)
      if (error.stack) {
        console.error("   Stack:", error.stack.split("\n").slice(0, 3).join("\n"))
      }
    }
    process.exit(1)
  }
}

main()
