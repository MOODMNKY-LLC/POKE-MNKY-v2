import type { ParsedResult } from "@/lib/discord-results/parse"

export type ScheduleMatch = {
  week: number
  team1: string
  team2: string
  status: string
  winner: string | null
  isBye?: boolean
}

export type ReconcileFlag =
  | "OK"
  | "OK_MARGIN_ADVISORY"
  | "WINNER_MISMATCH"
  | "IN_DISCORD_NOT_SHEET"
  | "IN_SHEET_NOT_DISCORD"
  | "NO_MATCH"
  | "SCORE_WITHOUT_TEAM"
  | "LOW_CONFIDENCE"
  | "DISPUTED"

export function claimMatch(
  parsed: ParsedResult,
  postWeek: number,
  matches: ScheduleMatch[],
): { week: number; winner: string | null; loser: string | null } | null {
  const pool = matches.filter((match) => match.week <= postWeek && !match.team1.startsWith("Bye") && !match.team2.startsWith("Bye"))
  const sides = [parsed.winner, parsed.loser].filter((team): team is string => Boolean(team))
  const teams = sides.length >= 2 ? sides : parsed.teams
  const pairing = pool.filter((match) => {
    if (teams.length >= 2) return teams.includes(match.team1) && teams.includes(match.team2)
    if (teams.length === 1) return match.team1 === teams[0] || match.team2 === teams[0]
    return false
  })
  const chosen = pairing.sort((a, b) => b.week - a.week)[0]
  if (!chosen) return null
  const winner = parsed.winner ?? (teams.length === 1 ? teams[0]! : null)
  const loser = parsed.loser ?? (winner === chosen.team1 ? chosen.team2 : winner === chosen.team2 ? chosen.team1 : null)
  return { week: chosen.week, winner, loser }
}

export function reconcile(input: {
  parsed: ParsedResult
  sheetWinner: string | null
  sheetStatus: "scheduled" | "completed"
  sheetKills?: [number, number] | null
  ageHours?: number
}): { flag: ReconcileFlag; severity: "none" | "info" | "warn" | "high"; marginComparable: boolean } {
  if (input.parsed.queue === "SCORE_WITHOUT_TEAM") {
    return { flag: "SCORE_WITHOUT_TEAM", severity: "info", marginComparable: false }
  }
  if (!input.parsed.winner) {
    return { flag: "LOW_CONFIDENCE", severity: "info", marginComparable: false }
  }
  if (input.sheetStatus === "scheduled") {
    const high = (input.ageHours ?? 0) >= 24
    return { flag: "IN_DISCORD_NOT_SHEET", severity: high ? "high" : "warn", marginComparable: false }
  }
  if (input.sheetWinner && input.parsed.winner !== input.sheetWinner) {
    return { flag: "WINNER_MISMATCH", severity: "high", marginComparable: false }
  }
  const comparable = !input.parsed.timer && !input.parsed.forfeit && !input.parsed.tieReported
  if (!comparable) return { flag: "OK", severity: "none", marginComparable: false }
  if (input.sheetKills && input.parsed.remaining != null) {
    const loserKills = 6 - input.parsed.remaining
    const sheetLoser = Math.min(...input.sheetKills)
    if (sheetLoser !== loserKills) {
      return { flag: "OK_MARGIN_ADVISORY", severity: "info", marginComparable: true }
    }
  }
  return { flag: "OK", severity: "none", marginComparable: true }
}

export function digestAllowed(input: { enabled: boolean; channelId: string | null; blockedIds: string[] }): boolean {
  if (!input.enabled || !input.channelId) return false
  return !input.blockedIds.includes(input.channelId)
}

export function postDigest(): never {
  throw new Error("mod digest is disabled")
}
