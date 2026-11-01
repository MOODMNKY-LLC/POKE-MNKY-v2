/**
 * Canonical playoff round keys and display labels.
 * Playoffs use named rounds instead of regular-season week numbers in the UI.
 */

export const PLAYOFF_ROUND_KEYS = {
  ROUND_1: "round_1",
  QUARTERFINALS: "quarterfinals",
  SEMIFINALS: "semifinals",
  FINALS: "finals",
} as const

export type PlayoffRoundKey =
  (typeof PLAYOFF_ROUND_KEYS)[keyof typeof PLAYOFF_ROUND_KEYS]

export const PLAYOFF_ROUNDS_ORDER: PlayoffRoundKey[] = [
  PLAYOFF_ROUND_KEYS.ROUND_1,
  PLAYOFF_ROUND_KEYS.QUARTERFINALS,
  PLAYOFF_ROUND_KEYS.SEMIFINALS,
  PLAYOFF_ROUND_KEYS.FINALS,
]

export const PLAYOFF_ROUND_LABELS: Record<PlayoffRoundKey, string> = {
  [PLAYOFF_ROUND_KEYS.ROUND_1]: "Playoffs Round 1",
  [PLAYOFF_ROUND_KEYS.QUARTERFINALS]: "Quarter Finals",
  [PLAYOFF_ROUND_KEYS.SEMIFINALS]: "Semi Finals",
  [PLAYOFF_ROUND_KEYS.FINALS]: "Finals",
}

/** Short label for compact UI (admin tables, badges). */
export const PLAYOFF_ROUND_SHORT_LABELS: Record<PlayoffRoundKey, string> = {
  [PLAYOFF_ROUND_KEYS.ROUND_1]: "Round 1",
  [PLAYOFF_ROUND_KEYS.QUARTERFINALS]: "Quarter Finals",
  [PLAYOFF_ROUND_KEYS.SEMIFINALS]: "Semi Finals",
  [PLAYOFF_ROUND_KEYS.FINALS]: "Finals",
}

const LEGACY_NUMERIC_MAP: Record<string, PlayoffRoundKey> = {
  "1": PLAYOFF_ROUND_KEYS.ROUND_1,
  "2": PLAYOFF_ROUND_KEYS.QUARTERFINALS,
  "3": PLAYOFF_ROUND_KEYS.SEMIFINALS,
  "4": PLAYOFF_ROUND_KEYS.FINALS,
}

/** Sheet labels the Season 7 importer may store in matches.playoff_round. */
const SHEET_ROUND_LABELS: Record<string, PlayoffRoundKey> = {
  "round 1": PLAYOFF_ROUND_KEYS.ROUND_1,
  "playoffs round 1": PLAYOFF_ROUND_KEYS.ROUND_1,
  quarterfinal: PLAYOFF_ROUND_KEYS.QUARTERFINALS,
  "quarter final": PLAYOFF_ROUND_KEYS.QUARTERFINALS,
  "quarter finals": PLAYOFF_ROUND_KEYS.QUARTERFINALS,
  quarterfinals: PLAYOFF_ROUND_KEYS.QUARTERFINALS,
  semifinal: PLAYOFF_ROUND_KEYS.SEMIFINALS,
  "semi final": PLAYOFF_ROUND_KEYS.SEMIFINALS,
  "semi finals": PLAYOFF_ROUND_KEYS.SEMIFINALS,
  semifinals: PLAYOFF_ROUND_KEYS.SEMIFINALS,
  final: PLAYOFF_ROUND_KEYS.FINALS,
  finals: PLAYOFF_ROUND_KEYS.FINALS,
}

export function normalizePlayoffRound(value: string | number | null | undefined): PlayoffRoundKey | null {
  if (value == null || value === "") return null
  const raw = String(value).trim().toLowerCase()
  if (raw in PLAYOFF_ROUND_LABELS) return raw as PlayoffRoundKey
  if (raw in LEGACY_NUMERIC_MAP) return LEGACY_NUMERIC_MAP[raw]
  if (raw in SHEET_ROUND_LABELS) return SHEET_ROUND_LABELS[raw]
  return null
}

export function getPlayoffRoundLabel(value: string | number | null | undefined): string {
  const key = normalizePlayoffRound(value)
  return key ? PLAYOFF_ROUND_LABELS[key] : "Playoffs"
}

export function getNextPlayoffRound(
  current: PlayoffRoundKey,
  options: { hasRound1Byes: boolean }
): PlayoffRoundKey | null {
  if (current === PLAYOFF_ROUND_KEYS.FINALS) return null

  if (current === PLAYOFF_ROUND_KEYS.ROUND_1) {
    return options.hasRound1Byes
      ? PLAYOFF_ROUND_KEYS.QUARTERFINALS
      : PLAYOFF_ROUND_KEYS.SEMIFINALS
  }

  if (current === PLAYOFF_ROUND_KEYS.QUARTERFINALS) {
    return PLAYOFF_ROUND_KEYS.SEMIFINALS
  }

  if (current === PLAYOFF_ROUND_KEYS.SEMIFINALS) {
    return PLAYOFF_ROUND_KEYS.FINALS
  }

  return null
}

/** 1-based index into playoff matchweeks (first playoff week = 1). */
export function getPlayoffWeekIndex(round: PlayoffRoundKey): number {
  switch (round) {
    case PLAYOFF_ROUND_KEYS.ROUND_1:
      return 1
    case PLAYOFF_ROUND_KEYS.QUARTERFINALS:
      return 2
    case PLAYOFF_ROUND_KEYS.SEMIFINALS:
      return 3
    case PLAYOFF_ROUND_KEYS.FINALS:
      return 4
    default: {
      const _exhaustive: never = round
      return _exhaustive
    }
  }
}

export function roundsUsedInBracket(hasRound1Byes: boolean): PlayoffRoundKey[] {
  if (hasRound1Byes) {
    return [...PLAYOFF_ROUNDS_ORDER]
  }
  return [
    PLAYOFF_ROUND_KEYS.ROUND_1,
    PLAYOFF_ROUND_KEYS.SEMIFINALS,
    PLAYOFF_ROUND_KEYS.FINALS,
  ]
}
