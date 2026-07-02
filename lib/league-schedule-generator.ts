/**
 * Priority-based regular season schedule:
 * divisional → conference → cross-conference; byes only when a team has no slot that week.
 * Each pair plays at most once. Each team has at most one bye week when placement allows.
 */

export type MatchPriority = "divisional" | "conference" | "cross_conference"

export type TeamForSchedule = {
  id: string
  conferenceId: string | null
  divisionId: string | null
}

export type PrioritizedMatchup = {
  team1Id: string
  team2Id: string
  priority: MatchPriority
}

export type ScheduledMatch = PrioritizedMatchup & {
  week: number
}

export type ScheduleGenerationResult = {
  matches: ScheduledMatch[]
  unscheduled: PrioritizedMatchup[]
  byesByWeek: Record<number, string[]>
  stats: {
    divisional: number
    conference: number
    crossConference: number
    byeWeeks: number
    maxByesPerTeam: number
  }
}

const PRIORITY_ORDER: MatchPriority[] = ["divisional", "conference", "cross_conference"]

export function classifyMatchup(
  team1: TeamForSchedule,
  team2: TeamForSchedule
): MatchPriority {
  if (
    team1.divisionId &&
    team2.divisionId &&
    team1.divisionId === team2.divisionId
  ) {
    return "divisional"
  }
  if (
    team1.conferenceId &&
    team2.conferenceId &&
    team1.conferenceId === team2.conferenceId
  ) {
    return "conference"
  }
  return "cross_conference"
}

export function buildPrioritizedMatchups(teams: TeamForSchedule[]): PrioritizedMatchup[] {
  const matchups: PrioritizedMatchup[] = []
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      matchups.push({
        team1Id: teams[i].id,
        team2Id: teams[j].id,
        priority: classifyMatchup(teams[i], teams[j]),
      })
    }
  }
  return matchups.sort(
    (a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority)
  )
}

/** Weeks before `weekIndex` (0-based) where the team has no scheduled match yet. */
export function countPriorByes(
  teamId: string,
  weekIndex: number,
  weekBusy: Set<string>[]
): number {
  let byes = 0
  for (let k = 0; k < weekIndex; k++) {
    if (!weekBusy[k].has(teamId)) byes++
  }
  return byes
}

/** Total bye weeks for a team across the full regular season. */
export function countTotalByes(
  teamId: string,
  regularSeasonWeeks: number,
  weekBusy: Set<string>[]
): number {
  return countPriorByes(teamId, regularSeasonWeeks, weekBusy)
}

function canScheduleMatchupInWeek(
  matchup: PrioritizedMatchup,
  weekIndex: number,
  weekBusy: Set<string>[]
): boolean {
  return (
    !weekBusy[weekIndex].has(matchup.team1Id) &&
    !weekBusy[weekIndex].has(matchup.team2Id)
  )
}

function scheduleMatchupInWeek(
  matchup: PrioritizedMatchup,
  weekIndex: number,
  weekBusy: Set<string>[],
  matches: ScheduledMatch[]
): void {
  matches.push({ ...matchup, week: weekIndex + 1 })
  weekBusy[weekIndex].add(matchup.team1Id)
  weekBusy[weekIndex].add(matchup.team2Id)
}

/**
 * Fill the calendar week-by-week. Teams may skip at most one week (one bye).
 * After a team has had a bye, it must be scheduled whenever an opponent is available.
 * Within each week, higher-priority matchups are scheduled first.
 */
export function assignMatchupsToWeeks(
  matchups: PrioritizedMatchup[],
  teamIds: string[],
  regularSeasonWeeks: number
): ScheduleGenerationResult {
  if (regularSeasonWeeks < 1) {
    throw new Error("regularSeasonWeeks must be at least 1")
  }

  const weekBusy: Set<string>[] = Array.from(
    { length: regularSeasonWeeks },
    () => new Set<string>()
  )
  const matches: ScheduledMatch[] = []
  const pending = [...matchups]
  const byeUsed = new Map(teamIds.map((id) => [id, false]))

  for (let w = 0; w < regularSeasonWeeks; w++) {
    let progress = true
    while (progress) {
      progress = false

      for (const teamId of teamIds) {
        if (!byeUsed.get(teamId) || weekBusy[w].has(teamId)) continue

        const mustPlayIdx = pending.findIndex(
          (matchup) =>
            (matchup.team1Id === teamId || matchup.team2Id === teamId) &&
            canScheduleMatchupInWeek(matchup, w, weekBusy)
        )
        if (mustPlayIdx >= 0) {
          const [matchup] = pending.splice(mustPlayIdx, 1)
          scheduleMatchupInWeek(matchup, w, weekBusy, matches)
          progress = true
        }
      }

      const nextIdx = pending.findIndex((matchup) =>
        canScheduleMatchupInWeek(matchup, w, weekBusy)
      )
      if (nextIdx >= 0) {
        const [matchup] = pending.splice(nextIdx, 1)
        scheduleMatchupInWeek(matchup, w, weekBusy, matches)
        progress = true
      }
    }

    for (const teamId of teamIds) {
      if (weekBusy[w].has(teamId)) continue
      if (!byeUsed.get(teamId)) {
        byeUsed.set(teamId, true)
      }
    }
  }

  const byesByWeek: Record<number, string[]> = {}
  const byesPerTeam: Record<string, number> = {}
  for (const teamId of teamIds) {
    byesPerTeam[teamId] = countTotalByes(teamId, regularSeasonWeeks, weekBusy)
  }

  let byeWeeks = 0
  for (let w = 0; w < regularSeasonWeeks; w++) {
    const busy = weekBusy[w]
    const byes = teamIds.filter((id) => !busy.has(id))
    if (byes.length > 0) {
      byesByWeek[w + 1] = byes
      byeWeeks++
    }
  }

  const stats = {
    divisional: matches.filter((m) => m.priority === "divisional").length,
    conference: matches.filter((m) => m.priority === "conference").length,
    crossConference: matches.filter((m) => m.priority === "cross_conference").length,
    byeWeeks,
    maxByesPerTeam: teamIds.length
      ? Math.max(...teamIds.map((id) => byesPerTeam[id] ?? 0))
      : 0,
  }

  return { matches, unscheduled: pending, byesByWeek, stats }
}

export function generatePrioritySchedule(
  teams: TeamForSchedule[],
  regularSeasonWeeks: number
): ScheduleGenerationResult {
  if (teams.length < 2) {
    throw new Error("At least 2 teams are required to generate a schedule")
  }
  const matchups = buildPrioritizedMatchups(teams)
  return assignMatchupsToWeeks(
    matchups,
    teams.map((t) => t.id),
    regularSeasonWeeks
  )
}
