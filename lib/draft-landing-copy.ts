export type DraftLandingSeason = {
  name: string | null
  teamSlotCount: number | null
  poolSize: number | null
}

export function draftSeasonLabel(name: string | null): string {
  const trimmed = name?.trim()
  return trimmed ? trimmed : "Current season"
}

export function draftPoolCountLabel(poolSize: number | null): string {
  if (poolSize == null) return "Pool unavailable"
  if (poolSize <= 0) return "Pool not published"
  return `${poolSize.toLocaleString("en-US")} Pokemon`
}

export function draftTeamCountLabel(teamSlotCount: number | null): string {
  if (teamSlotCount == null || teamSlotCount <= 0) return "Team count not set"
  const noun = teamSlotCount === 1 ? "Team" : "Teams"
  return `${teamSlotCount.toLocaleString("en-US")} ${noun}`
}

export function draftHeroDescription(season: DraftLandingSeason): string {
  const seasonName = draftSeasonLabel(season.name)
  if (season.poolSize == null) {
    return `${seasonName} uses a 120-point snake draft. The draft pool size is unavailable right now.`
  }
  if (season.poolSize <= 0) {
    return `${seasonName} uses a 120-point snake draft. The draft pool has not been published yet.`
  }
  const count = season.poolSize.toLocaleString("en-US")
  return `Build your championship team through strategic point-budget drafting. With 120 points per team and a snake draft format, every pick matters in ${seasonName}. Select from ${count} available Pokemon organized by competitive tiers.`
}

export function draftSnakeOrderDescription(teamSlotCount: number | null): string {
  if (teamSlotCount != null && teamSlotCount > 1) {
    const last = teamSlotCount.toLocaleString("en-US")
    return `Round 1 goes Team 1 → Team ${last}, then Round 2 reverses (Team ${last} → Team 1). This ensures fairness and strategic depth as teams adapt to each round's order.`
  }
  return "Round 1 runs from the first team to the last, then Round 2 reverses. This ensures fairness and strategic depth as teams adapt to each round's order."
}

export function draftLiveProgressDescription(teamSlotCount: number | null): string {
  const teams =
    teamSlotCount != null && teamSlotCount > 0
      ? `all ${teamSlotCount.toLocaleString("en-US")} teams`
      : "every team"
  return `Watch picks happen live with real-time updates. See which Pokemon are available, track team budgets, and monitor draft progress across ${teams}.`
}

export function draftCtaDescription(season: DraftLandingSeason): string {
  const seasonName = draftSeasonLabel(season.name)
  const coaches =
    season.teamSlotCount != null && season.teamSlotCount > 0
      ? `${season.teamSlotCount.toLocaleString("en-US")} coaches`
      : "coaches"
  return `Join ${coaches} competing in ${seasonName}. Build your championship roster through strategic point-budget drafting with real-time updates and AI-powered insights.`
}
