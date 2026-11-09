export const PRACTICE_STAGES = [
  {
    id: "start",
    title: "Start",
    detail: "Start a practice season, or open one you already saved.",
  },
  {
    id: "draft",
    title: "Draft",
    detail: "Prepare picks, then simulate them. Rosters show on the Draft tab.",
  },
  {
    id: "season",
    title: "Regular season",
    detail: "After the draft, continue, then simulate the schedule. Scores show on the Season tab.",
  },
  {
    id: "playoffs",
    title: "Playoffs",
    detail: "Simulate the playoff matches. The bracket shows on the Playoffs tab.",
  },
  {
    id: "champion",
    title: "Champion",
    detail: "Read the winner on the Playoffs tab. The real league is unchanged.",
  },
] as const

export type PracticeStageId = (typeof PRACTICE_STAGES)[number]["id"]

export function currentStageId(input: {
  hasRun: boolean
  phase: string
  status: string
  draftComplete: boolean
}): PracticeStageId {
  if (!input.hasRun) return "start"
  if (input.status === "completed" || input.phase === "complete") return "champion"
  if (input.phase === "playoffs") return "playoffs"
  if (input.draftComplete || input.phase === "regular") return "season"
  return "draft"
}
