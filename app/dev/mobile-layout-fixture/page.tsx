"use client"

/**
 * Unauthenticated layout fixture for mobile polish verification.
 * Not linked from production nav. Safe for local/preview screenshots.
 */
import { Suspense } from "react"
import { CoachCard } from "@/components/draft/coach-card"
import { MobileTabBar } from "@/components/dashboard/mobile-tab-bar"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { DEFAULT_NAV_CONTEXT, type CoachNavContext } from "@/lib/nav/coach-nav"

const fixtureNav: CoachNavContext = {
  ...DEFAULT_NAV_CONTEXT,
  isCoach: true,
  onboardingComplete: true,
}

function FixtureBody() {
  return (
    <div className="min-h-dvh min-w-0 overflow-x-clip bg-background text-foreground">
      <header className="sticky top-0 z-30 flex h-14 items-center border-b px-4">
        <span className="text-sm font-medium">Dashboard</span>
      </header>
      <main className="mx-auto flex min-w-0 max-w-5xl flex-col gap-4 p-4 pb-[calc(var(--mobile-tab-bar-height)+4.5rem)]">
        <div className="min-w-0 space-y-2">
          <h1 className="text-2xl font-bold tracking-tight break-words">
            Welcome back, PHELPSIE12!
          </h1>
          <p className="text-sm text-muted-foreground">
            Your personal dashboard for POKE MNKY · Season 8
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 text-xs text-muted-foreground">
          <span>Turn off to see your team</span>
          <span>Demo card</span>
        </div>
        <div className="min-w-0 w-full">
          <CoachCard palette="gold-black" />
        </div>
        <section className="min-w-0 space-y-1">
          <h2 className="text-sm font-semibold uppercase tracking-wide">Your Teams</h2>
          <p className="text-sm text-muted-foreground">
            Set which team is current for draft and league tools.
          </p>
        </section>
        <div
          data-testid="fab-clearance-marker"
          className="fixed right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full border bg-background shadow md:bottom-6 bottom-[calc(var(--mobile-tab-bar-height)+1rem)]"
          aria-hidden="true"
        >
          FAB
        </div>
      </main>
      <MobileTabBar ctx={fixtureNav} />
    </div>
  )
}

export default function MobileLayoutFixturePage() {
  return (
    <SidebarProvider defaultOpen={false}>
      <Sidebar collapsible="offcanvas">
        <SidebarHeader className="border-b px-4 py-3 text-sm font-semibold">
          More
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Extras</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>Draft</SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>Standings</SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>Insights</SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading fixture…</div>}>
        <FixtureBody />
      </Suspense>
    </SidebarProvider>
  )
}
