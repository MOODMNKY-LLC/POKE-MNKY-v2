import Link from "next/link"
import { Button } from "@/components/ui/button"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-8 flex items-center gap-2">
          <Link href="/" className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-xl font-bold text-primary-foreground">P</span>
            </div>
            <span className="hidden font-bold text-foreground sm:inline-block">Average at Best Draft League</span>
            <span className="font-bold text-foreground sm:hidden">AAB League</span>
          </Link>
        </div>
        <nav className="flex flex-1 items-center justify-between gap-6">
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/standings"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Standings
            </Link>
            <Link
              href="/teams"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Teams
            </Link>
            <Link
              href="/matches"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Matches
            </Link>
            <Link
              href="/schedule"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Schedule
            </Link>
            <Link
              href="/playoffs"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Playoffs
            </Link>
            <Link
              href="/pokedex"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Pokédex
            </Link>
            <Link
              href="/mvp"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              MVP
            </Link>
            <Link
              href="/insights"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Insights
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/teams/builder">Team Builder</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/auth/login">Login</Link>
            </Button>
          </div>
        </nav>
      </div>
    </header>
  )
}
