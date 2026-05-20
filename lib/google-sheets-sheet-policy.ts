import { isAabDataTabLayout } from "@/lib/google-sheets-data-tab"

export type TeamsSyncEligibility = {
  allowed: boolean
  reason?: string
}

/** Sheets that are the canonical source for league team standings in AAB spreadsheets. */
export function isRecommendedTeamsSyncSheet(sheetName: string): boolean {
  return sheetName.trim().toLowerCase() === "data"
}

/**
 * Whether a sheet mapping to `teams` should run during sync.
 * Prevents per-coach team pages, Pokédex, rules, etc. from flooding the DB.
 */
export function getTeamsSyncEligibility(
  sheetName: string,
  headerValues?: string[]
): TeamsSyncEligibility {
  const name = sheetName.trim()
  const lower = name.toLowerCase()

  if (lower === "data" || isAabDataTabLayout(headerValues)) {
    return { allowed: true }
  }

  if (/^team\s+\d+$/i.test(name)) {
    return {
      allowed: false,
      reason:
        "Per-team roster pages (Team 1, Team 2, …) are not league standings. Sync the Data tab instead.",
    }
  }

  const blockedNamePatterns: Array<{ test: RegExp; reason: string }> = [
    { test: /^rules?$/i, reason: "Rules sheets are not team standings." },
    { test: /^pok[eé]dex$/i, reason: "Pokédex sheets are not team standings." },
    { test: /^mvp$/i, reason: "MVP ranking sheets are not team standings." },
    { test: /^backend\s+data$/i, reason: "Backend Data is internal reference, not team standings." },
    { test: /^mods\b/i, reason: "Mod discussion sheets are not team standings." },
    { test: /^divisions?$/i, reason: "Divisions layout sheets are not team standings." },
    { test: /^draft\s+board/i, reason: "Draft board sheets map to team_rosters, not teams." },
    { test: /^pok[eé]mon\s+list/i, reason: "Pokémon list sheets are not team standings." },
  ]

  for (const { test, reason } of blockedNamePatterns) {
    if (test.test(name)) return { allowed: false, reason }
  }

  const headers = headerValues ?? []
  if (headers.length > 0 && headers.every((h) => !h || h === "#REF!")) {
    return {
      allowed: false,
      reason: "Sheet has broken formulas (#REF!). Fix the sheet or disable sync for it.",
    }
  }

  if (/standings|ranking|leaderboard/i.test(lower)) {
    const hasTeamCol = headers.some((h) => /team/i.test(h))
    const hasDiv = headers.some((h) => /division/i.test(h))
    if (hasTeamCol && hasDiv) return { allowed: true }
    return {
      allowed: false,
      reason:
        "Standings sheet is missing usable team/division columns. Use the Data tab for team sync.",
    }
  }

  return {
    allowed: false,
    reason: `Only the "Data" tab (or a valid standings sheet) should sync to teams. Disable sync for "${name}".`,
  }
}

/** Default division/conference when a row is missing them (NOT NULL in DB). */
export function withTeamPlaceholders<T extends { division?: string | null; conference?: string | null }>(
  team: T
): T & { division: string; conference: string } {
  return {
    ...team,
    division: (team.division && String(team.division).trim()) || "TBD",
    conference: (team.conference && String(team.conference).trim()) || "TBD",
  }
}
