"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MessageSquare, Sparkles, Menu, Database, Brain, Trophy, Calendar, Users, BookOpen, LogOut } from "lucide-react"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import type { User as SupabaseUser } from "@supabase/supabase-js"

export function SiteHeader() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
      setIsLoading(false)
    }

    getUser()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  const discordAvatar = user?.user_metadata?.avatar_url
  const discordUsername = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0]
  const userInitials = discordUsername?.substring(0, 2).toUpperCase() || "U"

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
            {!isLoading &&
              (user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={discordAvatar || "/placeholder.svg"} alt={discordUsername} />
                        <AvatarFallback className="bg-[#5865F2] text-white text-xs">{userInitials}</AvatarFallback>
                      </Avatar>
                      <span className="hidden md:inline-block">{discordUsername}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{discordUsername}</p>
                        <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="cursor-pointer">
                        <Database className="mr-2 h-4 w-4" />
                        Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleSignOut}
                      className="cursor-pointer text-destructive focus:text-destructive"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button asChild size="sm" className="bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                  <Link href="/auth/login">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Login
                  </Link>
                </Button>
              ))}
          </div>
        </nav>

        {/* Mobile Navigation */}
        <div className="flex flex-1 items-center justify-end lg:hidden gap-2">
          <ThemeSwitcher />
          {!isLoading &&
            (user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-1">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={discordAvatar || "/placeholder.svg"} alt={discordUsername} />
                      <AvatarFallback className="bg-[#5865F2] text-white text-xs">{userInitials}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{discordUsername}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="cursor-pointer">
                      <Database className="mr-2 h-4 w-4" />
                      Admin Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild size="sm" className="bg-gradient-to-r from-primary to-secondary">
                <Link href="/auth/login">
                  <MessageSquare className="h-4 w-4" />
                </Link>
              </Button>
            ))}
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
                  {user ? (
                    <>
                      <div className="mb-4 flex items-center gap-3 px-2">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={discordAvatar || "/placeholder.svg"} alt={discordUsername} />
                          <AvatarFallback className="bg-[#5865F2] text-white">{userInitials}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{discordUsername}</span>
                          <span className="text-xs text-muted-foreground">{user.email}</span>
                        </div>
                      </div>
                      <Button onClick={handleSignOut} size="lg" variant="outline" className="w-full bg-transparent">
                        <LogOut className="h-5 w-5 mr-2" />
                        Sign Out
                      </Button>
                    </>
                  ) : (
                    <Button asChild size="lg" className="w-full bg-gradient-to-r from-primary to-secondary">
                      <Link href="/auth/login">
                        <MessageSquare className="h-5 w-5 mr-2" />
                        Sign In with Discord
                      </Link>
                    </Button>
                  )}
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
