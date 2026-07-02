/**
 * Priority-based regular season schedule:
 * divisional → conference → cross-conference; byes only when a team has no slot that week.
 * Each pair plays at most once.
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

/**
 * Place each matchup in the earliest week both teams are free.
 * Higher-priority matchups claim earlier weeks first.
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
  const unscheduled: PrioritizedMatchup[] = []

  for (const matchup of matchups) {
    let placed = false
    for (let w = 0; w < regularSeasonWeeks; w++) {
      if (
        !weekBusy[w].has(matchup.team1Id) &&
        !weekBusy[w].has(matchup.team2Id)
      ) {
        matches.push({ ...matchup, week: w + 1 })
        weekBusy[w].add(matchup.team1Id)
        weekBusy[w].add(matchup.team2Id)
        placed = true
        break
      }
    }
    if (!placed) {
      unscheduled.push(matchup)
    }
  }

  const byesByWeek: Record<number, string[]> = {}
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
  }

  return { matches, unscheduled, byesByWeek, stats }
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
