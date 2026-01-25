/**
 * Recompute "rollup-like" totals for the standalone Teams Notion model.
 *
 * Why: Notion API cannot create/maintain embedded database views or true rollups easily for our
 * duplicated team pages. We store structured child records (Roster Picks, Transactions, Matches, etc)
 * and periodically write aggregate totals onto "Team Seasons", where formulas derive remaining points,
 * moves remaining, differentials, and record display.
 *
 * Usage:
 *   pnpm tsx scripts/recompute-team-seasons-standalone.ts [--dry-run] [--season-key S1] [--teamseason-key arkansas-fighting-hogs-S1]
 *
 * Environment:
 * - NOTION_API_KEY (required unless --dry-run)
 * - NOTION_API_VERSION (optional, defaults to 2022-06-28)
 */
import * as dotenv from "dotenv"
import * as path from "path"

// Load local dev env first, then fallback to .env if needed.
dotenv.config({ path: path.join(process.cwd(), ".env.local") })
dotenv.config({ path: path.join(process.cwd(), ".env") })

type Args = {
  dryRun: boolean
  seasonKey?: string
  teamSeasonKey?: string
  notionKey?: string
}

const NOTION_VERSION_DEFAULT = "2022-06-28"

/**
 * Notion IDs for the standalone Teams model created under "Teams" (2026-01-24).
 * These are database IDs (not the data-source ids).
 */
const DB = {
  teamSeasons: { databaseId: "aef780c9-d9d6-4f07-a38c-a30ecdf1db6e" },
  rosterPicks: { databaseId: "da036310-1e96-4771-bae2-321bc3c0f1ee" },
  transactions: { databaseId: "7ccc5f94-b737-4d1c-ab4c-c3515a41e5d3" },
  matches: { databaseId: "7722d5a9-be3b-49be-bc07-97a6fd9c63d6" },
} as const

function parseArgs(): Args {
  const argv = process.argv.slice(2)
  const get = (name: string) => {
    const idx = argv.findIndex((a) => a === name)
    if (idx === -1) return undefined
    return argv[idx + 1]
  }

  const dryRun = argv.includes("--dry-run")
  const seasonKey = get("--season-key")
  const teamSeasonKey = get("--teamseason-key")
  const notionKey = get("--notion-key")

  return { dryRun, seasonKey, teamSeasonKey, notionKey }
}

async function notionRequest<T>(apiPath: string, init: RequestInit): Promise<T> {
  const apiKey = process.env.NOTION_API_KEY
  const apiVersion = process.env.NOTION_API_VERSION || NOTION_VERSION_DEFAULT
  if (!apiKey) {
    throw new Error("Missing NOTION_API_KEY")
  }

  const res = await fetch(`https://api.notion.com/v1${apiPath}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Notion-Version": apiVersion,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`Notion API ${res.status} ${res.statusText}: ${body}`)
  }
  return (await res.json()) as T
}

type QueryResponse = {
  results: Array<{ id: string; properties: Record<string, any> }>
  has_more: boolean
  next_cursor: string | null
}

async function queryAll(databaseId: string, body: Record<string, any>): Promise<QueryResponse["results"]> {
  const results: QueryResponse["results"] = []
  let cursor: string | null = null

  for (;;) {
    const pageBody = {
      ...body,
      start_cursor: cursor || undefined,
      page_size: Math.min(body.page_size ?? 100, 100),
    }

    const data = await notionRequest<QueryResponse>(`/databases/${databaseId}/query`, {
      method: "POST",
      body: JSON.stringify(pageBody),
    })

    results.push(...data.results)
    if (!data.has_more) break
    cursor = data.next_cursor
    if (!cursor) break
  }

  return results
}

function readRichTextPlain(prop: any): string {
  const rt = prop?.rich_text
  if (!Array.isArray(rt)) return ""
  return rt.map((x) => x?.plain_text || "").join("").trim()
}

function readTitlePlain(prop: any): string {
  const t = prop?.title
  if (!Array.isArray(t)) return ""
  return t.map((x) => x?.plain_text || "").join("").trim()
}

function readNumber(prop: any): number | null {
  const n = prop?.number
  return typeof n === "number" && Number.isFinite(n) ? n : null
}

type TeamSeasonComputed = {
  pointBudget: number | null
  pointsSpent: number
  movesAllowed: number | null
  movesUsed: number
  regWins: number
  regLosses: number
  regKills: number
  regDeaths: number
  poKills: number
  poDeaths: number
}

async function computeForTeamSeason(teamSeasonPageId: string, opts: { pointBudget: number | null; movesAllowed: number | null }): Promise<TeamSeasonComputed> {
  // Roster picks sum: Point Value
  const picks = await queryAll(DB.rosterPicks.databaseId, {
    filter: {
      property: "Team Season",
      relation: { contains: teamSeasonPageId },
    },
  })
  const pointsSpent = picks.reduce((sum, p) => sum + (readNumber(p.properties["Point Value"]) || 0), 0)

  // Transactions count: moves used
  const tx = await queryAll(DB.transactions.databaseId, {
    filter: {
      property: "Team Season",
      relation: { contains: teamSeasonPageId },
    },
  })
  const movesUsed = tx.length

  // Matches: stage split, record, kills/deaths
  const matches = await queryAll(DB.matches.databaseId, {
    filter: {
      property: "This Team Season",
      relation: { contains: teamSeasonPageId },
    },
  })

  let regWins = 0
  let regLosses = 0
  let regKills = 0
  let regDeaths = 0
  let poKills = 0
  let poDeaths = 0

  for (const m of matches) {
    const stage = readRichTextPlain(m.properties["Stage"]).toLowerCase()
    const result = readRichTextPlain(m.properties["Result"]).toUpperCase()
    const kills = readNumber(m.properties["Kills"]) || 0
    const deaths = readNumber(m.properties["Deaths"]) || 0

    if (stage === "regular") {
      regKills += kills
      regDeaths += deaths
      if (result === "W") regWins += 1
      if (result === "L") regLosses += 1
    } else if (stage === "playoffs" || stage === "playoff") {
      poKills += kills
      poDeaths += deaths
    }
  }

  return {
    pointBudget: opts.pointBudget,
    pointsSpent,
    movesAllowed: opts.movesAllowed,
    movesUsed,
    regWins,
    regLosses,
    regKills,
    regDeaths,
    poKills,
    poDeaths,
  }
}

async function updateTeamSeasonPage(pageId: string, computed: TeamSeasonComputed, opts: { dryRun: boolean }) {
  const properties: Record<string, any> = {
    ...(computed.pointBudget !== null ? { "Point Budget": { number: computed.pointBudget } } : {}),
    "Points Spent": { number: computed.pointsSpent },
    ...(computed.movesAllowed !== null ? { "Moves Allowed": { number: computed.movesAllowed } } : {}),
    "Moves Used": { number: computed.movesUsed },
    "Reg Wins": { number: computed.regWins },
    "Reg Losses": { number: computed.regLosses },
    "Reg Kills": { number: computed.regKills },
    "Reg Deaths": { number: computed.regDeaths },
    "PO Kills": { number: computed.poKills },
    "PO Deaths": { number: computed.poDeaths },
  }

  if (opts.dryRun) return

  await notionRequest(`/pages/${pageId}`, {
    method: "PATCH",
    body: JSON.stringify({ properties }),
  })
}

async function main() {
  const args = parseArgs()

  // Allow CLI override without persisting secrets to disk.
  if (args.notionKey) {
    process.env.NOTION_API_KEY = args.notionKey
  } else if (!process.env.NOTION_API_KEY && process.env.NOTION_KEY) {
    process.env.NOTION_API_KEY = process.env.NOTION_KEY
  }

  if (!args.dryRun && !process.env.NOTION_API_KEY) {
    throw new Error("NOTION_API_KEY is required (or run with --dry-run)")
  }

  const filterParts: any[] = []
  if (args.seasonKey) {
    // Team Seasons schema stores Season Key on the related Season page; Notion query filters can't
    // easily traverse relation properties in the API. So we filter post-query below.
    // This is kept for parity with CLI flags.
  }
  if (args.teamSeasonKey) {
    filterParts.push({
      property: "TeamSeason Key",
      rich_text: { equals: args.teamSeasonKey },
    })
  }

  const filter =
    filterParts.length === 0 ? undefined : filterParts.length === 1 ? filterParts[0] : { and: filterParts }

  const teamSeasons = await queryAll(DB.teamSeasons.databaseId, {
    filter,
    sorts: [{ property: "Team Season", direction: "ascending" }],
  })

  let updated = 0
  for (const ts of teamSeasons) {
    const name = readTitlePlain(ts.properties["Team Season"]) || "(unnamed)"
    const key = readRichTextPlain(ts.properties["TeamSeason Key"])

    const seasonRel = ts.properties["Season"]?.relation?.[0]?.id
    const seasonProps = seasonRel
      ? await notionRequest<{ properties: Record<string, any> }>(`/pages/${seasonRel}`, { method: "GET" })
      : null
    const seasonKey = seasonProps ? readRichTextPlain(seasonProps.properties["Season Key"]) : ""
    const pointBudget = seasonProps ? readNumber(seasonProps.properties["Draft Points Budget"]) : null
    const movesAllowed = seasonProps ? readNumber(seasonProps.properties["Max Transactions"]) : null

    if (args.seasonKey) {
      // Post-filter by Season relation page properties (needs an extra fetch).
      if (seasonKey !== args.seasonKey) continue
    }

    const computed = await computeForTeamSeason(ts.id, { pointBudget, movesAllowed })
    await updateTeamSeasonPage(ts.id, computed, { dryRun: args.dryRun })
    updated += 1

    // eslint-disable-next-line no-console
    console.log(
      `${args.dryRun ? "[dry-run] " : ""}Updated Team Season: ${name}${key ? ` (${key})` : ""} -> ` +
        `budget=${computed.pointBudget ?? "?"}, pointsSpent=${computed.pointsSpent}, ` +
        `movesAllowed=${computed.movesAllowed ?? "?"}, movesUsed=${computed.movesUsed}, reg=${computed.regWins}-${computed.regLosses}, ` +
        `regKD=${computed.regKills}-${computed.regDeaths}, poKD=${computed.poKills}-${computed.poDeaths}`,
    )
  }

  // eslint-disable-next-line no-console
  console.log(`✅ Done. Team Seasons processed: ${updated}`)
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("❌ Recompute failed:", err)
  process.exit(1)
})

