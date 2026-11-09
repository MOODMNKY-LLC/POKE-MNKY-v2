import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Season Simulator | POKÉ MNKY",
  description:
    "Operator console for the provisional statistical Season Simulator sandbox. Not Pokémon Showdown, not Season 7 or Season 8.",
}

export default function DemoSeasonSimLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#sim-main"
        className="sr-only rounded-md bg-primary px-4 py-3 text-primary-foreground focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
      >
        Skip to simulator console
      </a>
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3 text-sm sm:px-6">
          <span className="font-semibold tracking-wide text-card-foreground">POKÉ MNKY</span>
          <span className="text-pretty text-muted-foreground">
            Season Simulator · provisional sandbox · demo operator, not league admin
          </span>
        </div>
      </header>
      <main id="sim-main">{children}</main>
    </div>
  )
}
