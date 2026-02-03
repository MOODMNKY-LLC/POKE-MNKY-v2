#!/usr/bin/env tsx
/**
 * Check Point Value Distribution
 *
 * Verifies which Pokémon have Point Value set and shows distribution.
 *
 * Usage:
 *   pnpm exec tsx --env-file=.env.local scripts/check-point-values.ts
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

async function main() {
  console.log("🔍 Checking Point Value distribution...\n")

  const notion = createNotionClient()

  try {
    const pages = await queryAllPages(notion, DRAFT_BOARD_DATABASE_ID, {
      maxPages: 100, // Check first 100 for quick verification
    })

    const pointDistribution: Record<number, number> = {}
    let withPoints = 0
    let withoutPoints = 0

    for (const page of pages) {
      const pointValue = extractPropertyValue(page.properties["Point Value"], "number")
      const name = extractPropertyValue(page.properties.Name, "title")
      const nameStr = typeof name === "string" ? name : String(name || "Unknown")

      if (pointValue !== null && typeof pointValue === "number") {
        pointDistribution[pointValue] = (pointDistribution[pointValue] || 0) + 1
        withPoints++
      } else {
        withoutPoints++
        if (withoutPoints <= 5) {
          console.log(`   Missing Point Value: ${nameStr}`)
        }
      }
    }

    console.log(`\n📊 Point Value Distribution (first 100 entries):\n`)
    console.log(`   With Point Value:    ${withPoints}`)
    console.log(`   Without Point Value: ${withoutPoints}\n`)

    if (Object.keys(pointDistribution).length > 0) {
      console.log("   Distribution by Point Value:")
      const sortedPoints = Object.keys(pointDistribution)
        .map(Number)
        .sort((a, b) => b - a)

      for (const point of sortedPoints) {
        console.log(`   ${point.toString().padStart(2)} points: ${pointDistribution[point].toString().padStart(3)} Pokémon`)
      }
    } else {
      console.log("   ⚠️  No Point Values found!")
      console.log("   Point Values need to be set manually in Notion or via sync.\n")
    }

    console.log("\n💡 Note: Notion groups number properties into ranges.")
    console.log("   For individual columns (1, 2, 3...20), consider using a Select property instead.\n")
  } catch (error) {
    console.error("❌ Error:", error)
    process.exit(1)
  }
}

main()
