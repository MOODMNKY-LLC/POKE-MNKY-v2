import {
  BookOpen,
  Brain,
  Calculator,
  Calendar,
  ClipboardList,
  FileText,
  History,
  Library,
  PlayCircle,
  Shield,
  Sparkles,
  Swords,
  Target,
  Trophy,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react"

/**
 * Single source of truth for the public site header (desktop menus + mobile sheet).
 * Keep desktop and mobile in sync by rendering only from this config.
 */

export type PublicNavExternal = {
  id: string
  title: string
  href: string
  external: true
  icon: LucideIcon
  keywords?: string[]
}

export type PublicNavInternal = {
  id: string
  title: string
  href: string
  external?: false
  icon: LucideIcon
  keywords?: string[]
}

export type PublicNavItem = PublicNavInternal | PublicNavExternal

export type PublicNavGroup = {
  id: string
  label: string
  menuLabel: string
  icon: LucideIcon
  items: PublicNavItem[]
}

export const EXTERNAL_DOCS_HREF = "https://docs.poke-mnky.moodmnky.com"

export const PUBLIC_NAV_GROUPS: PublicNavGroup[] = [
  {
    id: "league",
    label: "League",
    menuLabel: "League Information",
    icon: Trophy,
    items: [
      { id: "standings", title: "Standings", href: "/standings", icon: Trophy, keywords: ["rankings", "record"] },
      { id: "teams", title: "Teams", href: "/teams", icon: Users, keywords: ["roster", "coaches"] },
      { id: "schedule", title: "Schedule", href: "/schedule", icon: Calendar, keywords: ["fixtures", "weeks"] },
      { id: "matches", title: "Matches", href: "/matches", icon: Swords, keywords: ["match center", "results"] },
      { id: "playoffs", title: "Playoffs", href: "/playoffs", icon: Trophy, keywords: ["bracket", "postseason"] },
      { id: "mvp", title: "MVP", href: "/mvp", icon: Sparkles, keywords: ["awards", "player"] },
    ],
  },
  {
    id: "draft",
    label: "Draft",
    menuLabel: "Draft & Selection",
    icon: ClipboardList,
    items: [
      { id: "draft-hub", title: "Draft Hub", href: "/draft", icon: ClipboardList, keywords: ["draft"] },
      { id: "draft-board", title: "Draft Board", href: "/draft/board", icon: Target, keywords: ["pool", "picks"] },
    ],
  },
  {
    id: "battle",
    label: "Battle",
    menuLabel: "Battle & Teams",
    icon: Swords,
    items: [
      { id: "showdown-hub", title: "Showdown Hub", href: "/showdown", icon: Swords },
      { id: "match-lobby", title: "Match Lobby", href: "/showdown/match-lobby", icon: Users },
      { id: "team-library", title: "Team Library", href: "/showdown/team-library", icon: Library },
      { id: "team-validator", title: "Team Validator", href: "/showdown/team-validator", icon: Shield },
      { id: "replay-library", title: "Replay Library", href: "/showdown/replay-library", icon: History },
      { id: "team-builder", title: "Team Builder", href: "/teams/builder", icon: Brain },
      { id: "damage-calc", title: "Damage calc", href: "/calc", icon: Calculator, keywords: ["calc", "damage"] },
    ],
  },
  {
    id: "reference",
    label: "Reference",
    menuLabel: "Reference & Learning",
    icon: BookOpen,
    items: [
      { id: "pokedex", title: "Pokédex", href: "/pokedex", icon: BookOpen },
      { id: "insights", title: "Insights", href: "/insights", icon: Sparkles },
      { id: "videos", title: "Videos", href: "/videos", icon: PlayCircle },
      { id: "api-docs", title: "API docs", href: "/docs/api", icon: FileText },
      {
        id: "external-docs",
        title: "App Documentation",
        href: EXTERNAL_DOCS_HREF,
        external: true,
        icon: BookOpen,
      },
    ],
  },
  {
    id: "join",
    label: "Join",
    menuLabel: "Join the league",
    icon: UserPlus,
    items: [
      {
        id: "apply-coach",
        title: "Apply to coach",
        href: "/apply/coach",
        icon: UserPlus,
        keywords: ["apply", "coach", "join"],
      },
    ],
  },
]

export type PublicFooterLink =
  | { title: string; href: string; external?: false }
  | { title: string; href: string; external: true }
  | { title: string; plain: true }

export type PublicFooterGroup = {
  id: string
  label: string
  items: PublicFooterLink[]
}

/** Shared public footer columns (League, Tools, Platform, Connect, Legal). */
export const PUBLIC_FOOTER_GROUPS: PublicFooterGroup[] = [
  {
    id: "league",
    label: "League",
    items: [
      { title: "Standings", href: "/standings" },
      { title: "Schedule", href: "/schedule" },
      { title: "Playoffs", href: "/playoffs" },
      { title: "MVP", href: "/mvp" },
      { title: "Teams", href: "/teams" },
      { title: "Match Center", href: "/matches" },
    ],
  },
  {
    id: "tools",
    label: "Tools",
    items: [
      { title: "Draft Room", href: "/draft/room" },
      { title: "Draft Board", href: "/draft/board" },
      { title: "Team Builder", href: "/teams/builder" },
      { title: "Damage calc", href: "/calc" },
      { title: "Insights", href: "/insights" },
      { title: "Apply to coach", href: "/apply/coach" },
    ],
  },
  {
    id: "platform",
    label: "Platform",
    items: [
      { title: "Dashboard", href: "/dashboard" },
      { title: "Pokédex", href: "/pokedex" },
      { title: "API Docs", href: "/docs/api" },
      { title: "Videos", href: "/videos" },
    ],
  },
  {
    id: "connect",
    label: "Connect",
    items: [
      { title: "Sign in", href: "/auth/login" },
      { title: "Discord server", plain: true },
      {
        title: "GitHub",
        href: "https://github.com/MOODMNKY-LLC/POKE-MNKY-v2",
        external: true,
      },
      { title: "League rules", plain: true },
    ],
  },
  {
    id: "legal",
    label: "Legal",
    items: [
      { title: "Privacy Policy", href: "/privacy-policy" },
      { title: "Terms of Service", href: "/terms-of-service" },
    ],
  },
]

export function getPublicNavItems(): PublicNavItem[] {
  return PUBLIC_NAV_GROUPS.flatMap((group) => group.items)
}

export function getPublicInternalHrefs(): string[] {
  return getPublicNavItems()
    .filter((item): item is PublicNavInternal => !item.external)
    .map((item) => item.href)
}

export function getPublicFooterHrefs(): string[] {
  const hrefs: string[] = []
  for (const group of PUBLIC_FOOTER_GROUPS) {
    for (const item of group.items) {
      if ("plain" in item && item.plain) continue
      if ("href" in item) hrefs.push(item.href)
    }
  }
  return hrefs
}

export type PublicPaletteEntry = {
  id: string
  title: string
  href: string
  groupLabel: string
  icon: LucideIcon
  keywords: string[]
  external?: boolean
}

export function getPublicPaletteEntries(): PublicPaletteEntry[] {
  return PUBLIC_NAV_GROUPS.flatMap((group) =>
    group.items.map((item) => ({
      id: item.id,
      title: item.title,
      href: item.href,
      groupLabel: group.label,
      icon: item.icon,
      keywords: [...(item.keywords ?? []), group.label],
      external: Boolean(item.external),
    })),
  )
}
