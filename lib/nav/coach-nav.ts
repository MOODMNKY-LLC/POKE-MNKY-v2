import {
  ArrowLeftRight,
  BookOpen,
  Bell,
  Calculator,
  CalendarDays,
  CircleUser,
  ClipboardList,
  Hammer,
  History,
  LayoutDashboard,
  LayoutGrid,
  Library,
  ListChecks,
  MessageCircle,
  Rocket,
  Shield,
  Swords,
  Trophy,
  Upload,
  UserPlus,
  UserRound,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react"

/**
 * Single source of truth for coach dashboard (/dashboard/*) navigation.
 * Consumed by the sidebar, the mobile tab bar, the header breadcrumbs and the command palette.
 */

export type DraftPhase = "active" | "upcoming" | "none" | "unknown"

export interface NavFlags {
  /** Free agency and trade block links. Off while the league sheet is the source of truth. */
  freeAgencyAndTrades: boolean
}

export interface CoachNavContext {
  isCoach: boolean
  onboardingComplete: boolean
  draftPhase: DraftPhase
  flags: NavFlags
}

export const DEFAULT_NAV_CONTEXT: CoachNavContext = {
  isCoach: false,
  onboardingComplete: true,
  draftPhase: "unknown",
  flags: { freeAgencyAndTrades: false },
}

export interface NavAlias {
  title: string
  href: string
  exact?: boolean
}

export interface NavChild {
  id: string
  title: string
  href: string
}

export interface CoachNavItem {
  id: string
  title: string
  href: string
  icon: LucideIcon
  /** Match only the exact path instead of the path and everything below it. */
  exact?: boolean
  /** Same destination as another item; let that item own the active state. */
  skipActive?: boolean
  /** Routes owned by this item that are not listed in the sidebar (still searchable and breadcrumbed). */
  aliases?: NavAlias[]
  children?: NavChild[]
  /** Run an in-app action instead of navigating. */
  action?: "open-profile-sheet"
  /** Rendered as a disabled item with a tooltip. Never navigates. */
  disabled?: { reason: string }
  keywords?: string[]
  isVisible?: (ctx: CoachNavContext) => boolean
}

export interface CoachNavGroup {
  id: string
  label: string
  icon: LucideIcon
  items: CoachNavItem[]
  isVisible?: (ctx: CoachNavContext) => boolean
  /** Whether the group starts expanded when it does not contain the current page. */
  defaultOpen?: (ctx: CoachNavContext) => boolean
  /** Keep the group's routes searchable in the command palette even when the group is hidden. */
  alwaysInPalette?: boolean
  /** Presence adds this group to the mobile bottom tab bar. */
  tab?: { label: string; href: string }
}

export const RESULT_SUBMIT_DISABLED_REASON =
  "Result submission is locked while the league sheet is the source of truth."

export const COACH_NAV_GROUPS: CoachNavGroup[] = [
  {
    id: "home",
    label: "Home",
    icon: LayoutDashboard,
    tab: { label: "Home", href: "/dashboard" },
    items: [
      {
        id: "overview",
        title: "Overview",
        href: "/dashboard",
        icon: LayoutDashboard,
        exact: true,
        keywords: ["dashboard", "home"],
        aliases: [
          { title: "My Stats", href: "/dashboard/stats" },
          { title: "Activity", href: "/dashboard/activity" },
        ],
      },
      {
        id: "onboarding",
        title: "Onboarding",
        href: "/dashboard/onboarding",
        icon: Rocket,
        keywords: ["setup", "get started"],
        isVisible: (ctx) => !ctx.onboardingComplete,
      },
    ],
  },
  {
    id: "my-team",
    label: "My team",
    icon: Trophy,
    tab: { label: "My team", href: "/dashboard/league-team" },
    isVisible: (ctx) => ctx.isCoach,
    items: [
      {
        id: "league-team",
        title: "View team",
        href: "/dashboard/league-team",
        icon: Shield,
        keywords: ["league team", "coach", "team"],
      },
      {
        id: "roster",
        title: "Roster",
        href: "/dashboard/league-team/roster",
        icon: Users,
        keywords: ["pokemon", "league roster"],
      },
      {
        id: "schedule",
        title: "Schedule",
        href: "/dashboard/weekly-matches",
        icon: CalendarDays,
        keywords: ["matches", "fixtures", "weekly"],
        exact: true,
        skipActive: true,
      },
      {
        id: "free-agency",
        title: "Free agency",
        href: "/dashboard/free-agency",
        icon: UserPlus,
        keywords: ["add", "drop"],
        isVisible: (ctx) => ctx.flags.freeAgencyAndTrades,
      },
      {
        id: "trade-block",
        title: "Trade block",
        href: "/dashboard/trade-block",
        icon: ArrowLeftRight,
        keywords: ["trade", "offers"],
        isVisible: (ctx) => ctx.flags.freeAgencyAndTrades,
      },
    ],
  },
  {
    id: "this-week",
    label: "This week",
    icon: Swords,
    tab: { label: "This week", href: "/dashboard/weekly-matches" },
    items: [
      {
        id: "match-prep",
        title: "Match prep",
        href: "/dashboard/weekly-matches#battle-plan",
        icon: ListChecks,
        exact: true,
        keywords: ["battle plan", "weekly matches", "opponent"],
      },
      {
        id: "match-history",
        title: "Match history",
        href: "/dashboard/weekly-matches/history",
        icon: History,
        keywords: ["results", "past matches"],
      },
      {
        id: "submit-result",
        title: "Submit result",
        href: "/dashboard/weekly-matches/submit",
        icon: Upload,
        disabled: { reason: RESULT_SUBMIT_DISABLED_REASON },
      },
    ],
  },
  {
    id: "showdown",
    label: "Showdown toolbox",
    icon: Wrench,
    tab: { label: "Showdown", href: "/dashboard/teams" },
    items: [
      {
        id: "showdown-teams",
        title: "My Showdown teams",
        href: "/dashboard/teams",
        icon: Users,
        keywords: ["teams", "saved teams", "showdown"],
      },
      {
        id: "showdown-library",
        title: "Library",
        href: "/dashboard/teams/library",
        icon: Library,
        keywords: ["stock teams", "browse"],
      },
      {
        id: "showdown-builder",
        title: "Builder",
        href: "/dashboard/teams/builder",
        icon: Hammer,
        keywords: ["team builder", "create team", "new team"],
        aliases: [{ title: "Create team", href: "/dashboard/teams/create" }],
      },
      {
        id: "showdown-upload",
        title: "Upload",
        href: "/dashboard/teams/upload",
        icon: Upload,
        keywords: ["import", "paste", "export"],
      },
      {
        id: "calc",
        title: "Damage calculator",
        href: "/dashboard/calc",
        icon: Calculator,
        keywords: ["calc", "damage", "ev", "iv"],
      },
    ],
  },
  {
    id: "draft",
    label: "Draft",
    icon: ClipboardList,
    alwaysInPalette: true,
    isVisible: (ctx) => ctx.draftPhase !== "none",
    defaultOpen: (ctx) => ctx.draftPhase === "active" || ctx.draftPhase === "upcoming",
    items: [
      {
        id: "draft-planning",
        title: "Planning",
        href: "/dashboard/draft",
        icon: ClipboardList,
        keywords: ["draft planning", "queue"],
      },
      {
        id: "draft-board",
        title: "Board",
        href: "/dashboard/draft/board",
        icon: LayoutGrid,
        keywords: ["draft board", "picks"],
      },
      {
        id: "draft-roster",
        title: "My roster",
        href: "/dashboard/draft/roster",
        icon: UserRound,
        keywords: ["draft roster", "drafted"],
      },
    ],
  },
  {
    id: "account",
    label: "Account",
    icon: CircleUser,
    items: [
      {
        id: "profile",
        title: "Profile",
        href: "/dashboard/profile",
        icon: CircleUser,
        action: "open-profile-sheet",
        keywords: ["account", "avatar", "showdown username"],
        aliases: [{ title: "Settings", href: "/dashboard/settings", exact: true }],
      },
      {
        id: "discord",
        title: "Discord link",
        href: "/dashboard/guides/discord-integration",
        icon: MessageCircle,
        keywords: ["discord", "bot", "server"],
      },
      {
        id: "notifications",
        title: "Notifications",
        href: "/dashboard/settings?tab=notifications",
        icon: Bell,
        keywords: ["alerts", "reminders"],
      },
      {
        id: "guides",
        title: "Guides",
        href: "/dashboard/guides",
        icon: BookOpen,
        keywords: ["help", "docs", "how to"],
        children: [
          { id: "guide-overview", title: "Coach and team builder", href: "/dashboard/settings?tab=guides" },
          { id: "guide-features", title: "League features (v3)", href: "/dashboard/guides/league-features-v3" },
          { id: "guide-draft-session", title: "Create a draft session", href: "/dashboard/guides/create-draft-session" },
          { id: "guide-discord", title: "Discord integration", href: "/dashboard/guides/discord-integration" },
          { id: "guide-slash", title: "Discord slash commands", href: "/dashboard/guides/discord-slash-commands" },
          { id: "guide-simulation", title: "League simulation", href: "/dashboard/guides/league-simulation" },
        ],
      },
    ],
  },
]

/** Public league site links that used to live in the bottom dock. Surfaced in the command palette and user menu. */
export const LEAGUE_SITE_LINKS: { title: string; href: string }[] = [
  { title: "League home", href: "/" },
  { title: "Standings", href: "/standings" },
  { title: "League schedule", href: "/schedule" },
  { title: "Public teams", href: "/teams" },
  { title: "Public draft", href: "/draft" },
  { title: "Showdown", href: "/showdown" },
  { title: "Pokédex", href: "/pokedex" },
  { title: "Insights", href: "/insights" },
]

export function getNavFlags(env: Record<string, string | undefined> = process.env): NavFlags {
  return {
    freeAgencyAndTrades: env.NEXT_PUBLIC_COACH_NAV_FREE_AGENCY_TRADES === "true",
  }
}

export function isItemVisible(item: CoachNavItem, ctx: CoachNavContext): boolean {
  return item.isVisible ? item.isVisible(ctx) : true
}

export function isGroupVisible(group: CoachNavGroup, ctx: CoachNavContext): boolean {
  if (group.isVisible && !group.isVisible(ctx)) return false
  return group.items.some((item) => isItemVisible(item, ctx))
}

export function getVisibleGroups(ctx: CoachNavContext): CoachNavGroup[] {
  return COACH_NAV_GROUPS.filter((group) => isGroupVisible(group, ctx)).map((group) => ({
    ...group,
    items: group.items.filter((item) => isItemVisible(item, ctx)),
  }))
}

export interface NavEntry {
  id: string
  title: string
  href: string
  path: string
  tab?: string
  exact: boolean
  groupId: string
  groupLabel: string
  itemId: string
  itemTitle: string
  itemHref: string
  kind: "item" | "child" | "alias"
  icon: LucideIcon
  keywords: string[]
  disabled: boolean
  skipActive: boolean
  action?: CoachNavItem["action"]
}

function parseHref(href: string): { path: string; tab?: string } {
  const [withoutHash] = href.split("#")
  const [path, query] = withoutHash.split("?")
  const tab = query ? new URLSearchParams(query).get("tab") ?? undefined : undefined
  return { path, tab }
}

/** Every routable entry (items, children, aliases) regardless of visibility. Used for active state, breadcrumbs and search. */
export function buildNavEntries(groups: CoachNavGroup[] = COACH_NAV_GROUPS): NavEntry[] {
  const entries: NavEntry[] = []
  for (const group of groups) {
    for (const item of group.items) {
      const base = {
        groupId: group.id,
        groupLabel: group.label,
        itemId: item.id,
        itemTitle: item.title,
        itemHref: item.href,
        icon: item.icon,
        keywords: item.keywords ?? [],
        disabled: Boolean(item.disabled),
        skipActive: Boolean(item.skipActive),
      }
      entries.push({
        ...base,
        id: item.id,
        title: item.title,
        href: item.href,
        ...parseHref(item.href),
        exact: Boolean(item.exact),
        kind: "item",
        action: item.action,
      })
      for (const child of item.children ?? []) {
        entries.push({
          ...base,
          id: child.id,
          title: child.title,
          href: child.href,
          ...parseHref(child.href),
          exact: false,
          kind: "child",
        })
      }
      for (const alias of item.aliases ?? []) {
        entries.push({
          ...base,
          id: `${item.id}:${alias.href}`,
          title: alias.title,
          href: alias.href,
          ...parseHref(alias.href),
          exact: Boolean(alias.exact),
          kind: "alias",
        })
      }
    }
  }
  return entries
}

function normalizePath(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname
}

function matches(entry: NavEntry, pathname: string, tab: string | null | undefined): boolean {
  const current = normalizePath(pathname)
  const pathMatches = entry.exact
    ? current === entry.path
    : current === entry.path || current.startsWith(`${entry.path}/`)
  if (!pathMatches) return false
  if (entry.tab) return tab === entry.tab
  return true
}

/**
 * Resolve the single most specific entry for the current location.
 * Longest path wins; an entry pinned to a `?tab=` beats one that is not.
 */
export function resolveActiveEntry(
  pathname: string,
  tab?: string | null,
  entries: NavEntry[] = buildNavEntries(),
): NavEntry | null {
  let best: NavEntry | null = null
  let bestScore = -1
  for (const entry of entries) {
    if (entry.skipActive || !matches(entry, pathname, tab)) continue
    const score = entry.path.length + (entry.tab ? 1000 : 0) + (entry.exact ? 0.5 : 0)
    if (score > bestScore) {
      best = entry
      bestScore = score
    }
  }
  return best
}

export interface Breadcrumb {
  label: string
  href?: string
}

function titleCase(segment: string): string {
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export function getBreadcrumbs(pathname: string, tab?: string | null): Breadcrumb[] {
  const root: Breadcrumb = { label: "Dashboard", href: "/dashboard" }
  const entry = resolveActiveEntry(pathname, tab)

  if (!entry) {
    const segments = normalizePath(pathname).split("/").filter(Boolean).slice(1)
    if (segments.length === 0) return [{ label: "Overview" }]
    return [root, { label: titleCase(segments[0]) }]
  }

  if (entry.kind === "item" && entry.id === "overview") return [{ label: "Overview" }]

  const crumbs: Breadcrumb[] = [root]
  if (entry.groupId !== "home") crumbs.push({ label: entry.groupLabel })
  if (entry.kind !== "item") crumbs.push({ label: entry.itemTitle, href: entry.itemHref })
  crumbs.push({ label: entry.title })

  // A trailing detail route (for example /dashboard/teams/[id]) keeps the item as a link.
  const current = normalizePath(pathname)
  if (entry.kind === "item" && current !== entry.path && !entry.tab) {
    crumbs[crumbs.length - 1] = { label: entry.title, href: entry.href }
    crumbs.push({ label: "Details" })
  }
  return crumbs
}

export interface MobileTab {
  groupId: string
  label: string
  href: string
  icon: LucideIcon
}

export function getMobileTabs(ctx: CoachNavContext): MobileTab[] {
  return getVisibleGroups(ctx)
    .filter((group) => group.tab)
    .map((group) => ({
      groupId: group.id,
      label: group.tab!.label,
      href: group.tab!.href,
      icon: group.icon,
    }))
}

export interface PaletteEntry {
  id: string
  title: string
  href: string
  groupLabel: string
  icon: LucideIcon
  keywords: string[]
  action?: CoachNavItem["action"]
}

/** Searchable destinations: everything visible in the sidebar plus aliases, children and the draft group. */
export function getPaletteEntries(ctx: CoachNavContext): PaletteEntry[] {
  const visibleItemIds = new Set(
    COACH_NAV_GROUPS.flatMap((group) => {
      const groupShown = group.alwaysInPalette
        ? group.items.some((item) => isItemVisible(item, ctx))
        : isGroupVisible(group, ctx)
      return groupShown ? group.items.filter((item) => isItemVisible(item, ctx)).map((item) => item.id) : []
    }),
  )
  return buildNavEntries()
    .filter((entry) => visibleItemIds.has(entry.itemId) && !entry.disabled)
    .map((entry) => ({
      id: entry.id,
      title: entry.title,
      href: entry.href,
      groupLabel: entry.groupLabel,
      icon: entry.icon,
      keywords: [...entry.keywords, entry.groupLabel, entry.kind === "item" ? "" : entry.itemTitle].filter(Boolean),
      action: entry.action,
    }))
}
