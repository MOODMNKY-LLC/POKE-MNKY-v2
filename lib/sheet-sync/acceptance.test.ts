import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { buildDesired, standingsMatchSheet } from "@/lib/sheet-sync/desired"
import { diffLeague, gateChanges } from "@/lib/sheet-sync/diff"
import { loadSnapshotDir, parseSnapshot, type ParsedTeam } from "@/lib/sheet-sync/parse"
import { SHEET_SYNC_SCOPES, type NormalizedLeague } from "@/lib/sheet-sync/types"
import { pickStandingsSeason, type StandingsSeasonRow } from "@/lib/standings-season"
import { authorizeSheetSync } from "@/lib/sheet-sync/auth"

const snapshotDir = join(process.cwd(), "fixtures/league-sheet/s7-2026-11-01")
const production = JSON.parse(
  readFileSync(join(process.cwd(), "fixtures/league-sheet/s7-production-public.json"), "utf8"),
) as NormalizedLeague

function desiredFrom(teams?: ParsedTeam[]) {
  const tabs = loadSnapshotDir(snapshotDir)
  const parsed = parseSnapshot(tabs)
  const built = buildDesired(teams ?? parsed.teams, parsed.dex, parsed.week1 ?? "2026-08-24")
  return { parsed, built }
}

describe("sheet sync acceptance", () => {
  it("1. a second pass against the production snapshot is empty", () => {
    const { built } = desiredFrom()
    const changes = diffLeague(built, production)
    expect(changes, JSON.stringify(changes.slice(0, 8), null, 2)).toEqual([])
    const gated = gateChanges({
      changes,
      blockers: built.blockers,
      sheetTeamNames: built.teams.map((team) => team.name),
      dbTeamNames: production.teams.map((team) => team.name),
      sheetWeek1: built.season.startDate,
      dbWeek1: production.season.startDate,
    })
    expect(gated.status).toBe("no_changes")
  })

  it("2. computed standings match Standings For Playoffs", () => {
    const { parsed, built } = desiredFrom()
    expect(standingsMatchSheet(built.standingsCheck, parsed.standings)).toEqual([])
  })

  it("3. parser counts match the Season 7 importer", () => {
    const { built } = desiredFrom()
    expect(built.teams).toHaveLength(12)
    expect(built.matches).toHaveLength(48)
    expect(built.picks).toHaveLength(96)
    expect(built.stats).toHaveLength(389)
    expect(built.audits).toHaveLength(8)
    expect(built.seeds).toHaveLength(12)
    expect(built.blockers).toEqual([])
  })

  it("4. a filled quarterfinal updates that match only and does not invent a semi", () => {
    const { parsed, built } = desiredFrom()
    const baseline = diffLeague(built, built)
    expect(baseline).toEqual([])
    const teams = structuredClone(parsed.teams)
    const boise = teams.find((team) => team.name === "Boise State Mudsdales")!
    const daycare = teams.find((team) => team.name === "Daycare Dittos")!
    const boiseWeek = boise.schedule.find((slot) => slot.week === 10)!
    const daycareWeek = daycare.schedule.find((slot) => slot.week === 10)!
    boiseWeek.result = "L"
    boiseWeek.kills = 0
    daycareWeek.result = "W"
    daycareWeek.kills = 3
    daycare.lineups[10] = [{ raw: "Pikachu", kills: 3, cell: "C33" }]
    const next = buildDesired(teams, parsed.dex, parsed.week1 ?? "2026-08-24")
    const changes = diffLeague(next, built)
    expect(changes.filter((change) => change.table === "matches" && change.op === "update")).toHaveLength(1)
    expect(changes.filter((change) => change.table === "pokemon_stats" && change.op === "insert").length).toBeGreaterThan(0)
    const teamUpdates = changes.filter((change) => change.table === "teams").map((change) => change.key.name)
    expect(teamUpdates).toEqual(expect.arrayContaining(["Daycare Dittos", "Boise State Mudsdales"]))
    expect(next.standingsCheck).toEqual(built.standingsCheck)
    expect(next.matches.some((match) => match.week === 11)).toBe(false)

    const alabama = teams.find((team) => team.name === "Alabama Donphans")!
    const semiA = alabama.schedule.find((slot) => slot.week === 11)!
    const semiD = daycare.schedule.find((slot) => slot.week === 11)!
    semiA.opp = "Daycare Dittos"
    semiD.opp = "Alabama Donphans"
    const tooEarly = buildDesired(
      teams.map((team) => ({
        ...team,
        schedule: team.schedule.map((slot) =>
          slot.week === 10 && (team.name === "Boise State Mudsdales" || team.name === "Daycare Dittos")
            ? { ...slot, result: "", kills: null }
            : slot,
        ),
      })),
      parsed.dex,
      parsed.week1 ?? "2026-08-24",
    )
    expect(tooEarly.matches.some((match) => match.week === 11)).toBe(false)
    const bothFeeders = buildDesired(teams, parsed.dex, parsed.week1 ?? "2026-08-24")
    expect(bothFeeders.matches.some((match) => match.week === 11 && match.team1 && match.team2)).toBe(true)
  })

  it("5. lineup edits and a cleared result stay limited to sheet-owned rows", () => {
    const { parsed, built } = desiredFrom()
    const teams = structuredClone(parsed.teams)
    const team = teams.find((row) => (row.lineups[1] ?? []).some((entry) => entry.kills > 0))!
    const entry = team.lineups[1]!.find((row) => row.kills > 0)!
    entry.kills += 1
    const killChanges = diffLeague(buildDesired(teams, parsed.dex, parsed.week1 ?? "2026-08-24"), built)
    expect(killChanges.filter((change) => change.table === "pokemon_stats" && change.op === "update")).toHaveLength(1)

    const renamed = structuredClone(parsed.teams)
    const host = renamed.find((row) => (row.lineups[1] ?? []).length > 0)!
    const target = host.lineups[1]![0]!
    const previous = target.raw
    target.raw = previous === "Pikachu" ? "Eevee" : "Pikachu"
    const renameChanges = diffLeague(buildDesired(renamed, parsed.dex, parsed.week1 ?? "2026-08-24"), built)
    expect(renameChanges.filter((change) => change.table === "pokemon_stats" && change.op === "delete").length).toBeGreaterThan(0)
    expect(renameChanges.filter((change) => change.table === "pokemon_stats" && change.op === "insert").length).toBeGreaterThan(0)

    const cleared = structuredClone(parsed.teams)
    const home = cleared[0]!
    const week = home.schedule.find((slot) => slot.week === 1)!
    const away = cleared.find((row) => row.name === week.opp)!
    week.result = ""
    week.kills = null
    const awaySlot = away.schedule.find((slot) => slot.week === 1)!
    awaySlot.result = ""
    awaySlot.kills = null
    const clearChanges = diffLeague(buildDesired(cleared, parsed.dex, parsed.week1 ?? "2026-08-24"), built)
    const match = clearChanges.find((change) => change.table === "matches" && change.op === "update" && change.key.week === 1)
    expect(match?.after).toMatchObject({ status: "scheduled", winner: null, score1: 0, score2: 0 })
    expect(clearChanges.some((change) => change.table === "pokemon_stats" && change.op === "delete" && change.key.week === 1)).toBe(true)
  })

  it("6. editing a transaction cell supersedes the old audit row", () => {
    const { parsed, built } = desiredFrom()
    const teams = structuredClone(parsed.teams)
    const team = teams.find((row) => row.moves.length > 0)!
    const move = team.moves[0]!
    move.add = move.add ? `${move.add} X` : "Pikachu"
    const changes = diffLeague(buildDesired(teams, parsed.dex, parsed.week1 ?? "2026-08-24"), built)
    const audits = changes.filter((change) => change.table === "transaction_audit")
    expect(audits.some((change) => change.op === "update" && (change.after as { superseded?: boolean }).superseded)).toBe(true)
    expect(audits.some((change) => change.op === "insert" && String(change.key.sourceKey).includes("#"))).toBe(true)
    expect(changes.some((change) => change.table === "draft_picks")).toBe(true)
  })

  it("7. guards block a reset sheet, a large delete, and a duplicate pokemon", () => {
    const { built } = desiredFrom()
    expect(gateChanges({
      changes: [],
      blockers: [],
      sheetTeamNames: ["Only One"],
      dbTeamNames: built.teams.map((team) => team.name),
      sheetWeek1: "2027-03-01",
      dbWeek1: "2026-08-24",
    }).status).toBe("blocked")
    expect(gateChanges({
      changes: Array.from({ length: 26 }, (_, index) => ({
        table: "pokemon_stats" as const,
        op: "delete" as const,
        key: { week: index },
        before: {},
        after: null,
      })),
      blockers: [],
      sheetTeamNames: built.teams.map((team) => team.name),
      dbTeamNames: built.teams.map((team) => team.name),
      sheetWeek1: "2026-08-24",
      dbWeek1: "2026-08-24",
    }).status).toBe("blocked")
    expect(gateChanges({
      changes: [{ table: "matches", op: "insert", key: {}, before: null, after: {} }],
      blockers: ["Pikachu: A, B"],
      sheetTeamNames: built.teams.map((team) => team.name),
      dbTeamNames: built.teams.map((team) => team.name),
      sheetWeek1: "2026-08-24",
      dbWeek1: "2026-08-24",
    }).status).toBe("failed")
  })

  it("8. the Google client is read-only", () => {
    const source = readFileSync(join(process.cwd(), "lib/sheet-sync/read.ts"), "utf8")
    for (const scope of SHEET_SYNC_SCOPES) expect(source).toContain(scope)
    expect(source).not.toMatch(/values\.(update|append|batchUpdate)/)
    expect(source).not.toMatch(/spreadsheets\.batchUpdate/)
    const dir = join(process.cwd(), "lib/sheet-sync")
    for (const name of readdirSync(dir)) {
      const path = join(dir, name)
      if (!statSync(path).isFile() || !name.endsWith(".ts")) continue
      const text = readFileSync(path, "utf8")
      expect(text).not.toMatch(/values\.(update|append)\(/)
    }
  })

  it("9. cron requires the bearer secret and an admin may dry-run", () => {
    expect(authorizeSheetSync({ authorization: null, cronSecret: "top-secret", isAdmin: false, dryRun: true })).toBe(false)
    expect(authorizeSheetSync({ authorization: "Bearer wrong", cronSecret: "top-secret", isAdmin: false, dryRun: false })).toBe(false)
    expect(authorizeSheetSync({ authorization: "Bearer top-secret", cronSecret: "top-secret", isAdmin: false, dryRun: false })).toBe(true)
    expect(authorizeSheetSync({ authorization: null, cronSecret: "top-secret", isAdmin: true, dryRun: true })).toBe(true)
    expect(authorizeSheetSync({ authorization: null, cronSecret: "top-secret", isAdmin: true, dryRun: false })).toBe(false)
  })

  it("10. a human note on Michigan vs Leicester is preserved", () => {
    const { built } = desiredFrom()
    const current: NormalizedLeague = structuredClone(production)
    const match = current.matches.find(
      (row) => row.week === 8 && [row.team1, row.team2].sort().join("|") === ["Leicester Lycanrocs", "Michigan Meowscaradas"].sort().join("|"),
    )
    expect(match?.notes).toMatch(/won on timer/)
    expect(match?.notes).not.toMatch(/\d{17,20}/)
    const changes = diffLeague(built, current)
    expect(changes.find((change) => change.table === "matches" && change.key.week === 8)).toBeUndefined()
  })

  it("11. standings and MVP default to the synced season while is_current stays Season 8", () => {
    const seasons: StandingsSeasonRow[] = [
      { id: "s8", name: "Season 8", season_id: "AABPBL-Season-8-2027", is_current: true, sheet_sync_enabled: false, start_date: "2027-03-29", end_date: "2027-06-20" },
      { id: "s7", name: "Season 7", season_id: "AABPBL-Season-7-2027", is_current: false, sheet_sync_enabled: true, start_date: "2026-08-24", end_date: "2026-11-15" },
    ]
    expect(pickStandingsSeason(seasons, null, "2026-11-01")?.season_id).toBe("AABPBL-Season-7-2027")
    expect(seasons.find((season) => season.is_current)?.season_id).toBe("AABPBL-Season-8-2027")
    const noFlag = seasons.map((season) => ({ ...season, sheet_sync_enabled: false }))
    expect(pickStandingsSeason(noFlag, null, "2026-11-01")?.id).toBe("s7")
    expect(pickStandingsSeason(noFlag, null, "2027-04-01")?.id).toBe("s8")
    expect(pickStandingsSeason(noFlag, null, "2020-01-01")?.id).toBe("s8")
  })

  it("does not commit a 17-20 digit id in a league fixture", () => {
    const root = join(process.cwd(), "fixtures/league-sheet")
    const files: string[] = []
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name)
        if (statSync(path).isDirectory()) walk(path)
        else files.push(path)
      }
    }
    walk(root)
    for (const file of files) {
      expect(readFileSync(file, "utf8")).not.toMatch(/\d{17,20}/)
    }
  })
})
