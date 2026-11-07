import type { ReactNode } from "react"

/** Minimal layout — no AdminAppSidebar / league admin chrome. */
export default function DemoSeasonSimLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b px-4 py-3 text-sm text-muted-foreground">
        POKÉ MNKY · Provisional sandbox simulator (demo operator) · not league admin
      </header>
      {children}
    </div>
  )
}
