/**
 * Schedule Generator
 * Generates round-robin or division-based match schedules for N teams over M weeks
 */

export interface ScheduleMatch {
  team1_id: string
  team2_id: string
  week: number
  matchweek_id?: string
}

export interface ScheduleGeneratorConfig {
  teamIds: string[]
  weeks: number
  matchweekIdsByWeek?: Record<number, string>
}

/**
 * Generate a round-robin schedule where each team plays each other exactly once.
 * For N teams, we get N*(N-1)/2 matches. Distribute across weeks (one match per pair per week).
 */
export function generateRoundRobinSchedule(
  config: ScheduleGeneratorConfig
): ScheduleMatch[] {
  const { teamIds, weeks, matchweekIdsByWeek } = config
  const n = teamIds.length
  if (n < 2) return []

  const matches: ScheduleMatch[] = []
  const pairs: Array<[string, string]> = []
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      pairs.push([teamIds[i], teamIds[j]])
    }
  }

  const matchesPerWeek = Math.max(1, Math.floor(n / 2))
  let pairIdx = 0
  for (let w = 1; w <= weeks && pairIdx < pairs.length; w++) {
    for (let i = 0; i < matchesPerWeek && pairIdx < pairs.length; i++) {
      const [t1, t2] = pairs[pairIdx++]
      matches.push({
        team1_id: t1,
        team2_id: t2,
        week: w,
        matchweek_id: matchweekIdsByWeek?.[w],
      })
    }
  }

  return matches
}

/**
 * Generate a simple schedule: pair teams for each week, cycling through.
 * Each team plays at most one match per week. Uses circle method rotation.
 */
export function generateSimpleSchedule(
  config: ScheduleGeneratorConfig
): ScheduleMatch[] {
  const { teamIds, weeks, matchweekIdsByWeek } = config
  const n = teamIds.length
  if (n < 2) return []

  const matches: ScheduleMatch[] = []
  let arr = [...teamIds]

  for (let w = 1; w <= weeks; w++) {
    for (let i = 0; i < arr.length - 1; i += 2) {
      const t1 = arr[i]
      const t2 = arr[i + 1]
      if (t1 && t2) {
        matches.push({
          team1_id: t1,
          team2_id: t2,
          week: w,
          matchweek_id: matchweekIdsByWeek?.[w],
        })
      }
    }
    // Rotate: keep first, rotate rest
    const first = arr[0]
    const rest = arr.slice(1)
    const last = rest.pop()!
    rest.unshift(last)
    arr = [first, ...rest]
  }

  return matches
}
