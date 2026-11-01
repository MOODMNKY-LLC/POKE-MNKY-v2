import path from "node:path"
import { describe, expect, it } from "vitest"
import { loadLeagueSheetFixture } from "@/lib/league-sheet/load-fixture"
import { parseTeamTabs } from "@/lib/league-sheet/parse-tabs"
import {
  applyPlanInMemory,
  emptyLeagueDb,
  matchesToSync,
  planLeagueSheet,
  signedDifferential,
  snapshotFromSheet,
} from "@/lib/league-sheet/plan"
import { authorizeCron, parseSyncCliArgs, runSheetSync } from "@/lib/league-sheet/run"
import { buildTeamRankInputsFromMatches } from "@/lib/playoff-standings-from-matches"
import { rankTeams } from "@/lib/playoff-seeding"
import { SEASON_7_OVERALL_ORDER, SEASON_7_STANDINGS } from "@/lib/sheet-standings-season7"
import { pickStandingsSeason, type StandingsSeasonRow } from "@/lib/standings-season"

const fixturePath = path.join(process.cwd(), "fixtures/league-sheet/season7.json")
const sheet = loadLeagueSheetFixture(fixturePath)

function projectedOrder(source = sheet): string[] {
  const inputs = buildTeamRankInputsFromMatches(
    source.teams.map((team) => ({
      id: team.name,
      name: team.name,
      conference: team.conference,
      division: team.division,
      coachName: team.coach,
      isBye: team.isBye,
    })),
    source.matches
      .filter((match) => !match.isPlayoff)
      .map((match) => ({
        team1_id: match.team1,
        team2_id: match.team2,
        winner_id: match.winner,
        week: match.week,
        status: match.status,
        team1_score: match.team1Score,
        team2_score: match.team2Score,
        differential: signedDifferential(match),
        outcome_type: match.outcomeType,
        is_playoff: false,
      })),
    { regularSeasonWeeks: source.regularSeasonWeeks },
  )
  return rankTeams(inputs).map((team) => team.teamName)
}

describe("league sheet sync acceptance", () => {
  it("1. dry-run plans the sheet and applies nothing", () => {
    const result = runSheetSync(sheet, emptyLeagueDb(), true)
    expect(result.plan.changes.length).toBeGreaterThan(0)
    expect(result.log.status).toBe("dry_run")
    expect(result.log.changesApplied).toBe(0)
    expect(result.log.dryRun).toBe(true)
  })

  it("2. a re-run against the synced rows is a no-op", () => {
    const first = planLeagueSheet(sheet, emptyLeagueDb())
    const synced = applyPlanInMemory(emptyLeagueDb(), sheet, first)
    const second = planLeagueSheet(sheet, synced)
    expect(second.changes).toEqual([])
  })

  it("3. Season 7 records and order match the sheet", () => {
    expect(projectedOrder()).toEqual(SEASON_7_OVERALL_ORDER)
    const inputs = buildTeamRankInputsFromMatches(
      sheet.teams.map((team) => ({
        id: team.name,
        name: team.name,
        conference: team.conference,
        division: team.division,
        coachName: team.coach,
        isBye: team.isBye,
      })),
      sheet.matches.filter((match) => !match.isPlayoff).map((match) => ({
        team1_id: match.team1,
        team2_id: match.team2,
        winner_id: match.winner,
        week: match.week,
        status: match.status,
        team1_score: match.team1Score,
        team2_score: match.team2Score,
        is_playoff: false,
      })),
      { regularSeasonWeeks: 8 },
    )
    for (const expected of SEASON_7_STANDINGS) {
      const actual = inputs.find((team) => team.teamName === expected.team)
      expect(actual?.wins).toBe(expected.wins)
      expect(actual?.losses).toBe(expected.losses)
      expect(actual?.differential).toBe(expected.differential)
    }
  })

  it("4. sync is a strict no-op against the current production-shaped Season 7 snapshot", () => {
    const production = snapshotFromSheet(sheet)
    production.season!.isCurrent = false
    expect(planLeagueSheet(sheet, production).changes).toEqual([])
    const flipped = structuredClone(production)
    const match = flipped.matches[0]!
    const team1 = match.team1Name
    match.team1Name = match.team2Name
    match.team2Name = team1
    const score = match.team1Score
    match.team1Score = match.team2Score
    match.team2Score = score
    match.differential = match.differential == null ? null : -match.differential
    expect(planLeagueSheet(sheet, flipped).changes).toEqual([])
  })

  it("5. completed matches store a signed team1 minus team2 differential", () => {
    const plan = planLeagueSheet(sheet, emptyLeagueDb())
    const completed = plan.changes.filter(
      (change) => change.table === "matches" && change.fields.status === "completed" && change.fields.is_playoff === false,
    )
    expect(completed.length).toBeGreaterThan(0)
    for (const change of completed) {
      const score1 = change.fields.team1_score
      const score2 = change.fields.team2_score
      expect(change.fields.differential).toBe(Number(score1) - Number(score2))
    }
  })

  it("6. bye-versus-bye games are not imported and bye teams stay inactive", () => {
    const withByeGame = structuredClone(sheet)
    withByeGame.matches.push({
      week: 1,
      team1: "Bye 1",
      team2: "Bye 2",
      team1Score: 0,
      team2Score: 0,
      winner: null,
      status: "completed",
      isPlayoff: false,
      playoffRound: null,
      outcomeType: "double_forfeit",
    })
    expect(matchesToSync(withByeGame).some((match) => match.team1 === "Bye 1" && match.team2 === "Bye 2")).toBe(false)
    const plan = planLeagueSheet(sheet, emptyLeagueDb())
    const bye = plan.changes.find((change) => change.table === "teams" && change.key === "Bye 1")
    expect(bye?.fields.is_bye).toBe(true)
    expect(bye?.fields.is_active).toBe(false)
  })

  it("7. playoff matches keep their bracket round and bye outcome", () => {
    const plan = planLeagueSheet(sheet, emptyLeagueDb())
    const playoff = plan.changes.filter((change) => change.table === "matches" && change.fields.is_playoff === true)
    expect(playoff.some((change) => change.fields.playoff_round === "round_1" && change.fields.outcome_type === "bye")).toBe(true)
    expect(playoff.some((change) => change.fields.playoff_round === "quarterfinals" && change.fields.status === "scheduled")).toBe(true)
    expect(playoff.some((change) => change.fields.playoff_round === "quarterfinals" && change.fields.status === "completed")).toBe(true)

    const parsed = parseTeamTabs([
      {
        teamNumber: 3,
        values: grid("Kalamazoo Kangaskhans", "Andy W", "Leon", "Hoenn", [
          ["Playoffs (Round 1)", "Bye 1", "W", "0", "0"],
        ]),
      },
      {
        teamNumber: 11,
        values: grid("Bye 1", "", "Leon", "Hoenn", [
          ["Playoffs (Round 1)", "Kalamazoo Kangaskhans", "L", "0", "0"],
        ]),
      },
    ])
    expect(parsed.matches[0]).toMatchObject({
      isPlayoff: true,
      playoffRound: "round_1",
      outcomeType: "bye",
      winner: "Kalamazoo Kangaskhans",
    })
  })

  it("8. is_current is never written, so Season 8 stays the draft season", () => {
    const plan = planLeagueSheet(sheet, emptyLeagueDb())
    for (const change of plan.changes) {
      expect(change.fields).not.toHaveProperty("is_current")
      expect(change.fields).not.toHaveProperty("isCurrent")
    }
  })

  it("9. standings and MVP default to the live season instead of is_current", () => {
    const seasons: StandingsSeasonRow[] = [
      { id: "s8", name: "Season 8", season_id: "AABPBL-Season-8-2027", is_current: true, sheet_sync_enabled: false, start_date: "2027-03-29", end_date: "2027-06-20" },
      { id: "s7", name: "Season 7", season_id: "AABPBL-Season-7-2027", is_current: false, sheet_sync_enabled: true, start_date: "2026-08-24", end_date: "2026-11-15" },
    ]
    expect(pickStandingsSeason(seasons, null, "2026-11-01")?.season_id).toBe("AABPBL-Season-7-2027")
    expect(pickStandingsSeason(seasons, "AABPBL-Season-8-2027")?.id).toBe("s8")
    expect(pickStandingsSeason(
      seasons.map((season) => ({ ...season, sheet_sync_enabled: false })),
      undefined,
      "2020-01-01",
    )?.id).toBe("s8")
  })

  it("10. the cron route rejects a missing or wrong secret", () => {
    expect(authorizeCron(null, "top-secret")).toBe(false)
    expect(authorizeCron("Bearer wrong", "top-secret")).toBe(false)
    expect(authorizeCron("Bearer top-secret", "top-secret")).toBe(true)
    expect(authorizeCron("Bearer top-secret", "")).toBe(false)
  })

  it("11. an applied run logs the season and the planned change count", () => {
    const synced = snapshotFromSheet(sheet)
    const result = runSheetSync(sheet, synced, false)
    expect(result.log).toMatchObject({
      status: "applied",
      seasonKey: "AABPBL-Season-7-2027",
      dryRun: false,
      changesPlanned: 0,
      changesApplied: 0,
    })
    expect(result.log.summary).toEqual({ byTable: {} })
  })

  it("parses the CLI dry-run and fixture flags", () => {
    expect(parseSyncCliArgs(["--dry-run", "--fixture", "fixtures/league-sheet/season7.json"])).toEqual({
      dryRun: true,
      fixture: "fixtures/league-sheet/season7.json",
    })
  })
})

function grid(name: string, coach: string, conference: string, division: string, schedule: string[][]): string[][] {
  const values = Array.from({ length: 16 }, () => Array.from({ length: 12 }, () => ""))
  values[1]![0] = name
  values[3]![0] = coach
  values[5]![0] = conference
  values[7]![0] = division
  schedule.forEach((row, index) => {
    const target = values[index + 1]!
    target[7] = row[0] ?? ""
    target[8] = row[1] ?? ""
    target[9] = row[2] ?? ""
    target[10] = row[3] ?? ""
    target[11] = row[4] ?? ""
  })
  return values
}
