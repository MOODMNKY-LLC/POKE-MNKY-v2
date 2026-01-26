/**
 * Phase 5.5: Roster Coverage Analysis
 * Analyzes team roster for role coverage gaps
 */

export type CoverageCheck =
  | "hazard_removal"
  | "hazard_setting"
  | "cleric"
  | "speed_control"
  | "recovery"
  | "phasing"
  | "screens"

export interface CoverageResult {
  check: CoverageCheck
  covered: boolean
  pokemon: Array<{
    id: string
    name: string
    roles: string[]
  }>
  missing: boolean
}

export interface CoverageAnalysis {
  team_id: string
  season_id: string
  checks: CoverageResult[]
  overall_coverage: number // percentage
  gaps: CoverageCheck[]
}

/**
 * Map coverage checks to role tag categories/patterns
 */
export function getRolePatternsForCheck(check: CoverageCheck): string[] {
  switch (check) {
    case "hazard_removal":
      return ["Hazard Remover:"]
    case "hazard_setting":
      return ["Hazard Setter:"]
    case "cleric":
      return ["Cleric:"]
    case "recovery":
      return ["Recovery:"]
    case "phasing":
      return ["Phasing:"]
    case "screens":
      return ["Screens:"]
    case "speed_control":
      // Speed control is derived from priority moves or speed tiers
      // For now, check for Priority role tags
      return ["Priority:"]
    default:
      return []
  }
}

/**
 * Analyze roster coverage for specified checks
 */
export function analyzeRosterCoverage(
  roster: Array<{
    pokemon_id: string
    pokemon_name: string
    roles?: string[]
  }>,
  checks: CoverageCheck[]
): CoverageAnalysis {
  const results: CoverageResult[] = []

  for (const check of checks) {
    const patterns = getRolePatternsForCheck(check)
    const coveringPokemon = roster.filter((pick) => {
      if (!pick.roles || pick.roles.length === 0) {
        return false
      }

      // Check if any role matches the pattern
      return pick.roles.some((role) =>
        patterns.some((pattern) => role.startsWith(pattern))
      )
    })

    results.push({
      check,
      covered: coveringPokemon.length > 0,
      pokemon: coveringPokemon.map((p) => ({
        id: p.pokemon_id,
        name: p.pokemon_name,
        roles: p.roles || [],
      })),
      missing: coveringPokemon.length === 0,
    })
  }

  const coveredCount = results.filter((r) => r.covered).length
  const overallCoverage = checks.length > 0 ? (coveredCount / checks.length) * 100 : 0
  const gaps = results.filter((r) => r.missing).map((r) => r.check)

  return {
    team_id: "", // Will be set by caller
    season_id: "", // Will be set by caller
    checks: results,
    overall_coverage: overallCoverage,
    gaps,
  }
}

/**
 * Format coverage analysis for Discord message
 */
export function formatCoverageForDiscord(
  analysis: CoverageAnalysis,
  teamName: string
): string {
  const lines: string[] = []
  lines.push(`**Roster Coverage Analysis: ${teamName}**`)
  lines.push("")

  for (const result of analysis.checks) {
    const status = result.covered ? "✅" : "❌"
    const checkName = result.check.replace(/_/g, " ").replace(/\b\w/g, (l) =>
      l.toUpperCase()
    )

    if (result.covered) {
      const pokemonNames = result.pokemon.map((p) => p.name).join(", ")
      lines.push(`${status} **${checkName}**: ${pokemonNames}`)
    } else {
      lines.push(`${status} **${checkName}**: Missing`)
    }
  }

  lines.push("")
  lines.push(
    `**Overall Coverage**: ${analysis.overall_coverage.toFixed(0)}% (${
      analysis.checks.filter((r) => r.covered).length
    }/${analysis.checks.length})`
  )

  if (analysis.gaps.length > 0) {
    lines.push("")
    lines.push(`**Gaps**: ${analysis.gaps.join(", ")}`)
  }

  return lines.join("\n")
}
