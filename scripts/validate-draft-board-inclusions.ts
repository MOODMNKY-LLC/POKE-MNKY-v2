#!/usr/bin/env tsx
/**
 * Validate Draft Board Inclusions
 *
 * Queries the Notion Draft Board database and reports which Pokémon
 * currently have "Added to Draft Board" checked.
 *
 * Usage:
 *   pnpm exec tsx --env-file=.env.local scripts/validate-draft-board-inclusions.ts
 *   pnpm exec tsx --env-file=.env.local scripts/validate-draft-board-inclusions.ts --summary
 *   pnpm exec tsx --env-file=.env.local scripts/validate-draft-board-inclusions.ts --by-type
 *   pnpm exec tsx --env-file=.env.local scripts/validate-draft-board-inclusions.ts --by-points
 */

import { config } from "dotenv"
import { resolve } from "path"
import { createNotionClient, queryAllPages, extractPropertyValue } from "../lib/notion/client"

// Load environment variables
const envPath = resolve(process.cwd(), ".env.local")
config({ path: envPath })

const DRAFT_BOARD_DATABASE_ID = "5e58ccd73ceb44ed83de826b51cf5c36"

interface PokemonEntry {
  id: string
  name: string
  pointValue: number | null
  type1: string | null
  generation: number | null
  pokemonId: number | null
}

async function main() {
  const args = process.argv.slice(2)
  const summaryOnly = args.includes("--summary")
  const byType = args.includes("--by-type")
  const byPoints = args.includes("--by-points")

  console.log("🔍 Querying Notion Draft Board for included Pokémon...\n")

  const notion = createNotionClient()

  try {
    // Query only Pokémon where "Added to Draft Board" is checked
    const pages = await queryAllPages(notion, DRAFT_BOARD_DATABASE_ID, {
      filter: {
        property: "Added to Draft Board",
        checkbox: {
          equals: true,
        },
      },
    })

    if (pages.length === 0) {
      console.log("❌ No Pokémon found with 'Added to Draft Board' checked.")
      console.log("   Check the checkbox in Notion for Pokémon you want to include.\n")
      process.exit(0)
    }

    // Extract relevant properties
    const entries: PokemonEntry[] = pages.map((page) => {
      const name = extractPropertyValue(page.properties.Name, "title") || "Unknown"
      const pointValue = extractPropertyValue(page.properties["Point Value"], "number")
      const type1 = extractPropertyValue(page.properties["Type 1"], "select")
      const generation = extractPropertyValue(page.properties.Generation, "number")
      const pokemonId = extractPropertyValue(page.properties["Pokemon ID (PokeAPI)"], "number")

      return {
        id: page.id,
        name: typeof name === "string" ? name : String(name),
        pointValue: typeof pointValue === "number" ? pointValue : null,
        type1: typeof type1 === "string" ? type1 : null,
        generation: typeof generation === "number" ? generation : null,
        pokemonId: typeof pokemonId === "number" ? pokemonId : null,
      }
    })

    // Sort by point value (descending) then name
    entries.sort((a, b) => {
      if (a.pointValue !== null && b.pointValue !== null) {
        return b.pointValue - a.pointValue
      }
      if (a.pointValue !== null) return -1
      if (b.pointValue !== null) return 1
      return a.name.localeCompare(b.name)
    })

    // Summary statistics
    const total = entries.length
    const withPoints = entries.filter((e) => e.pointValue !== null).length
    const pointSum = entries.reduce((sum, e) => sum + (e.pointValue || 0), 0)
    const avgPoints = withPoints > 0 ? (pointSum / withPoints).toFixed(2) : "N/A"

    console.log(`✅ Found ${total} Pokémon with 'Added to Draft Board' checked\n`)

    // Summary by type
    if (byType || summaryOnly) {
      const typeCounts: Record<string, number> = {}
      entries.forEach((e) => {
        const type = e.type1 || "Unknown"
        typeCounts[type] = (typeCounts[type] || 0) + 1
      })

      console.log("📊 Summary by Type:")
      Object.entries(typeCounts)
        .sort(([, a], [, b]) => b - a)
        .forEach(([type, count]) => {
          console.log(`   ${type.padEnd(15)} ${count.toString().padStart(3)} Pokémon`)
        })
      console.log()
    }

    // Summary by point value
    if (byPoints || summaryOnly) {
      const pointCounts: Record<number, number> = {}
      entries.forEach((e) => {
        if (e.pointValue !== null) {
          pointCounts[e.pointValue] = (pointCounts[e.pointValue] || 0) + 1
        }
      })

      console.log("📊 Summary by Point Value:")
      Object.entries(pointCounts)
        .sort(([a], [b]) => Number(b) - Number(a))
        .forEach(([points, count]) => {
          console.log(`   ${points.toString().padStart(2)} points: ${count.toString().padStart(3)} Pokémon`)
        })
      console.log()
    }

    // Summary by generation
    if (summaryOnly) {
      const genCounts: Record<number, number> = {}
      entries.forEach((e) => {
        if (e.generation !== null) {
          genCounts[e.generation] = (genCounts[e.generation] || 0) + 1
        }
      })

      console.log("📊 Summary by Generation:")
      Object.entries(genCounts)
        .sort(([a], [b]) => Number(a) - Number(b))
        .forEach(([gen, count]) => {
          console.log(`   Gen ${gen}: ${count.toString().padStart(3)} Pokémon`)
        })
      console.log()
    }

    // Overall statistics
    console.log("📈 Overall Statistics:")
    console.log(`   Total Pokémon:        ${total}`)
    console.log(`   With Point Values:    ${withPoints}`)
    console.log(`   Average Point Value:  ${avgPoints}`)
    console.log(`   Total Points:         ${pointSum}`)
    console.log()

    // Full list (unless summary only)
    if (!summaryOnly) {
      console.log("📋 Full List (sorted by point value, then name):\n")
      entries.forEach((entry, index) => {
        const points = entry.pointValue !== null ? entry.pointValue.toString().padStart(2) : " ?"
        const type = entry.type1 || "?"
        const gen = entry.generation !== null ? `Gen ${entry.generation}` : "?"
        console.log(`   ${(index + 1).toString().padStart(3)}. [${points} pts] ${entry.name.padEnd(20)} ${type.padEnd(10)} ${gen}`)
      })
      console.log()
    }

    console.log("💡 Tip: Create a filtered view in Notion named 'Draft Board Season X'")
    console.log("   with filter: 'Added to Draft Board' = checked\n")
  } catch (error) {
    console.error("❌ Error querying Notion:", error)
    if (error instanceof Error) {
      console.error("   Message:", error.message)
    }
    process.exit(1)
  }
}

main()
