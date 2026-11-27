"use client"

import * as React from "react"
import { CoachNavGroups } from "@/components/dashboard/coach-nav-groups"
import { CoachNavUser } from "@/components/dashboard/coach-nav-user"
import { SectionSwitcher } from "@/components/dashboard/section-switcher"
import { ProfileSheet } from "@/components/profile/profile-sheet"
import { OPEN_PROFILE_SHEET_EVENT } from "@/components/profile/profile-sheet-trigger"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import type { CoachNavContext } from "@/lib/nav/coach-nav"
import type { CoachNavShellData } from "@/lib/nav/coach-nav-context"

interface AppSidebarProps extends Omit<React.ComponentProps<typeof Sidebar>, "children"> {
  nav: CoachNavContext
  user: CoachNavShellData["user"]
}

export function AppSidebar({ nav, user, ...props }: AppSidebarProps) {
  const [profileSheetOpen, setProfileSheetOpen] = React.useState(false)

  React.useEffect(() => {
    const handler = () => setProfileSheetOpen(true)
    window.addEventListener(OPEN_PROFILE_SHEET_EVENT, handler)
    return () => window.removeEventListener(OPEN_PROFILE_SHEET_EVENT, handler)
  }, [])

  return (
    <>
      <Sidebar collapsible="icon" {...props}>
        <SidebarHeader>
          <SectionSwitcher ctx={nav} />
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
