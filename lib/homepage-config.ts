/**
 * League-first homepage content model (AAB hand-off).
 * Copy and IA live here so page layout stays thin.
 */

export const homepageLeague = {
  shortName: "AAB",
  fullName: "Average At Best Battle League",
  tagline:
    "A 20-team Pokémon draft league: point-budget drafting, weekly Showdown battles, and a coach-first Draft Room — with Discord in the loop.",
  heroAccent: "Battle League",
} as const

export type HomepageLeagueBlock = {
  id: string
  title: string
  description: string
  href: string
  cta: string
}

export const homepageLeagueBlocks: HomepageLeagueBlock[] = [
  {
    id: "standings",
    title: "Standings",
    description: "Conference and division order, wins, and differential.",
    href: "/standings",
    cta: "View standings",
  },
  {
    id: "teams",
    title: "Teams",
    description: "Rosters, coaches, and team pages across the league.",
    href: "/teams",
    cta: "Browse teams",
  },
  {
    id: "schedule",
    title: "Schedule",
    description: "Regular season and playoff weeks — who plays when.",
    href: "/schedule",
    cta: "See schedule",
  },
  {
    id: "matchups",
    title: "This week",
    description: "Current week matchups and results as they post.",
    href: "/matches",
    cta: "Match center",
  },
]
