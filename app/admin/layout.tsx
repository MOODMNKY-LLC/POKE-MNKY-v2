import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { AdminAppSidebar } from "@/components/admin/admin-app-sidebar"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { AdminLayoutHeader } from "@/components/admin/admin-layout-header"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AdminAppSidebar />
      <SidebarInset>
        <AdminLayoutHeader />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
