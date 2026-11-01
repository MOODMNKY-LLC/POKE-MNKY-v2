/**
 * A match counts in the standings only when it is completed.
 * Scheduled rows, including playoff games stored as 0-0 with no winner, are unplayed.
 */
export function isMatchPlayed(match: { status?: string | null }): boolean {
  return match.status === "completed"
}

/** W, L, or upcoming. A completed match with no winner is a loss for both, matching the standings view. */
export function teamMatchMark(
  match: { status?: string | null; winner_id?: string | null },
  teamId: string,
): "W" | "L" | "upcoming" {
  if (!isMatchPlayed(match)) return "upcoming"
  if (match.winner_id && match.winner_id === teamId) return "W"
  return "L"
}
