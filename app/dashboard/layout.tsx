import { DashboardDock } from "@/components/dashboard-dock"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
      <DashboardDock />
    </>
  )
}
