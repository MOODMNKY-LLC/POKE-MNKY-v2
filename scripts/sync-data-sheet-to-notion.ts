/**
 * Sync Google Sheet "Data" tab into Notion databases created under Backend Dashboard.
 *
 * Usage:
 *   pnpm tsx scripts/sync-data-sheet-to-notion.ts --season "Season 1" [--spreadsheet <id>] [--dry-run]
 *
 * Environment:
 * - GOOGLE_SERVICE_ACCOUNT_EMAIL
 * - GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY (or GOOGLE_PRIVATE_KEY)
 * - GOOGLE_SHEET_ID (optional if --spreadsheet provided)
 * - NOTION_API_KEY (required unless --dry-run)
 * - NOTION_API_VERSION (optional)
 */
import * as dotenv from "dotenv"
import * as path from "path"
import { JWT } from "google-auth-library"
import { google } from "googleapis"
import { getGoogleServiceAccountCredentials } from "../lib/utils/google-sheets"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

type Args = {
  spreadsheetId: string
  seasonName: string
  dryRun: boolean
}

const NOTION_VERSION_DEFAULT = "2022-06-28"

const DB = {
  teams: { databaseId: "0d91c62b-7791-41bc-9620-fb95db8fc973", externalKeyProp: "External Key" },
  seasons: { databaseId: "4ec82219-a416-464e-abef-db63bc68d0f3", externalKeyProp: "External Key" },
  matches: { databaseId: "ca5d213b-0136-451f-9b50-c1b931304434", externalKeyProp: "External Key" },
  teamSeasonStats: { databaseId: "8aae62c3-5b4e-4de7-9aab-29440a06e6b5", externalKeyProp: "External Key" },
  teamWeeklyResults: { databaseId: "7a0a4095-e1c6-4fd1-aa8f-f21e4ef571b4", externalKeyProp: "External Key" },
  pokemonIndex: { databaseId: "03735dba-5e35-4515-aefe-6abae760598a", externalKeyProp: "External Key" },
  teamPokemonSeasonStats: { databaseId: "ebcf9e30-a073-479a-aeda-0cf27ee07bc8", externalKeyProp: "External Key" },
} as const

function parseArgs(): Args {
  const argv = process.argv.slice(2)
  const get = (name: string) => {
    const idx = argv.findIndex((a) => a === name)
    if (idx === -1) return undefined
    return argv[idx + 1]
  }

  const dryRun = argv.includes("--dry-run")
  const spreadsheetId = get("--spreadsheet") || process.env.GOOGLE_SHEET_ID || "1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0"
  const seasonName = get("--season") || process.env.AAB_SEASON_NAME || "AAB Sheet Season"

  return { spreadsheetId, seasonName, dryRun }
}

function toNumber(val: unknown): number | null {
  if (val === null || val === undefined) return null
  const s = String(val).trim()
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function toInt(val: unknown): number | null {
  const n = toNumber(val)
  if (n === null) return null
  return Number.isFinite(n) ? Math.trunc(n) : null
}

function parsePercent(val: unknown): number | null {
  if (val === null || val === undefined) return null
  const s = String(val).trim()
  if (!s) return null
  const cleaned = s.endsWith("%") ? s.slice(0, -1) : s
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

function slugifyPokemon(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/♀/g, "f")
    .replace(/♂/g, "m")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function notionTitle(content: string) {
  return { title: [{ text: { content } }] }
}

function notionRichText(content: string | null | undefined) {
  if (!content) return { rich_text: [] }
  return { rich_text: [{ text: { content } }] }
}

function notionNumber(n: number | null | undefined) {
  return { number: typeof n === "number" && Number.isFinite(n) ? n : null }
}

function notionSelect(name: string | null | undefined) {
  return { select: name ? { name } : null }
}

function notionRelation(pageId: string | null | undefined) {
  return { relation: pageId ? [{ id: pageId }] : [] }
}

async function notionRequest<T>(path: string, init: RequestInit): Promise<T> {
  const apiKey = process.env.NOTION_API_KEY
  const apiVersion = process.env.NOTION_API_VERSION || NOTION_VERSION_DEFAULT
  if (!apiKey) {
    throw new Error("Missing NOTION_API_KEY")
  }
  const res = await fetch(`https://api.notion.com/v1${path}`, {
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

type NotionPage = { id: string; properties: Record<string, any> }

async function findPageByExternalKey(databaseId: string, externalKey: string): Promise<string | null> {
  type QueryResponse = { results: Array<{ id: string }>; has_more: boolean; next_cursor: string | null }
  const body = {
    filter: {
      property: "External Key",
      rich_text: { equals: externalKey },
    },
    page_size: 1,
  }
  const data = await notionRequest<QueryResponse>(`/databases/${databaseId}/query`, {
    method: "POST",
    body: JSON.stringify(body),
  })
  return data.results[0]?.id || null
}

async function createPage(databaseId: string, properties: Record<string, any>): Promise<string> {
  type CreateResponse = { id: string }
  const data = await notionRequest<CreateResponse>("/pages", {
    method: "POST",
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties,
    }),
  })
  return data.id
}

async function updatePage(pageId: string, properties: Record<string, any>): Promise<void> {
  await notionRequest(`/pages/${pageId}`, {
    method: "PATCH",
    body: JSON.stringify({ properties }),
  })
}

async function upsertByExternalKey(
  databaseId: string,
  externalKey: string,
  properties: Record<string, any>,
  opts: { dryRun: boolean },
): Promise<{ pageId: string; created: boolean }> {
  if (opts.dryRun) {
    return { pageId: `dry-run:${externalKey}`, created: false }
  }

  const existingId = await findPageByExternalKey(databaseId, externalKey)
  if (existingId) {
    await updatePage(existingId, properties)
    return { pageId: existingId, created: false }
  }

  const createdId = await createPage(databaseId, properties)
  return { pageId: createdId, created: true }
}

async function getSheetsClient() {
  const credentials = getGoogleServiceAccountCredentials()
  if (!credentials) {
    throw new Error("Google Sheets credentials not configured (service account)")
  }

  const auth = new JWT({
    email: credentials.email,
    key: credentials.privateKey,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets.readonly",
      "https://www.googleapis.com/auth/drive.readonly",
    ],
  })

  return google.sheets({ version: "v4", auth })
}

type TeamRowParsed = {
  sheetRow: number
  teamId: number
  teamName: string
  coachName: string | null
  division: string | null
  conference: string | null
  logoUrl: string | null
  gp: number | null
  wins: number | null
  losses: number | null
  differential: number | null
  recordText: string | null
  streak: string | null
  sosPercent: number | null
  winPct: number | null
  oppWinPct: number | null
  strengthOfSchedule: number | null
  opponentsFacedText: string | null
  weekResults: Array<{ week: number; result: string | null; sourceColumnWeek: number }>
  currentWeekMatch: {
    week: number | null
    battleNumber: number | null
    selfScore: number | null
    oppScore: number | null
    selfResult: "W" | "L" | null
    oppResult: "W" | "L" | null
    oppCoach: string | null
    oppTeamId: number | null
    diff: number | null
  }
}

function parseTeamRows(values: string[][], startRowNumber: number): TeamRowParsed[] {
  const parsed: TeamRowParsed[] = []

  for (let i = 0; i < values.length; i++) {
    const row = values[i] || []
    const sheetRow = startRowNumber + i

    const teamId = toInt(row[1])
    const teamName = (row[3] || "").toString().trim()
    if (!teamId || !teamName) continue

    const coachName = row[2] ? String(row[2]).trim() : null
    const division = row[5] ? String(row[5]).trim() : null
    const conference = row[6] ? String(row[6]).trim() : null
    const logoUrl = row[4] ? String(row[4]).trim() : null

    // Team season stats
    const gp = toInt(row[27])
    const wins = toInt(row[28])
    const losses = toInt(row[29])
    const differential = toInt(row[30])
    const recordText = row[31] ? String(row[31]).trim() : null

    // Week-by-week results columns AG..AP = indices 32..41
    const weekResults: Array<{ week: number; result: string | null; sourceColumnWeek: number }> = []
    for (let week = 1; week <= 10; week++) {
      const idx = 31 + week // 32..41
      const raw = row[idx] ? String(row[idx]).trim() : ""
      const result = raw ? raw : null
      weekResults.push({ week, result, sourceColumnWeek: week })
    }

    const streak = row[42] ? String(row[42]).trim() : null
    const sosPercent = parsePercent(row[45]) // AT (46) => index 45

    const winPct = parsePercent(row[54]) // BC (55) => index 54
    const oppWinPct = parsePercent(row[55]) // BD (56) => index 55
    const strengthOfSchedule = toNumber(row[56]) // BE (57) => index 56

    const opponentsFacedText = row[59] ? String(row[59]).trim() : null // BH (60) => index 59

    // Current week match snapshot J..V area
    const currentWeekMatch = {
      week: toInt(row[9]), // J (10)
      battleNumber: toInt(row[10]), // K (11)
      selfResult: (row[13] ? String(row[13]).trim() : null) as "W" | "L" | null, // N (14)
      selfScore: toInt(row[14]), // O (15)
      oppScore: toInt(row[16]), // Q (17)
      oppResult: (row[17] ? String(row[17]).trim() : null) as "W" | "L" | null, // R (18)
      oppCoach: row[18] ? String(row[18]).trim() : null, // S (19)
      oppTeamId: toInt(row[19]), // T (20)
      diff: toInt(row[21]), // V (22) often +/- or diff
    }

    parsed.push({
      sheetRow,
      teamId,
      teamName,
      coachName,
      division,
      conference,
      logoUrl,
      gp,
      wins,
      losses,
      differential,
      recordText,
      streak,
      sosPercent,
      winPct,
      oppWinPct,
      strengthOfSchedule,
      opponentsFacedText,
      weekResults,
      currentWeekMatch,
    })
  }

  return parsed
}

type PokemonBlockStat = {
  sheetRow: number
  teamName: string
  category: "Top Performer" | "Bottom Performer"
  rank: number
  pokemonName: string
  kills: number | null
  appearances: number | null
  killsPerAppearance: number | null
}

function parsePokemonStatsBlock(values: string[][], startRowNumber: number): PokemonBlockStat[] {
  const out: PokemonBlockStat[] = []
  let currentTeam: string | null = null
  let topRank = 0
  let bottomRank = 0

  // Expect:
  // row 1: title
  // row 2: headers
  for (let i = 2; i < values.length; i++) {
    const row = values[i] || []
    const sheetRow = startRowNumber + i

    const first = row[0] ? String(row[0]).trim() : ""
    const second = row[1] ? String(row[1]).trim() : ""

    // Team header row: only first cell populated (team name)
    if (first && !second && !toNumber(first)) {
      currentTeam = first
      topRank = 0
      bottomRank = 0
      continue
    }

    if (!currentTeam) continue

    const ratioCell = toNumber(first)

    const topPokemon = row[1] ? String(row[1]).trim() : ""
    const topKills = toInt(row[2])
    const topApps = toInt(row[3])
    const topRatio = ratioCell ?? (topKills !== null && topApps ? topKills / topApps : null)

    const bottomPokemon = row[4] ? String(row[4]).trim() : ""
    const bottomKills = toInt(row[5])
    const bottomApps = toInt(row[6])
    const bottomRatio = bottomKills !== null && bottomApps ? bottomKills / bottomApps : null

    if (topPokemon) {
      topRank += 1
      out.push({
        sheetRow,
        teamName: currentTeam,
        category: "Top Performer",
        rank: topRank,
        pokemonName: topPokemon,
        kills: topKills,
        appearances: topApps,
        killsPerAppearance: topRatio,
      })
    }

    if (bottomPokemon) {
      bottomRank += 1
      out.push({
        sheetRow,
        teamName: currentTeam,
        category: "Bottom Performer",
        rank: bottomRank,
        pokemonName: bottomPokemon,
        kills: bottomKills,
        appearances: bottomApps,
        killsPerAppearance: bottomRatio,
      })
    }
  }

  return out
}

async function main() {
  const args = parseArgs()

  const notionKey = process.env.NOTION_API_KEY
  if (!notionKey && !args.dryRun) {
    throw new Error("NOTION_API_KEY is required (or run with --dry-run)")
  }

  const sheets = await getSheetsClient()

  // 1) Read team rows
  const teamRange = "Data!A2:BH1000"
  const teamRes = await sheets.spreadsheets.values.get({
    spreadsheetId: args.spreadsheetId,
    range: teamRange,
    valueRenderOption: "FORMATTED_VALUE",
  })
  const teamValues = (teamRes.data.values || []) as string[][]
  const teamsParsed = parseTeamRows(teamValues, 2)

  // 2) Read pokemon stats block
  const pokemonRange = "Data!CB1:CH1000"
  const pokeRes = await sheets.spreadsheets.values.get({
    spreadsheetId: args.spreadsheetId,
    range: pokemonRange,
    valueRenderOption: "FORMATTED_VALUE",
  })
  const pokeValues = (pokeRes.data.values || []) as string[][]
  const pokemonStats = parsePokemonStatsBlock(pokeValues, 1)

  // Build team lookup by name/id from parsed rows
  const teamNameToId = new Map<string, number>()
  for (const t of teamsParsed) {
    teamNameToId.set(t.teamName, t.teamId)
  }

  // Create/update Season page
  const seasonKey = `season:${args.spreadsheetId}:${args.seasonName}`
  const seasonUpsert = await upsertByExternalKey(
    DB.seasons.databaseId,
    seasonKey,
    {
      Season: notionTitle(args.seasonName),
      "External Key": notionRichText(seasonKey),
      "Spreadsheet ID": notionRichText(args.spreadsheetId),
      "Is Current": { checkbox: true },
    },
    { dryRun: args.dryRun },
  )
  const seasonPageId = seasonUpsert.pageId

  let createdTeams = 0
  let updatedTeams = 0
  const teamPageIdById = new Map<number, string>()

  // Upsert Teams
  for (const t of teamsParsed) {
    const teamKey = `team:${args.spreadsheetId}:${t.teamId}`
    const res = await upsertByExternalKey(
      DB.teams.databaseId,
      teamKey,
      {
        Team: notionTitle(t.teamName),
        "External Key": notionRichText(teamKey),
        "Team ID": notionNumber(t.teamId),
        "Coach Name": notionRichText(t.coachName),
        Division: notionSelect(t.division || "Unknown"),
        Conference: notionSelect(t.conference || "Unknown"),
        "Logo URL": { url: t.logoUrl || null },
        "Source Sheet": notionSelect("Data"),
        "Source Row": notionNumber(t.sheetRow),
        "Sheet Row": notionNumber(t.sheetRow),
        Active: { checkbox: true },
      },
      { dryRun: args.dryRun },
    )
    if (res.created) createdTeams++
    else updatedTeams++
    teamPageIdById.set(t.teamId, res.pageId)
  }

  // Upsert Team Season Stats + Weekly Results + Match snapshots
  let createdTeamSeasonStats = 0
  let updatedTeamSeasonStats = 0
  let createdWeekly = 0
  let updatedWeekly = 0
  let createdMatches = 0
  let updatedMatches = 0

  for (const t of teamsParsed) {
    const teamKey = `team:${args.spreadsheetId}:${t.teamId}`
    const teamPageId = teamPageIdById.get(t.teamId)

    const teamSeasonKey = `teamSeason:${seasonKey}:${teamKey}`
    const tsRes = await upsertByExternalKey(
      DB.teamSeasonStats.databaseId,
      teamSeasonKey,
      {
        "Team Season Stat": notionTitle(`${t.teamName} — ${args.seasonName}`),
        "External Key": notionRichText(teamSeasonKey),
        Season: notionRelation(seasonPageId),
        Team: notionRelation(teamPageId),
        GP: notionNumber(t.gp),
        Wins: notionNumber(t.wins),
        Losses: notionNumber(t.losses),
        Differential: notionNumber(t.differential),
        "Record (Text)": notionRichText(t.recordText),
        Streak: notionRichText(t.streak),
        "SOS (Percent)": notionNumber(t.sosPercent),
        "Win%": notionNumber(t.winPct),
        "Opponents Win%": notionNumber(t.oppWinPct),
        "Strength of Schedule": notionNumber(t.strengthOfSchedule),
        "Opponents Faced (Text)": notionRichText(t.opponentsFacedText),
        "Source Sheet": notionSelect("Data"),
        "Source Row": notionNumber(t.sheetRow),
      },
      { dryRun: args.dryRun },
    )
    if (tsRes.created) createdTeamSeasonStats++
    else updatedTeamSeasonStats++

    for (const w of t.weekResults) {
      const wkKey = `teamWeek:${seasonKey}:${teamKey}:week:${w.week}`
      const wkRes = await upsertByExternalKey(
        DB.teamWeeklyResults.databaseId,
        wkKey,
        {
          "Team Week Result": notionTitle(`${t.teamName} — Week ${w.week}`),
          "External Key": notionRichText(wkKey),
          Season: notionRelation(seasonPageId),
          Team: notionRelation(teamPageId),
          Week: notionNumber(w.week),
          Result: notionSelect(w.result || "TBD"),
          "Source Sheet": notionSelect("Data"),
          "Source Column (Week #)": notionNumber(w.sourceColumnWeek),
          "Source Row": notionNumber(t.sheetRow),
        },
        { dryRun: args.dryRun },
      )
      if (wkRes.created) createdWeekly++
      else updatedWeekly++
    }

    // Current-week match snapshot (dedup by (week,battle,minId,maxId))
    const m = t.currentWeekMatch
    if (m.week && m.battleNumber && m.oppTeamId) {
      const aId = Math.min(t.teamId, m.oppTeamId)
      const bId = Math.max(t.teamId, m.oppTeamId)
      const matchKey = `match:${seasonKey}:week:${m.week}:battle:${m.battleNumber}:teams:${aId}-${bId}`

      const aPage = teamPageIdById.get(aId)
      const bPage = teamPageIdById.get(bId)

      // Normalize A/B orientation
      const teamAIsSelf = aId === t.teamId
      const scoreA = teamAIsSelf ? m.selfScore : m.oppScore
      const scoreB = teamAIsSelf ? m.oppScore : m.selfScore
      const resultA = teamAIsSelf ? m.selfResult : m.oppResult
      const resultB = teamAIsSelf ? m.oppResult : m.selfResult

      const winnerId =
        resultA === "W" ? aId : resultB === "W" ? bId : null
      const winnerPage = winnerId ? teamPageIdById.get(winnerId) : null

      const status = winnerId ? "Completed" : "Scheduled"

      const matchTitle = `Week ${m.week} • Battle ${m.battleNumber} • ${aId} vs ${bId}`
      const mr = await upsertByExternalKey(
        DB.matches.databaseId,
        matchKey,
        {
          Match: notionTitle(matchTitle),
          "External Key": notionRichText(matchKey),
          Season: notionRelation(seasonPageId),
          Week: notionNumber(m.week),
          "Battle #": notionNumber(m.battleNumber),
          "Team A": notionRelation(aPage),
          "Team B": notionRelation(bPage),
          "Score A": notionNumber(scoreA),
          "Score B": notionNumber(scoreB),
          "Result A": notionSelect(resultA || "TBD"),
          "Result B": notionSelect(resultB || "TBD"),
          Differential: notionNumber(
            m.diff !== null ? Math.abs(m.diff) : scoreA !== null && scoreB !== null ? Math.abs(scoreA - scoreB) : null
          ),
          Winner: notionRelation(winnerPage),
          Status: notionSelect(status),
          "Source Sheet": notionSelect("Data"),
          "Source Row": notionNumber(t.sheetRow),
          Notes: notionRichText(`Snapshot from team row ${t.teamId}`),
        },
        { dryRun: args.dryRun },
      )
      if (mr.created) createdMatches++
      else updatedMatches++
    }
  }

  // Upsert Pokémon + Team Pokémon stats
  let createdPokemon = 0
  let updatedPokemon = 0
  let createdTeamPokemon = 0
  let updatedTeamPokemon = 0
  const pokemonPageIdBySlug = new Map<string, string>()

  for (const stat of pokemonStats) {
    const teamId = teamNameToId.get(stat.teamName)
    if (!teamId) continue
    const teamKey = `team:${args.spreadsheetId}:${teamId}`
    const teamPage = teamPageIdById.get(teamId)
    if (!teamPage) continue

    const slug = slugifyPokemon(stat.pokemonName)
    const pokemonKey = `pokemon:${args.spreadsheetId}:${slug}`

    let pokemonPageId = pokemonPageIdBySlug.get(slug)
    if (!pokemonPageId) {
      const pr = await upsertByExternalKey(
        DB.pokemonIndex.databaseId,
        pokemonKey,
        {
          Pokémon: notionTitle(stat.pokemonName),
          "External Key": notionRichText(pokemonKey),
          "Slug (Smogon/GitHub)": notionRichText(slug),
          "Source Sheet": notionSelect("Data"),
        },
        { dryRun: args.dryRun },
      )
      if (pr.created) createdPokemon++
      else updatedPokemon++
      pokemonPageId = pr.pageId
      pokemonPageIdBySlug.set(slug, pokemonPageId)
    }

    const teamPokemonKey = `teamPokemon:${seasonKey}:${teamKey}:${pokemonKey}:${stat.category}:rank:${stat.rank}`
    const tp = await upsertByExternalKey(
      DB.teamPokemonSeasonStats.databaseId,
      teamPokemonKey,
      {
        "Team Pokémon Stat": notionTitle(`${stat.teamName} • ${stat.category} #${stat.rank} • ${stat.pokemonName}`),
        "External Key": notionRichText(teamPokemonKey),
        Season: notionRelation(seasonPageId),
        Team: notionRelation(teamPage),
        Pokémon: notionRelation(pokemonPageId),
        Category: notionSelect(stat.category),
        Kills: notionNumber(stat.kills),
        Appearances: notionNumber(stat.appearances),
        "Kills/Appearance": notionNumber(stat.killsPerAppearance),
        Rank: notionNumber(stat.rank),
        "Source Sheet": notionSelect("Data"),
        "Source Row": notionNumber(stat.sheetRow),
      },
      { dryRun: args.dryRun },
    )
    if (tp.created) createdTeamPokemon++
    else updatedTeamPokemon++
  }

  console.log("✅ Sync complete (or dry-run). Summary:")
  if (args.dryRun) {
    console.log(`- Teams: upserts=${createdTeams + updatedTeams}`)
    console.log(`- Team season stats: upserts=${createdTeamSeasonStats + updatedTeamSeasonStats}`)
    console.log(`- Team weekly results: upserts=${createdWeekly + updatedWeekly}`)
    console.log(`- Match snapshots: upserts=${createdMatches + updatedMatches}`)
    console.log(`- Pokémon index: upserts=${createdPokemon + updatedPokemon}`)
    console.log(`- Team Pokémon stats: upserts=${createdTeamPokemon + updatedTeamPokemon}`)
  } else {
    console.log(`- Teams: created=${createdTeams} updated=${updatedTeams}`)
    console.log(`- Team season stats: created=${createdTeamSeasonStats} updated=${updatedTeamSeasonStats}`)
    console.log(`- Team weekly results: created=${createdWeekly} updated=${updatedWeekly}`)
    console.log(`- Match snapshots: created=${createdMatches} updated=${updatedMatches}`)
    console.log(`- Pokémon index: created=${createdPokemon} updated=${updatedPokemon}`)
    console.log(`- Team Pokémon stats: created=${createdTeamPokemon} updated=${updatedTeamPokemon}`)
  }
}

main().catch((err) => {
  console.error("❌ Sync failed:", err)
  process.exit(1)
})

