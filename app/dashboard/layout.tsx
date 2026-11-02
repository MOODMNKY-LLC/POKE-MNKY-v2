import { cookies } from "next/headers"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { TeraAssignmentModal } from "@/components/dashboard/tera-assignment-modal"
import { CommandPalette } from "@/components/command-palette"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { MobileTabBar } from "@/components/dashboard/mobile-tab-bar"
import { getCoachNavShellData } from "@/lib/nav/coach-nav-context"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false"
  const { nav, user, team } = await getCoachNavShellData()

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar nav={nav} user={user} team={team} />
      <SidebarInset className="min-w-0">
        <DashboardHeader />
        <div className="flex flex-1 flex-col pb-(--mobile-tab-bar-height) md:pb-0">{children}</div>
      </SidebarInset>
      <MobileTabBar ctx={nav} />
      <TeraAssignmentModal />
      <CommandPalette ctx={nav} />
    </SidebarProvider>
  )
}
