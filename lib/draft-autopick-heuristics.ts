/**
 * Structured scoring for AI / autopick (AAB Phase D).
 * Extend with hazards, removal, cores — MVP ranks by point value and type coverage.
 */

export type AutopickCandidate = {
  pokemon_name: string
  point_value?: number
  type1?: string | null
  type2?: string | null
}

export type AutopickConfig = {
  /** Prefer lower point cost early rounds */
  budgetPressure?: number
  /** Weight duplicate types lower */
  diversityWeight?: number
}

export function scoreCandidatesForAutopick(
  candidates: AutopickCandidate[],
  pickedTypes: Set<string>,
  config: AutopickConfig = {}
): AutopickCandidate | null {
  if (!candidates.length) return null
  const budgetPressure = config.budgetPressure ?? 0.35
  const diversityWeight = config.diversityWeight ?? 0.4

  let best: AutopickCandidate | null = null
  let bestScore = -Infinity

  for (const c of candidates) {
    const pv = c.point_value ?? 10
    const budgetScore = (30 - Math.min(pv, 30)) / 30
    const types = [c.type1, c.type2].filter(Boolean) as string[]
    const overlap = types.filter((t) => pickedTypes.has(t)).length
    const diversityScore = types.length ? (types.length - overlap) / types.length : 0.5
    const score = budgetPressure * budgetScore + diversityWeight * diversityScore
    if (score > bestScore) {
      bestScore = score
      best = c
    }
  }

  return best
}
