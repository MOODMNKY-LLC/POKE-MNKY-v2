import { DashboardDock } from "@/components/dashboard-dock"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { TeraAssignmentModal } from "@/components/dashboard/tera-assignment-modal"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {children}
      </SidebarInset>
      <DashboardDock />
      <TeraAssignmentModal />
    </SidebarProvider>
  )
}
