/**
 * League-first homepage content model (AAB hand-off).
 * Copy and IA live here so page layout stays thin.
 */

export const homepageLeague = {
  shortName: "AAB",
  fullName: "Average At Best Battle League",
  tagline:
    "Discord-first Pokémon draft league with public standings, a live draft room, weekly match prep, and coach tools backed by Supabase.",
  heroAccent: "League hub",
} as const

export const homepageHero = {
  eyebrow: "Public league hub",
  title: "The league runs here: standings, draft room, weekly prep, and coach tools.",
  description:
    "Use the homepage to check standings, teams, weekly stats, insights, and the draft room. Discord sign-in opens the coach path without turning the public site into a generic splash page.",
  primaryCta: {
    label: "View standings",
    href: "/standings",
  },
  secondaryCta: {
    label: "Open draft room",
    href: "/draft/room",
  },
  tertiaryCta: {
    label: "Team builder",
    href: "/teams/builder",
  },
  supportCta: {
    label: "Sign in with Discord",
    href: "/auth/login",
  },
  chips: ["Public standings", "Weekly match prep", "Discord onboarding"] as const,
  operations: [
    {
      title: "Standings",
      description: "The public front door for the season table, race order, and differential.",
    },
    {
      title: "Teams",
      description: "Roster pages, coach context, and season history across the league.",
    },
    {
      title: "Draft room",
      description: "Point-budget drafting, board control, and roster planning.",
    },
    {
      title: "Insights",
      description: "Weekly summaries, matchup context, and season trends.",
    },
  ] as const,
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
    description: "Current order, record, and differential across the league.",
    href: "/standings",
    cta: "Open standings",
  },
  {
    id: "teams",
    title: "Teams",
    description: "Rosters, coaches, and team pages grouped by league view.",
    href: "/teams",
    cta: "Browse teams",
  },
  {
    id: "draft-room",
    title: "Draft Room",
    description: "Point-budget drafting and the live board for roster moves.",
    href: "/draft/room",
    cta: "Open draft room",
  },
  {
    id: "weekly-stats",
    title: "Weekly Stats",
    description: "Latest battle-week totals, results, and matchup notes.",
    href: "/matches",
    cta: "Review week",
  },
  {
    id: "insights",
    title: "Insights",
    description: "Season trends, matchup context, and stat recaps.",
    href: "/insights",
    cta: "Open insights",
  },
  {
    id: "coach-tools",
    title: "Coach Tools",
    description: "Discord sign-in, staff review, and private coach workflows.",
    href: "/apply/coach",
    cta: "Apply to coach",
  },
]
