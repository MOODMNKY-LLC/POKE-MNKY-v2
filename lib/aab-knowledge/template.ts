import { citationPrefix } from "./retrieve"
import { extractExcerpts } from "./excerpts"

export type DraftKind = "pending" | "points-call" | "recap" | "clarification"

export const DRAFT_KINDS: Record<DraftKind, readonly string[]> = {
  pending: ["aab_get_pending_decisions"],
  "points-call": ["aab_get_commissioner_meetings", "aab_get_pending_decisions"],
  recap: ["aab_get_announcements", "aab_get_season_history"],
  clarification: ["aab_get_league_rules", "aab_get_draft_rules"],
}

const TITLES: Record<DraftKind, string> = {
  pending: "Pending decisions",
  "points-call": "Points-call agenda",
  recap: "Weekly recap",
  clarification: "Rule clarification",
}

const SECTIONS = ["Confirmed rules", "Historical", "Pending decisions"] as const
type Section = (typeof SECTIONS)[number]

const TOOL_SECTION: Record<string, Section> = {
  aab_get_league_rules: "Confirmed rules",
  aab_get_draft_rules: "Confirmed rules",
  aab_get_season_history: "Historical",
  aab_get_announcements: "Historical",
  aab_get_pending_decisions: "Pending decisions",
  aab_get_commissioner_meetings: "Pending decisions",
}

const BLANK = "[Official text not loaded. Commissioner to fill in: ____]"

export function buildDraftTemplate(
  kind: DraftKind,
  tools: readonly string[],
  packets: Array<Record<string, unknown>>,
  focus = "",
): string {
  const bySection: Record<Section, string[]> = {
    "Confirmed rules": [],
    Historical: [],
    "Pending decisions": [],
  }
  tools.forEach((tool, index) => {
    const packet = packets[index] || {}
    const section = TOOL_SECTION[tool] || "Confirmed rules"
    const lines: string[] = []
    const citations = citationPrefix(packet).trim()
    if (citations) lines.push(citations)
    const excerpts = extractExcerpts(focus, packet)
    if (excerpts.length) {
      for (const excerpt of excerpts) lines.push(`- ${excerpt.text}`)
    } else {
      lines.push(BLANK)
    }
    bySection[section].push(lines.join("\n"))
  })
  const body = SECTIONS.map((section) => {
    const parts = bySection[section]
    return `## ${section}\n${parts.length ? parts.join("\n\n") : BLANK}`
  })
  return [
    `# ${TITLES[kind]} (draft, not published)`,
    focus ? `Focus: ${focus}` : "",
    ...body,
    "## Commissioner notes\n____",
  ].filter(Boolean).join("\n\n")
}
