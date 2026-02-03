/**
 * Populate Notion Draft Board with all Pokémon from generations 1–9 (comprehensive Pokédex-level detail)
 *
 * Fetches full Pokemon data from PokeAPI (pokenode-ts) for IDs 1–1025, applies bans and point tiers
 * (Gen 9 bans only), and creates rows in the Notion Draft Board with types, base stats, BST, speed tiers,
 * abilities, sprite URL, height/weight, base experience, and optional species name.
 *
 * "Added to Draft Board" is set to false by default; admins check the box in Notion for Pokémon that
 * should be part of the current season's draft pool. Sync to Supabase only includes rows where this is true.
 *
 * Usage:
 *   pnpm exec tsx --env-file=.env.local scripts/ensure-draft-board-schema.ts   # run once to add new properties
 *   pnpm exec tsx --env-file=.env.local scripts/populate-notion-draft-board.ts
 *   pnpm exec tsx --env-file=.env.local scripts/populate-notion-draft-board.ts --dry-run
 *   pnpm exec tsx --env-file=.env.local scripts/populate-notion-draft-board.ts --limit 10
 *
 * Requires: NOTION_API_KEY. PokeAPI IDs 1–1025 (Gen 1–9 base species).
 * Draft Board database must be shared with your Notion integration.
 *
 * Notion API rate limits: ~3 requests/second average per integration (see
 * https://developers.notion.com/reference/request-limits). This script uses
 * batches of 100 with a delay between each request and a longer pause between
 * batches to stay under the limit.
 */

import { config } from "dotenv"
import { resolve } from "path"
import { MainClient } from "pokenode-ts"
import type { Pokemon } from "pokenode-ts"
import { createNotionClient, createPage, buildNotionProperty } from "@/lib/notion/client"
import { getDraftBoardEntry } from "@/lib/draft-board/gen9-bans-and-tiers"
import { calculateSpeedTiersLevel50 } from "@/lib/pokemon-stats"
import { getFallbackSpriteUrl } from "@/lib/pokemon-utils"

config({ path: resolve(process.cwd(), ".env.local") })

const DRAFT_BOARD_DATABASE_ID = "5e58ccd73ceb44ed83de826b51cf5c36"
/** PokeAPI national dex range for Gen 1–9 base species */
const MIN_POKEMON_ID = 1
const MAX_POKEMON_ID = 1025

/** Notion API: ~3 req/s average; batching + delays to stay under limit */
const NOTION_BATCH_SIZE = 100
const NOTION_DELAY_MS = 350
const NOTION_BATCH_DELAY_MS = 5000

const POKEAPI_DELAY_MS = 90

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

function getBaseStat(pokemon: Pokemon, statName: string): number {
  const s = pokemon.stats.find((x) => x.stat.name === statName)
  return s?.base_stat ?? 0
}

function capitalizeType(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
}

function formatAbilities(pokemon: Pokemon): string {
  const parts: string[] = []
  const hidden = pokemon.abilities.find((a) => a.is_hidden)
  for (const a of pokemon.abilities) {
    const displayName = a.ability.name
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ")
    if (a.is_hidden) {
      parts.push(`Hidden: ${displayName}`)
    } else {
      parts.push(displayName)
    }
  }
  return parts.join(", ")
}

function getSpriteUrl(pokemon: Pokemon): string | null {
  const other = pokemon.sprites.other as Record<string, { front_default?: string }> | undefined
  return other?.["official-artwork"]?.front_default ?? pokemon.sprites.front_default ?? null
}

async function getSpeciesName(api: MainClient, speciesId: number): Promise<string | null> {
  try {
    const species = await api.pokemon.getPokemonSpeciesById(speciesId)
    const en = species.genera?.find((g) => g.language.name === "en")
    return en?.genus ?? null
  } catch {
    return null
  }
}

async function main(): Promise<void> {
  const { dryRun, limit } = parseArgs()

  if (!process.env.NOTION_API_KEY) {
    console.error("NOTION_API_KEY is required. Set it in .env.local")
    process.exit(1)
  }

  const api = new MainClient()
  const notion = createNotionClient()

  console.log("Fetching Pokémon from PokeAPI (Gen 1–9, IDs %d–%d)...", MIN_POKEMON_ID, MAX_POKEMON_ID)
  const endId = limit ? Math.min(MAX_POKEMON_ID, MIN_POKEMON_ID + limit - 1) : MAX_POKEMON_ID
  const pokemonList: Pokemon[] = []

  for (let id = MIN_POKEMON_ID; id <= endId; id++) {
    try {
      const pokemon = await api.pokemon.getPokemonById(id)
      pokemonList.push(pokemon)
    } catch (e) {
      console.warn("Skip ID %d: %s", id, e instanceof Error ? e.message : e)
    }
    await sleep(POKEAPI_DELAY_MS)
  }

  console.log("Built %d Pokemon. Deriving draft entries and comprehensive fields...", pokemonList.length)

  if (dryRun) {
    const first = pokemonList[0]
    if (first) {
      const bst = first.stats.reduce((s, st) => s + st.base_stat, 0)
      const entry = getDraftBoardEntry(first.id, first.name, bst)
      console.log("Dry run: would create %d Notion pages. Sample (first):", pokemonList.length)
      console.log("  Name:", entry.name, "| Point:", entry.point_value, "| Status:", entry.status)
      console.log("  Types, stats, BST, speed tiers, abilities, sprite, height/weight would be filled.")
    }
    return
  }

  let created = 0
  /** If DB has no Sprite (files) property, omit it so create doesn't fail */
  let skipSprite = false
  for (let i = 0; i < pokemonList.length; i += NOTION_BATCH_SIZE) {
    const batch = pokemonList.slice(i, i + NOTION_BATCH_SIZE)
    for (const pokemon of batch) {
      try {
        const hp = getBaseStat(pokemon, "hp")
        const atk = getBaseStat(pokemon, "attack")
        const def = getBaseStat(pokemon, "defense")
        const spa = getBaseStat(pokemon, "special-attack")
        const spd = getBaseStat(pokemon, "special-defense")
        const spe = getBaseStat(pokemon, "speed")
        const bst = hp + atk + def + spa + spd + spe
        const draftEntry = getDraftBoardEntry(pokemon.id, pokemon.name, bst)
        const availabilityStatus = draftEntry.status === "banned" ? "Banned" : "Available"
        const speedTiers = calculateSpeedTiersLevel50(spe)
        const type1 = pokemon.types[0]?.type.name ? capitalizeType(pokemon.types[0].type.name) : null
        const type2 = pokemon.types[1]?.type.name ? capitalizeType(pokemon.types[1].type.name) : "(none)"
        const spriteUrl = getSpriteUrl(pokemon)
        const abilitiesText = formatAbilities(pokemon)
        const speciesName = await getSpeciesName(api, pokemon.id)
        if (batch.indexOf(pokemon) > 0) await sleep(50)

        const properties: Record<string, unknown> = {
          Name: buildNotionProperty("title", draftEntry.name),
          "Point Value": buildNotionProperty("number", draftEntry.point_value),
          Status: buildNotionProperty("select", draftEntry.status === "banned" ? "Banned" : "Available"),
          "Tera Captain Eligible": buildNotionProperty("checkbox", draftEntry.tera_captain_eligible),
          "Pokemon ID (PokeAPI)": buildNotionProperty("number", draftEntry.pokemon_id),
          Generation: buildNotionProperty("number", draftEntry.generation),
          // Use "Notes" to match existing Notion Draft Board; optional "Notes / Banned Reason" if you rename in Notion
          Notes: draftEntry.banned_reason
            ? buildNotionProperty("rich_text", draftEntry.banned_reason)
            : { rich_text: [] },
          "Added to Draft Board": buildNotionProperty("checkbox", false),
          "Availability Status": buildNotionProperty("select", availabilityStatus),
          "Pokedex #": buildNotionProperty("number", pokemon.id),
          "Type 1": type1 ? buildNotionProperty("select", type1) : null,
          "Type 2": buildNotionProperty("select", type2),
          HP: buildNotionProperty("number", hp),
          Atk: buildNotionProperty("number", atk),
          Def: buildNotionProperty("number", def),
          SpA: buildNotionProperty("number", spa),
          SpD: buildNotionProperty("number", spd),
          Spe: buildNotionProperty("number", spe),
          BST: buildNotionProperty("number", bst),
          "Speed @ 0 EV": buildNotionProperty("number", speedTiers.speed0Ev),
          "Speed @ 252 EV": buildNotionProperty("number", speedTiers.speed252Ev),
          "Speed @ 252+": buildNotionProperty("number", speedTiers.speed252Plus),
          Height: buildNotionProperty("number", pokemon.height),
          Weight: buildNotionProperty("number", pokemon.weight),
          "Base Experience": buildNotionProperty("number", pokemon.base_experience ?? null),
          Abilities: buildNotionProperty("rich_text", abilitiesText),
          "Sprite URL": spriteUrl ? buildNotionProperty("url", spriteUrl) : { url: null },
          "GitHub Sprite URL": buildNotionProperty(
            "url",
            getFallbackSpriteUrl(pokemon.id, false, "artwork")
          ),
          ...(skipSprite
            ? {}
            : {
                Sprite: buildNotionProperty("files", [
                  {
                    type: "external",
                    name: `${pokemon.name}.png`,
                    external: {
                      url: getFallbackSpriteUrl(pokemon.id, false, "artwork"),
                    },
                  },
                ]),
              }),
          "Species Name": speciesName
            ? buildNotionProperty("rich_text", speciesName)
            : { rich_text: [] },
        }

        const cleanedProperties: Record<string, any> = {}
        for (const [k, v] of Object.entries(properties)) {
          if (v != null && (typeof v !== "object" || Object.keys(v).length > 0)) {
            cleanedProperties[k] = v
          }
        }

        const artworkUrl = getFallbackSpriteUrl(pokemon.id, false, "artwork")
        try {
          await createPage(notion, {
            parent: { database_id: DRAFT_BOARD_DATABASE_ID },
            properties: cleanedProperties,
            icon: {
              type: "external",
              external: {
                url: artworkUrl,
              },
            },
            cover: {
              type: "external",
              external: {
                url: artworkUrl,
              },
            },
          })
          created++
        } catch (createErr) {
          const msg = createErr instanceof Error ? createErr.message : String(createErr)
          const spriteMissing = /Sprite.*not a property|property.*Sprite/i.test(msg)
          if (spriteMissing && !skipSprite) {
            skipSprite = true
            const { Sprite: _s, ...rest } = properties
            const cleanedNoSprite: Record<string, any> = {}
            for (const [k, v] of Object.entries(rest)) {
              if (v != null && (typeof v !== "object" || Object.keys(v as object).length > 0)) {
                cleanedNoSprite[k] = v
              }
            }
            await createPage(notion, {
              parent: { database_id: DRAFT_BOARD_DATABASE_ID },
              properties: cleanedNoSprite,
              icon: {
                type: "external",
                external: { url: artworkUrl },
              },
              cover: {
                type: "external",
                external: { url: artworkUrl },
              },
            })
            created++
          } else {
            console.error("Failed to create page for %s: %s", pokemon.name, msg)
          }
        }
      } catch (err) {
        console.error(
          "Failed to create page for %s: %s",
          pokemon.name,
          err instanceof Error ? err.message : err
        )
      }
      await sleep(NOTION_DELAY_MS)
    }
    if (i + NOTION_BATCH_SIZE < pokemonList.length) {
      await sleep(NOTION_BATCH_DELAY_MS)
    }
    console.log("Created %d / %d pages...", created, pokemonList.length)
  }

  console.log("Done. Created %d Notion Draft Board pages.", created)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
