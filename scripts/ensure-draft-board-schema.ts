/**
 * Ensure Draft Board Notion database has all comprehensive Pokemon Catalog–like properties.
 * Adds missing properties via PATCH so the populate script can write full Pokemon details.
 *
 * Usage:
 *   pnpm exec tsx --env-file=.env.local scripts/ensure-draft-board-schema.ts
 *   pnpm exec tsx --env-file=.env.local scripts/ensure-draft-board-schema.ts --dry-run
 *
 * Requires: NOTION_API_KEY. Draft Board DB must be shared with your integration.
 */

import { config } from "dotenv"
import { resolve } from "path"
import { createNotionClient, getDatabase, updateDatabase } from "@/lib/notion/client"
import type { NotionPropertySchema } from "@/lib/notion/client"

config({ path: resolve(process.cwd(), ".env.local") })

const DRAFT_BOARD_DATABASE_ID = "5e58ccd73ceb44ed83de826b51cf5c36"

const POKEMON_TYPES = [
  "Normal",
  "Fire",
  "Water",
  "Electric",
  "Grass",
  "Ice",
  "Fighting",
  "Poison",
  "Ground",
  "Flying",
  "Psychic",
  "Bug",
  "Rock",
  "Ghost",
  "Dragon",
  "Dark",
  "Steel",
  "Fairy",
]

/** New properties to add if missing (comprehensive Pokédex-level fields) */
const NEW_PROPERTIES: Record<string, NotionPropertySchema> = {
  "Type 1": {
    type: "select",
    select: {
      options: POKEMON_TYPES.map((name) => ({ name })),
    },
  },
  "Type 2": {
    type: "select",
    select: {
      options: [{ name: "(none)" }, ...POKEMON_TYPES.map((name) => ({ name }))],
    },
  },
  HP: { type: "number", number: {} },
  Atk: { type: "number", number: {} },
  Def: { type: "number", number: {} },
  SpA: { type: "number", number: {} },
  SpD: { type: "number", number: {} },
  Spe: { type: "number", number: {} },
  BST: { type: "number", number: {} },
  "Speed @ 0 EV": { type: "number", number: {} },
  "Speed @ 252 EV": { type: "number", number: {} },
  "Speed @ 252+": { type: "number", number: {} },
  Height: { type: "number", number: {} },
  Weight: { type: "number", number: {} },
  "Base Experience": { type: "number", number: {} },
  Abilities: { type: "rich_text", rich_text: {} },
  "Sprite URL": { type: "url", url: {} },
  "GitHub Sprite URL": { type: "url", url: {} },
  /** Displays as image thumbnail in table (Files & media with external URL) */
  Sprite: { type: "files", files: {} },
  "Species Name": { type: "rich_text", rich_text: {} },
  "Pokedex #": { type: "number", number: {} },
  "Added to Draft Board": { type: "checkbox", checkbox: {} },
  "Availability Status": {
    type: "select",
    select: {
      options: [
        { name: "Available" },
        { name: "Unavailable" },
        { name: "Banned" },
        { name: "Restricted" },
      ],
    },
  },
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run")

  if (!process.env.NOTION_API_KEY) {
    console.error("NOTION_API_KEY is required. Set it in .env.local")
    process.exit(1)
  }

  const notion = createNotionClient()
  console.log("Fetching Draft Board database...")
  const db = await getDatabase(notion, DRAFT_BOARD_DATABASE_ID)
  const existing = new Set(Object.keys(db.properties || {}))

  const toAdd: Record<string, NotionPropertySchema> = {}
  for (const [name, schema] of Object.entries(NEW_PROPERTIES)) {
    if (!existing.has(name)) {
      toAdd[name] = schema
    }
  }

  if (Object.keys(toAdd).length === 0) {
    console.log("All comprehensive properties already exist. Nothing to add.")
    return
  }

  console.log("Missing properties to add:", Object.keys(toAdd).join(", "))

  if (dryRun) {
    console.log("Dry run: would PATCH database with", Object.keys(toAdd).length, "new properties.")
    return
  }

  await updateDatabase(notion, DRAFT_BOARD_DATABASE_ID, { properties: toAdd })
  console.log("Added", Object.keys(toAdd).length, "properties to Draft Board database.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
