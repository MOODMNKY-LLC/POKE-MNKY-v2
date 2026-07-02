/**
 * Season-specific conference/division assignment from team slot numbers.
 * Data-driven: conference_count and division_count come from season config.
 */

export type SeasonLeagueStructure = {
  conferenceCount: number
  divisionCount: number
  teamSlotCount: number
}

export type TeamSlotPlacement = {
  teamNumber: number
  conferenceNumber: number
  divisionNumber: number
  conferenceLabel: string
  divisionLabel: string
}

export type ConferenceDivisionLabels = {
  conferenceNames?: string[]
  divisionNames?: string[]
}

function assertPositiveInt(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive integer`)
  }
}

/**
 * Conference cycles by team number (odd/even for 2 conferences).
 * Division cycles independently across division count.
 */
export function computeTeamSlotPlacement(
  teamNumber: number,
  structure: Pick<SeasonLeagueStructure, "conferenceCount" | "divisionCount">,
  labels?: ConferenceDivisionLabels
): TeamSlotPlacement {
  assertPositiveInt(teamNumber, "teamNumber")
  assertPositiveInt(structure.conferenceCount, "conferenceCount")
  assertPositiveInt(structure.divisionCount, "divisionCount")

  const conferenceNumber = ((teamNumber - 1) % structure.conferenceCount) + 1
  const divisionNumber = ((teamNumber - 1) % structure.divisionCount) + 1

  const conferenceLabel =
    labels?.conferenceNames?.[conferenceNumber - 1] ?? `Conference ${conferenceNumber}`
  const divisionLabel =
    labels?.divisionNames?.[divisionNumber - 1] ?? `Division ${divisionNumber}`

  return {
    teamNumber,
    conferenceNumber,
    divisionNumber,
    conferenceLabel,
    divisionLabel,
  }
}

export function computeAllTeamSlotPlacements(
  structure: SeasonLeagueStructure,
  labels?: ConferenceDivisionLabels
): TeamSlotPlacement[] {
  assertPositiveInt(structure.teamSlotCount, "teamSlotCount")
  return Array.from({ length: structure.teamSlotCount }, (_, i) =>
    computeTeamSlotPlacement(i + 1, structure, labels)
  )
}

export function defaultTeamSlotName(teamNumber: number): string {
  return `Team ${teamNumber}`
}
