import type { Metadata } from "next"
import type { ReactNode } from "react"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Season Simulator | POKÉ MNKY",
  description:
    "Practice season walkthrough. Statistical results only. Not Pokémon Showdown, and not the live Season 7 or Season 8.",
}

export default function DemoSeasonSimLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border bg-muted/40">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 text-sm sm:px-6">
          <p className="text-pretty text-muted-foreground">
            Practice seasons · not the live league
          </p>
          <Link
            href="/auth/login?next=/demo/season-sim"
            className="inline-flex h-11 items-center font-medium text-primary underline-offset-4 hover:underline sm:h-9"
          >
            Sign in
          </Link>
        </div>
      </div>
      <div id="sim-main">{children}</div>
    </div>
  )
}
