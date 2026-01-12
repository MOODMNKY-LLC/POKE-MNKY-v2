import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { MessageSquare, Sparkles, Menu, Database, Brain, Trophy, Calendar, Users, BookOpen } from "lucide-react"
import { ThemeSwitcher } from "@/components/theme-switcher"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center">
        <div className="mr-4 flex items-center gap-2">
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-primary to-secondary group-hover:scale-110 transition-transform shadow-lg shadow-primary/20">
              <span className="text-xl font-bold text-primary-foreground">P</span>
            </div>
            <span className="hidden font-bold text-foreground lg:inline-block group-hover:text-primary transition-colors">
              Average at Best Draft League
            </span>
            <span className="hidden font-bold text-foreground sm:inline-block lg:hidden">AAB League</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex flex-1 items-center justify-between gap-6">
          <div className="flex items-center gap-1">
            <Link href="/standings">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <Trophy className="h-4 w-4 mr-1.5" />
                Standings
              </Button>
            </Link>
            <Link href="/teams">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <Users className="h-4 w-4 mr-1.5" />
                Teams
              </Button>
            </Link>
            <Link href="/schedule">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <Calendar className="h-4 w-4 mr-1.5" />
                Schedule
              </Button>
            </Link>
            <Link href="/pokedex">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <BookOpen className="h-4 w-4 mr-1.5" />
                Pokédex
              </Button>
            </Link>
            <Link href="/insights">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <Sparkles className="h-4 w-4 mr-1.5" />
                Insights
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <Button
              asChild
              variant="outline"
              size="sm"
              className="bg-transparent hover:bg-primary/10 hover:text-primary hover:border-primary/50"
            >
              <Link href="/teams/builder">Team Builder</Link>
            </Button>
            <Button asChild size="sm" className="bg-gradient-to-r from-primary to-secondary hover:opacity-90">
              <Link href="/auth/login">
                <MessageSquare className="h-4 w-4 mr-2" />
                Login
              </Link>
            </Button>
          </div>
        </nav>

        {/* Mobile Navigation */}
        <div className="flex flex-1 items-center justify-end lg:hidden gap-2">
          <ThemeSwitcher />
          <Button asChild size="sm" className="bg-gradient-to-r from-primary to-secondary">
            <Link href="/auth/login">
              <MessageSquare className="h-4 w-4" />
            </Link>
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="px-2">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <nav className="flex flex-col gap-4 mt-8">
                <Link
                  href="/standings"
                  className="flex items-center gap-3 text-lg font-medium hover:text-primary transition-colors"
                >
                  <Trophy className="h-5 w-5" />
                  Standings
                </Link>
                <Link
                  href="/teams"
                  className="flex items-center gap-3 text-lg font-medium hover:text-primary transition-colors"
                >
                  <Users className="h-5 w-5" />
                  Teams
                </Link>
                <Link
                  href="/schedule"
                  className="flex items-center gap-3 text-lg font-medium hover:text-primary transition-colors"
                >
                  <Calendar className="h-5 w-5" />
                  Schedule
                </Link>
                <Link
                  href="/pokedex"
                  className="flex items-center gap-3 text-lg font-medium hover:text-primary transition-colors"
                >
                  <BookOpen className="h-5 w-5" />
                  Pokédex
                </Link>
                <Link
                  href="/insights"
                  className="flex items-center gap-3 text-lg font-medium hover:text-primary transition-colors"
                >
                  <Sparkles className="h-5 w-5" />
                  AI Insights
                </Link>
                <Link
                  href="/admin"
                  className="flex items-center gap-3 text-lg font-medium hover:text-primary transition-colors"
                >
                  <Database className="h-5 w-5" />
                  Admin Dashboard
                </Link>
                <Link
                  href="/teams/builder"
                  className="flex items-center gap-3 text-lg font-medium hover:text-primary transition-colors"
                >
                  <Brain className="h-5 w-5" />
                  Team Builder
                </Link>
                <div className="pt-4 mt-4 border-t border-border">
                  <Button asChild size="lg" className="w-full bg-gradient-to-r from-primary to-secondary">
                    <Link href="/auth/login">
                      <MessageSquare className="h-5 w-5 mr-2" />
                      Sign In with Discord
                    </Link>
                  </Button>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
