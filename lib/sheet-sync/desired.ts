import { canon, type DexEntry } from "@/lib/sheet-sync/names"
import {
  formatSheetRecord,
  formatStreak,
  normResult,
  roundSos,
  seeding,
  teamStats,
  type RankTeam,
} from "@/lib/sheet-sync/rank"
import type { ParsedTeam, StandingsRow } from "@/lib/sheet-sync/parse"
import type {
  NormalizedAudit,
  NormalizedLeague,
  NormalizedMatch,
  NormalizedPick,
  NormalizedStat,
} from "@/lib/sheet-sync/types"

const REG_WEEKS = 8
const PO_WEEKS = 4
const WEEK1 = "2026-08-24"
const DRAFT_DATE = "2026-08-15"
const PO_ROUND: Record<number, string> = {
  9: "round_1",
  10: "quarterfinals",
  11: "semifinals",
  12: "finals",
}
const PO_LABEL: Record<number, string> = {
  9: "Round 1",
  10: "Quarterfinal",
  11: "Semifinal",
  12: "Final",
}

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function weekStart(week: number, week1: string): string {
  return addDays(week1, 7 * (week - 1))
}

function firstWeek(team: ParsedTeam, mon: string, dex: Map<string, DexEntry>): number | null {
  for (let week = 1; week <= 12; week += 1) {
    if ((team.lineups[week] ?? []).some((entry) => canon(entry.raw, dex) === mon)) return week
  }
  return null
}

function advanced(team: ParsedTeam, week: number): boolean {
  const prev = team.schedule.find((slot) => slot.week === week - 1)
  if (!prev) return false
  return prev.opp === "Bye" || normResult(prev.result) === "W"
}

export function buildDesired(
  teams: ParsedTeam[],
  dex: Map<string, DexEntry>,
  week1 = WEEK1,
): NormalizedLeague & { standingsCheck: Array<{ team: string; record: string; streak: string }>; blockers: string[] } {
  const byName = new Map(teams.map((team) => [team.name, team]))
  const rankTeams: RankTeam[] = teams.map((team) => ({
    name: team.name,
    coach: team.coach,
    teamNumber: team.teamNumber,
    division: team.division,
    isBye: team.isBye,
    schedule: team.schedule.map((slot) => ({
      week: slot.week,
      opp: slot.opp,
      result: slot.result,
      kills: slot.kills,
    })),
  }))
  const stats = teamStats(rankTeams)
  const seeds = seeding(stats, rankTeams)
  const playoff = new Map<string, [number, number, number]>()

  const matches: NormalizedMatch[] = []
  const statRows: NormalizedStat[] = []
  const seen = new Set<string>()
  for (const team of teams) {
    for (const slot of team.schedule) {
      const opponent = byName.get(slot.opp)
      if (!opponent) continue
      const key = `${slot.week}|${[team.teamNumber, opponent.teamNumber].sort((a, b) => a - b).join("-")}`
      if (seen.has(key)) continue
      seen.add(key)
      const oppSlot = opponent.schedule.find((row) => row.week === slot.week)
      if (!oppSlot || oppSlot.opp !== team.name) continue
      let left: [ParsedTeam, typeof slot] = [team, slot]
      let right: [ParsedTeam, typeof oppSlot] = [opponent, oppSlot]
      if (left[0].teamNumber > right[0].teamNumber) [left, right] = [right, left]
      if (left[0].isBye && right[0].isBye) continue
      const leftResult = normResult(left[1].result)
      const rightResult = normResult(right[1].result)
      if (slot.week > REG_WEEKS + 1 && !leftResult && !rightResult) {
        if (!advanced(left[0], slot.week) || !advanced(right[0], slot.week)) continue
      }
      const notes: string[] = []
      let status = "scheduled"
      let winner: string | null = null
      if (leftResult || rightResult) {
        status = "completed"
        if (leftResult === "W" && rightResult !== "W") winner = left[0].name
        else if (rightResult === "W" && leftResult !== "W") winner = right[0].name
        else notes.push(`UNCERTAIN: results ${JSON.stringify(left[1].result)}/${JSON.stringify(right[1].result)}`)
        if (left[1].result === "w" || right[1].result === "w") notes.push("sheet result entered as lowercase 'w'")
        const ka = left[1].kills ?? 0
        const kb = right[1].kills ?? 0
        if ((leftResult === "W" && ka < kb) || (rightResult === "W" && kb < ka)) notes.push("UNCERTAIN: winner has fewer kills")
        if (left[1].kills != null && right[1].kills != null && left[1].kills === right[1].kills) {
          notes.push(`UNCERTAIN outcome type: kills tied ${ka}-${kb} but sheet records ${winner} as winner (possible forfeit/violation ruling)`)
        }
        if (new Set([left[1].kills, right[1].kills]).size === 1 && left[1].kills === 0) {
          /* not 3-0 */
        }
        if ((left[1].kills === 3 && right[1].kills === 0) || (left[1].kills === 0 && right[1].kills === 3)) {
          notes.push("PROBABLE FORFEIT: 3-0 score (Rules: forfeit = 0-3); outcome_type not recorded in sheet")
        }
        if (left[0].isBye || right[0].isBye) notes.push("advanced vs placeholder Bye team (no battle)")
      }
      const score1 = left[1].kills ?? 0
      const score2 = right[1].kills ?? 0
      const match: NormalizedMatch = {
        week: slot.week,
        team1: left[0].name,
        team2: right[0].name,
        score1,
        score2,
        status,
        winner,
        isPlayoff: slot.week > REG_WEEKS,
        playoffRound: PO_ROUND[slot.week] ?? null,
        outcomeType: left[0].isBye || right[0].isBye ? "bye" : "normal",
        notes: notes.length ? notes.join("; ") : null,
        source: "sheet",
      }
      matches.push(match)
      if (status === "completed" && winner && match.isPlayoff) {
        for (const [name, scored, allowed] of [
          [match.team1, score1, score2],
          [match.team2, score2, score1],
        ] as const) {
          const row = playoff.get(name) ?? [0, 0, 0]
          row[name === winner ? 0 : 1] += 1
          row[2] += scored - allowed
          playoff.set(name, row)
        }
      }
      if (status !== "completed") continue
      for (const side of [left[0], right[0]] as const) {
        const agg = new Map<string, number>()
        for (const entry of side.lineups[slot.week] ?? []) {
          const name = canon(entry.raw, dex)
          if (!name) continue
          agg.set(name, (agg.get(name) ?? 0) + entry.kills)
        }
        for (const [pokemon, kills] of agg) {
          statRows.push({
            week: slot.week,
            team1: match.team1,
            team2: match.team2,
            team: side.name,
            pokemon,
            kills,
            source: "sheet",
          })
        }
      }
    }
  }

  const picks: NormalizedPick[] = []
  const audits: NormalizedAudit[] = []
  const blockers: string[] = []
  for (const team of teams) {
    if (team.isBye) continue
    const tera = new Set(team.tera.map((name) => canon(name, dex)).filter((name): name is string => Boolean(name)))
    const adds = new Map<string, (typeof team.moves)[number]>()
    for (const move of team.moves) {
      if (!move.add) continue
      const name = canon(move.add, dex)
      if (name) adds.set(name, move)
    }
    const empty = team.slots.filter((slot) => !slot.name)
    for (const slot of team.slots) {
      const mon = canon(slot.name, dex)
      if (!mon) continue
      const move = adds.get(mon)
      const appeared = firstWeek(team, mon, dex)
      if (move?.drop) move.row = move.row
      picks.push({
        team: team.name,
        pokemon: mon,
        status: "active",
        acquisition: move ? "free_agency" : "draft",
        round: move ? null : slot.round,
        pick: move ? null : slot.pick,
        points: slot.pts ?? 0,
        tera: tera.has(mon),
        start: move ? (appeared ? weekStart(appeared, week1) : null) : DRAFT_DATE,
        end: null,
        notes: move
          ? `FA add (sheet ${move.cell}); occupies roster slot '${slot.label}'; start_date INFERRED from first lineup week ${appeared}`
          : `sheet Team ${team.teamNumber}!D${slot.row} '${slot.label}'`,
        source: "sheet",
      })
      if (move?.drop) (move as { slot?: typeof slot }).slot = slot
    }
    for (const move of team.moves) {
      if (!move.drop) continue
      const dropped = canon(move.drop, dex)
      if (!dropped) continue
      const linked = (move as { slot?: (typeof team.slots)[number] }).slot ?? empty.shift()
      const added = move.add ? canon(move.add, dex) : null
      const appeared = added ? firstWeek(team, added, dex) : null
      const pts = dex.get(dropped.toLowerCase())?.pts
      picks.push({
        team: team.name,
        pokemon: dropped,
        status: "dropped",
        acquisition: "draft",
        round: linked?.round ?? null,
        pick: linked?.pick ?? null,
        points: pts ?? 0,
        tera: false,
        start: DRAFT_DATE,
        end: appeared ? addDays(weekStart(appeared, week1), -1) : null,
        notes: `DROPPED (sheet ${move.cell}); draft slot '${linked?.label ?? "?"}' INFERRED from replacement position; points from Pokédex tab; last lineup week ${lastLineupWeek(team, dropped, dex) || "none"}`,
        source: "sheet",
      })
    }
    for (const move of team.moves) {
      const added = move.add ? canon(move.add, dex) : null
      const dropped = move.drop ? canon(move.drop, dex) : null
      const appeared = added ? firstWeek(team, added, dex) : null
      audits.push({
        sourceKey: `S7-sheet:Team${team.teamNumber}!${move.cell}`,
        team: team.name,
        action: added && dropped ? "free_agency_add_drop" : added ? "free_agency_add" : "drop",
        add: added,
        drop: dropped,
        rawAdd: move.add,
        rawDrop: move.drop,
        effectiveWeek: appeared,
        sourceText: "league sheet Team tab F/G columns; week inferred from first lineup appearance",
      })
    }
  }

  const owners = new Map<string, string[]>()
  for (const pick of picks) {
    const list = owners.get(pick.pokemon) ?? []
    list.push(pick.team)
    owners.set(pick.pokemon, list)
  }
  for (const [pokemon, ownerTeams] of owners) {
    if (new Set(ownerTeams).size > 1) blockers.push(`${pokemon}: ${ownerTeams.join(", ")}`)
  }

  const normalizedTeams = teams.map((team) => {
    const stat = stats.get(team.name)!
    const po = playoff.get(team.name) ?? [0, 0, 0]
    return {
      name: team.name,
      coach: team.coach,
      teamNumber: team.teamNumber,
      division: team.division,
      conference: team.conference,
      isBye: team.isBye,
      isActive: !team.isBye,
      regularWins: stat.w,
      regularLosses: stat.l,
      regularDiff: stat.diff,
      wins: stat.w + po[0],
      losses: stat.l + po[1],
      differential: stat.diff + po[2],
      playoffWins: po[0],
      playoffLosses: po[1],
      playoffDiff: po[2],
      sos: roundSos(stat.sos),
      streakType: team.schedule.some((slot) => slot.week <= 8 && (normResult(slot.result) === "W" || normResult(slot.result) === "L"))
        ? stat.streakLetter
        : null,
      streakLen: stat.streakLen,
    }
  })

  const endDate = addDays(weekStart(REG_WEEKS + PO_WEEKS, week1), 6)
  return {
    season: { key: "AABPBL-Season-7-2027", startDate: week1, endDate },
    teams: normalizedTeams,
    matches,
    picks,
    stats: statRows,
    audits,
    seeds: seeds.seeds.map((stat, index) => ({
      seed: index + 1,
      team: stat.team,
      round1Bye: index < 4,
      divisionWinner: seeds.divisionWinners.has(stat.team),
    })),
    standingsCheck: seeds.seeds.map((stat) => ({
      team: stat.team,
      record: formatSheetRecord(stat),
      streak: formatStreak(stat),
    })),
    blockers,
  }
}

function lastLineupWeek(team: ParsedTeam, mon: string, dex: Map<string, DexEntry>): number {
  let last = 0
  for (let week = 1; week <= 12; week += 1) {
    if ((team.lineups[week] ?? []).some((entry) => canon(entry.raw, dex) === mon)) last = week
  }
  return last
}

export function standingsMatchSheet(
  computed: Array<{ team: string; record: string; streak: string }>,
  sheet: StandingsRow[],
): string[] {
  const problems: string[] = []
  if (computed.length !== sheet.length) problems.push(`row count ${computed.length} vs ${sheet.length}`)
  for (let i = 0; i < Math.min(computed.length, sheet.length); i += 1) {
    const left = computed[i]!
    const right = sheet[i]!
    if (left.team !== right.team || left.record !== right.record || left.streak !== right.streak) {
      problems.push(`${i + 1}: ${left.team} ${left.record} ${left.streak} vs ${right.team} ${right.record} ${right.streak}`)
    }
  }
  return problems
}

export { PO_LABEL }
