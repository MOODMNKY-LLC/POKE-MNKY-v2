"use client"

import * as React from "react"
import Link from "next/link"
import { Sparkles } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CoachNavGroups } from "@/components/dashboard/coach-nav-groups"
import { CoachNavUser } from "@/components/dashboard/coach-nav-user"
import { ProfileSheet } from "@/components/profile/profile-sheet"
import { OPEN_PROFILE_SHEET_EVENT } from "@/components/profile/profile-sheet-trigger"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import type { CoachNavContext } from "@/lib/nav/coach-nav"
import type { CoachNavShellData } from "@/lib/nav/coach-nav-context"

interface AppSidebarProps extends Omit<React.ComponentProps<typeof Sidebar>, "children"> {
  nav: CoachNavContext
  user: CoachNavShellData["user"]
  team: CoachNavShellData["team"]
}

export function AppSidebar({ nav, user, team, ...props }: AppSidebarProps) {
  const [profileSheetOpen, setProfileSheetOpen] = React.useState(false)

  React.useEffect(() => {
    const handler = () => setProfileSheetOpen(true)
    window.addEventListener(OPEN_PROFILE_SHEET_EVENT, handler)
    return () => window.removeEventListener(OPEN_PROFILE_SHEET_EVENT, handler)
  }, [])

  const brandName = team?.name ?? "POKE MNKY"

  return (
    <>
      <Sidebar collapsible="icon" {...props}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild tooltip={brandName} className="max-md:h-14">
                <Link href="/dashboard">
                  <Avatar className="size-8 rounded-lg">
                    <AvatarImage src={team?.logoUrl ?? undefined} alt="" />
                    <AvatarFallback className="rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                      <Sparkles className="size-4" aria-hidden="true" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{brandName}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {nav.isCoach ? "Coach dashboard" : "Dashboard"}
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <CoachNavGroups ctx={nav} />
        </SidebarContent>
        <SidebarFooter>
          <CoachNavUser user={user} />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <ProfileSheet open={profileSheetOpen} onOpenChange={setProfileSheetOpen} />
    </>
  )
}
