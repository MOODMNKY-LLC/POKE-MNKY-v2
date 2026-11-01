export type ParsedResult = {
  teams: string[]
  winner: string | null
  loser: string | null
  scoreRaw: string | null
  score: [number, number] | null
  remaining: number | null
  timer: boolean
  forfeit: boolean
  hedge: boolean
  thirdParty: boolean
  tieReported: boolean
  confidence: "high" | "medium" | "low" | null
  queue: "SCORE_WITHOUT_TEAM" | "LOW_CONFIDENCE" | null
  week: number | null
}

export type CoachMap = Record<string, string>

const WIN_VERBS = /\b(?:defeat(?:s|ed)?|beat(?:s)?|won against|wins? against|wins? over|wins? vs|over|takes? down|edges?|sweeps?|won|win)\b/i
const LOSE_VERBS = /\b(?:lost to|loses? to|fell to|falls to)\b/i
const SCORE = /(?<![\d:])([0-6])\s*[-:–]\s*([0-6])(?![\d]|ish|\s*(?:am|pm|pst|est)\b)/i

const ALIASES: Array<[RegExp, string]> = [
  [/krazy|kacleon|kecleon/i, "Krazy Kecleons"],
  [/daycare|ditto/i, "Daycare Dittos"],
  [/kalamazoo|kangaskhan/i, "Kalamazoo Kangaskhans"],
  [/leicester|lycanroc/i, "Leicester Lycanrocs"],
  [/saint charles|st\.?\s*charles|slider/i, "Saint Charles Sliders"],
  [/alabama|dolphin|donphan/i, "Alabama Donphans"],
  [/boiste|boise|mudsdale/i, "Boise State Mudsdales"],
  [/manchester|milcer/i, "Manchester Milcerys"],
  [/twin river|tyranitar/i, "Twin River Tyranitar"],
  [/michigan|meowscarada/i, "Michigan Meowscaradas"],
]

export function weekOf(timestamp: string, seasonStart = "2026-08-24"): number {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date(timestamp))
  const diff = Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${seasonStart}T00:00:00Z`)) / 86_400_000)
  return Math.floor(diff / 7) + 1
}

function normalize(content: string, coaches: CoachMap): string {
  return content
    .replace(/<@!?([a-z0-9_]+)>/gi, (_, id: string) => coaches[id] ?? "")
    .replace(/<@&[^>]+>/g, "")
    .replace(/[’‘]/g, "'")
    .replace(/'s\b/g, "")
    .toLowerCase()
}

function findTeams(text: string): string[] {
  const hits: Array<{ index: number; team: string }> = []
  for (const [pattern, team] of ALIASES) {
    const match = pattern.exec(text)
    if (!match || match.index == null) continue
    hits.push({ index: match.index, team })
  }
  hits.sort((a, b) => a.index - b.index)
  const seen = new Set<string>()
  const teams: string[] = []
  for (const hit of hits) {
    if (seen.has(hit.team)) continue
    seen.add(hit.team)
    teams.push(hit.team)
  }
  return teams
}

export function parseResultPost(input: {
  content: string
  timestamp: string
  author: string
  coaches: CoachMap
  seasonStart?: string
}): ParsedResult {
  const empty: ParsedResult = {
    teams: [],
    winner: null,
    loser: null,
    scoreRaw: null,
    score: null,
    remaining: null,
    timer: false,
    forfeit: false,
    hedge: false,
    thirdParty: false,
    tieReported: false,
    confidence: null,
    queue: null,
    week: weekOf(input.timestamp, input.seasonStart),
  }
  const text = normalize(input.content, input.coaches)
  const score = SCORE.exec(text)
  if (!score) return empty
  const left = Number(score[1])
  const right = Number(score[2])
  const teams = findTeams(text)
  const win = WIN_VERBS.test(text)
  const lose = LOSE_VERBS.test(text)
  const hedge = /i think|maybe|not sure|pretty sure|\?\s*$/.test(text)
  const timer = /timer|timed out|time ran out/.test(text)
  const forfeit = /\bforfeit\b|\bff\b|conced|resign|disconnect|\bdc\b/.test(text)
  const tieReported = left === right
  const scoreRaw = score[0]
  const remaining = left === 6 ? Math.abs(left - right) : Math.min(left, right) === 0 ? Math.max(left, right) : Math.abs(left - right)

  if (teams.length === 0) {
    return { ...empty, scoreRaw, score: [left, right], remaining, queue: "SCORE_WITHOUT_TEAM", confidence: "low" }
  }

  let winner: string | null = null
  let loser: string | null = null
  const authorTeam = input.coaches[input.author] ?? null
  if (teams.length >= 2) {
    const subject = teams[0]!
    const other = teams[1]!
    if (lose && !win) {
      winner = other
      loser = subject
    } else {
      winner = subject
      loser = other
    }
  } else if (authorTeam && authorTeam === teams[0] && win) {
    winner = teams[0]!
  } else if (authorTeam && authorTeam !== teams[0]) {
    winner = win && !lose ? teams[0]! : lose ? authorTeam : teams[0]!
    loser = winner === teams[0] ? authorTeam : teams[0]!
  } else {
    return {
      ...empty,
      teams,
      scoreRaw,
      score: [left, right],
      remaining,
      timer,
      forfeit,
      hedge,
      queue: "LOW_CONFIDENCE",
      confidence: "low",
    }
  }

  const thirdParty = Boolean(authorTeam && authorTeam !== winner && authorTeam !== loser)
  const confidence = hedge || thirdParty || teams.length < 2 ? "medium" : "high"
  return {
    teams,
    winner,
    loser,
    scoreRaw,
    score: [left, right],
    remaining,
    timer,
    forfeit,
    hedge,
    thirdParty,
    tieReported,
    confidence,
    queue: null,
    week: empty.week,
  }
}
