"use client"

import * as React from "react"
import {
  LayoutDashboard,
  RefreshCw,
  MessageSquare,
  Settings,
  Trophy,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { createBrowserClient } from "@/lib/supabase/client"
import { AdminSeasonSwitcher, type AdminSeason } from "@/components/admin/sidebar-07/admin-season-switcher"
import { AdminNavMain } from "@/components/admin/sidebar-07/admin-nav-main"
import { AdminNavProjects, type AdminActiveSession } from "@/components/admin/sidebar-07/admin-nav-projects"
import { AdminNavUser } from "@/components/admin/sidebar-07/admin-nav-user"
import { SupabaseManager } from "@/components/platform/supabase-manager"
import { CreateSeasonDialog } from "@/components/admin/create-season-dialog"

const adminNavItems = [
  {
    title: "Overview",
    url: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "League",
    url: "/admin/league",
    icon: Trophy,
    items: [
      { title: "League Hub", url: "/admin/league" },
      { title: "Teams", url: "/admin/league#teams" },
      { title: "Matches", url: "/admin/league#matches" },
      { title: "Trades", url: "/admin/trades" },
      { title: "Draft Pool & Rules", url: "/admin/draft-pool-rules" },
      { title: "Draft Sessions", url: "/admin/draft/sessions" },
      { title: "Draft Board", url: "/admin/draft-board-management" },
      { title: "Playoffs", url: "/admin/playoffs" },
    ],
  },
  {
    title: "Sync & Data",
    url: "/admin/sync",
    icon: RefreshCw,
    items: [
      { title: "Sync Hub", url: "/admin/sync" },
      { title: "Sync Logs", url: "/admin/sync-logs" },
    ],
  },
  {
    title: "System",
    url: "/admin/users",
    icon: Settings,
    items: [
      { title: "Users", url: "/admin/users" },
      { title: "Pokepedia", url: "/admin/pokepedia-dashboard" },
      { title: "Pokemon Catalog", url: "/admin/pokemon" },
    ],
  },
  {
    title: "Integrations",
    url: "/admin/discord",
    icon: MessageSquare,
    items: [
      { title: "Discord", url: "/admin/discord" },
      { title: "Google Sheets", url: "/admin/google-sheets" },
      { title: "Simulation", url: "/admin/simulation" },
      { title: "Music", url: "/admin/music" },
    ],
  },
]

function fetchSeasons(): Promise<AdminSeason[]> {
  const supabase = createBrowserClient()
  return supabase
    .from("seasons")
    .select("id, name, is_current")
    .order("start_date", { ascending: false })
    .limit(10)
    .then(({ data }) =>
      (data || []).map((s) => ({
        id: s.id,
        name: s.name,
        plan: s.is_current ? "Current" : "",
        is_current: s.is_current,
      }))
    )
}

export function AdminAppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const [seasons, setSeasons] = React.useState<AdminSeason[]>([])
  const [activeSessions, setActiveSessions] = React.useState<AdminActiveSession[]>([])
  const [user, setUser] = React.useState<{ name: string; email: string; avatar?: string } | null>(null)
  const [platformOpen, setPlatformOpen] = React.useState(false)
  const [createSeasonOpen, setCreateSeasonOpen] = React.useState(false)

  React.useEffect(() => {
    const supabase = createBrowserClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser({
          name: data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || "Admin",
          email: data.user.email || "",
          avatar: data.user.user_metadata?.avatar_url,
        })
      }
    })
  }, [])

  const loadSeasons = React.useCallback(() => {
    fetchSeasons().then(setSeasons)
  }, [])

  React.useEffect(() => {
    loadSeasons()
  }, [loadSeasons])

  React.useEffect(() => {
    const supabase = createBrowserClient()
    supabase
      .from("draft_sessions")
      .select("id, session_name")
      .eq("status", "active")
      .limit(5)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setActiveSessions(
            data.map((s) => ({
              id: s.id,
              name: s.session_name || `Draft ${s.id.slice(0, 8)}`,
              url: `/admin/draft/sessions`,
            }))
          )
        }
      })
  }, [])

  return (
    <>
      <Sidebar
        {...props}
        className={cn("!top-16 !h-[calc(100svh-4rem)]", props.className)}
      >
        <SidebarHeader className="border-b border-border">
          <AdminSeasonSwitcher seasons={seasons} />
        </SidebarHeader>
        <SidebarContent>
          <AdminNavMain items={adminNavItems} />
          <AdminNavProjects sessions={activeSessions} />
        </SidebarContent>
        <SidebarFooter className="border-t border-border">
          {user && (
            <AdminNavUser
              user={user}
              onPlatformManagerClick={() => setPlatformOpen(true)}
            />
          )}
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SupabaseManager
        projectRef={
          process.env.NEXT_PUBLIC_SUPABASE_URL?.split("//")[1]?.split(".")[0] || "default"
        }
        open={platformOpen}
        onOpenChange={setPlatformOpen}
      />
      <CreateSeasonDialog
        open={createSeasonOpen}
        onOpenChange={setCreateSeasonOpen}
        onCreated={loadSeasons}
      />
    </>
  )
}
