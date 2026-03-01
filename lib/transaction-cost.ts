/**
 * CHATGPT-V3 League Engine: Transaction cost logic.
 * Cost = adds + tera type additions; drops = 0. Both teams pay 1 for trade.
 * Grace period (5 days post-draft): cost = 0.
 * Cap: 10 per team per season.
 */

const TRANSACTION_CAP = 10
const DRAFT_BUDGET = 120
const TERA_BUDGET = 15

export interface TransactionCostInput {
  /** Number of Pokemon being added (FA or trade side). */
  pokemonAdded: number
  /** Number of new Tera types being assigned (0–3). */
  teraTypesAdded: number
  /** Scenario A: drop Tera + add new + assign Tera in same transaction = 1 total. */
  scenarioAReplaceTera?: boolean
  /** Scenario B (future): standalone Tera swap = 4. */
  scenarioBStandaloneTeraSwap?: boolean
  /** Within 5 days post-draft: no cost. */
  withinGracePeriod?: boolean
  /** For trade: both sides charged 1 (call once per side). */
  isTradeSide?: boolean
}

/**
 * Compute transaction cost for one submission.
 * Drops cost 0. Adds cost 1 each. Tera types cost 1 each (max 3). Scenario A override = 1. Scenario B = 4. Grace = 0.
 */
export function computeTransactionCost(input: TransactionCostInput): number {
  if (input.withinGracePeriod) return 0
  if (input.scenarioBStandaloneTeraSwap) return 4
  if (input.scenarioAReplaceTera) return 1
  if (input.isTradeSide) return input.pokemonAdded > 0 ? 1 : 0
  let cost = input.pokemonAdded + Math.min(3, input.teraTypesAdded)
  return Math.max(0, cost)
}

/**
 * Check if the team has enough remaining transactions for this cost.
 */
export function hasEnoughTransactions(transactionsUsed: number, cost: number): boolean {
  const remaining = TRANSACTION_CAP - transactionsUsed
  return remaining >= cost
}

export function getTransactionCap(): number {
  return TRANSACTION_CAP
}

export function getDraftBudget(): number {
  return DRAFT_BUDGET
}

export function getTeraBudget(): number {
  return TERA_BUDGET
}

/**
 * Whether we are in grace period (5 business days after draft end).
 * Caller should pass draft_end_date and current date.
 */
export function isWithinGracePeriod(draftEndDate: Date, now: Date = new Date()): boolean {
  const end = new Date(draftEndDate)
  end.setHours(0, 0, 0, 0)
  const current = new Date(now)
  current.setHours(0, 0, 0, 0)
  const diffMs = current.getTime() - end.getTime()
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000))
  return diffDays >= 0 && diffDays < 5
}
