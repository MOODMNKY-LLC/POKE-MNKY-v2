"use client"

import * as React from "react"
import Link from "next/link"
import {
  LayoutDashboard,
  RefreshCw,
  MessageSquare,
  Settings,
  Trophy,
} from "lucide-react"
import { PokeMnkyPremium } from "@/components/ui/poke-mnky-avatar"
import { NavMain } from "@/components/nav-main"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const adminNavItems = [
  {
    title: "Overview",
    url: "/admin",
    icon: LayoutDashboard,
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
    title: "League",
    url: "/admin/league",
    icon: Trophy,
    items: [
      { title: "League", url: "/admin/league" },
      { title: "Teams", url: "/admin/teams" },
      { title: "Matches", url: "/admin/matches" },
      { title: "Trades", url: "/admin/trades" },
      { title: "Draft Pool", url: "/admin/draft-pool-rules" },
      { title: "Draft Sessions", url: "/admin/draft/sessions" },
      { title: "Draft Board", url: "/admin/draft-board-management" },
      { title: "Playoffs", url: "/admin/playoffs" },
    ],
  },
  {
    title: "System",
    url: "/admin/users",
    icon: Settings,
    items: [
      { title: "Users", url: "/admin/users" },
      { title: "Pokepedia", url: "/admin/pokepedia-dashboard" },
      { title: "Pokemon", url: "/admin/pokemon" },
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

export function AdminSidebar(props: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar
      {...props}
      className={cn("!top-16 !h-[calc(100svh-4rem)]", props.className)}
    >
      <SidebarHeader className="border-b border-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <PokeMnkyPremium size={28} className="shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="font-semibold truncate">Admin</span>
            <span className="text-xs text-muted-foreground truncate">Backoffice</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={adminNavItems} />
      </SidebarContent>
      <SidebarFooter className="border-t border-border">
        <div className="flex flex-col gap-1 p-2">
          <Button asChild variant="ghost" size="sm" className="justify-start">
            <Link href="/">View Site</Link>
          </Button>
          <form action="/api/auth/signout" method="POST">
            <Button type="submit" variant="ghost" size="sm" className="w-full justify-start">
              Sign Out
            </Button>
          </form>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
