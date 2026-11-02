/**
 * Pure helpers for live draft turn order, budget checks, and timer expiry.
 * Used by DraftSystem and unit tests — no I/O.
 */

export type DraftType = "snake" | "linear" | "auction"

export function effectiveTurnOrder(
  turnOrder: string[],
  round: number,
  draftType: DraftType,
): string[] {
  const isSnakeRound = draftType === "snake" && round % 2 === 0
  return isSnakeRound ? [...turnOrder].reverse() : [...turnOrder]
}

export function teamIdForPick(params: {
  turnOrder: string[]
  pickNumber: number
  draftType: DraftType
}): { teamId: string; round: number; isSnakeRound: boolean } | null {
  const { turnOrder, pickNumber, draftType } = params
  if (!turnOrder.length || pickNumber < 1) return null
  const round = Math.floor((pickNumber - 1) / turnOrder.length) + 1
  const isSnakeRound = draftType === "snake" && round % 2 === 0
  const order = effectiveTurnOrder(turnOrder, round, draftType)
  const index = (pickNumber - 1) % turnOrder.length
  const teamId = order[index]
  if (!teamId) return null
  return { teamId, round, isSnakeRound }
}

export function canAffordPick(remainingPoints: number, pointValue: number): boolean {
  return remainingPoints >= pointValue
}

export function isDuplicatePick(
  alreadyPickedNames: Iterable<string>,
  pokemonName: string,
): boolean {
  const target = pokemonName.trim().toLowerCase()
  for (const name of alreadyPickedNames) {
    if (name.trim().toLowerCase() === target) return true
  }
  return false
}

export type TimerExpiryAction = "none" | "auto_pick" | "skip"

export function timerExpiryAction(params: {
  nowMs: number
  deadlineMs: number | null
  autoDraftEnabled: boolean
}): TimerExpiryAction {
  const { nowMs, deadlineMs, autoDraftEnabled } = params
  if (deadlineMs == null || nowMs < deadlineMs) return "none"
  return autoDraftEnabled ? "auto_pick" : "skip"
}

export function nextDeadlineMs(
  nowMs: number,
  pickTimeLimitSeconds: number,
): number {
  return nowMs + Math.max(pickTimeLimitSeconds, 1) * 1000
}
