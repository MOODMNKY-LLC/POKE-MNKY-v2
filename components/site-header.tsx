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
import { MessageSquare, Sparkles, Menu, Database, Brain, Trophy, Calendar, Users, BookOpen, LogOut, Info, Loader2, CheckCircle2, Swords, ChevronDown } from "lucide-react"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import { Badge } from "@/components/ui/badge"

export function SiteHeader() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [syncState, setSyncState] = useState<any>(null)
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

  // Get sync state from window (exposed by PokepediaSyncProvider)
  useEffect(() => {
    const checkSyncState = () => {
      if (typeof window !== 'undefined' && (window as any).__syncState) {
        setSyncState((window as any).__syncState)
      }
    }
    
    checkSyncState()
    const interval = setInterval(checkSyncState, 1000) // Update every second
    return () => clearInterval(interval)
  }, [])

  const handleOpenSyncStatus = () => {
    // Call function exposed by PokepediaSyncProvider
    if (typeof window !== 'undefined' && typeof (window as any).__openSyncStatus === 'function') {
      (window as any).__openSyncStatus()
    } else {
      console.warn('[Header] Sync status function not available yet')
    }
  }

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
      <div className="container mx-auto flex h-16 items-center px-4 md:px-6">
        <div className="mr-4 flex items-center gap-2">
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-primary to-secondary group-hover:scale-110 transition-transform shadow-lg shadow-primary/20 overflow-hidden">
              <img 
                src="/league-logo.svg" 
                alt="Average at Best Battle League" 
                className="h-full w-full object-contain p-1"
                loading="eager"
              />
            </div>
            <span className="hidden font-bold text-foreground lg:inline-block group-hover:text-primary transition-colors">
              Average at Best Battle League
            </span>
            <span className="hidden font-bold text-foreground sm:inline-block lg:hidden">AAB League</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex flex-1 items-center justify-between gap-6">
          <div className="flex items-center gap-1">
            {/* League Management Section */}
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
            
            {/* Divider */}
            <div className="h-6 w-px bg-border mx-1" />
            
            {/* Showdown Section */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  <Swords className="h-4 w-4 mr-1.5" />
                  Showdown
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem asChild>
                  <Link href="/showdown" className="cursor-pointer">
                    <Swords className="mr-2 h-4 w-4" />
                    Battle Simulator
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/teams/builder" className="cursor-pointer">
                    <Brain className="mr-2 h-4 w-4" />
                    Team Builder
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Divider */}
            <div className="h-6 w-px bg-border mx-1" />
            
            {/* Reference & Insights Section */}
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
            {/* Sync Status Indicator - Always visible */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenSyncStatus}
              className="relative gap-1.5"
              title="Sync Status"
            >
              {syncState?.status === "syncing" && !syncState?.isStale ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                  <span className="hidden xl:inline text-xs">Syncing</span>
                  {syncState.progress > 0 && (
                    <Badge variant="outline" className="ml-1 h-4 px-1 text-[10px]">
                      {syncState.progress.toFixed(0)}%
                    </Badge>
                  )}
                </>
              ) : syncState?.status === "completed" ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  <span className="hidden xl:inline text-xs">Synced</span>
                </>
              ) : (
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </Button>
            
            {/* Divider */}
            <div className="h-6 w-px bg-border" />
            
            <ThemeSwitcher />
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
          {/* Sync Status Indicator - Mobile - Always visible */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenSyncStatus}
            className="p-1.5"
            title="Sync Status"
          >
            {syncState?.status === "syncing" && !syncState?.isStale ? (
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            ) : syncState?.status === "completed" ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <Info className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
          <ThemeSwitcher />
          {!isLoading &&
            (user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-1" suppressHydrationWarning>
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
              <Button variant="ghost" size="sm" className="px-2" suppressHydrationWarning>
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <nav className="flex flex-col gap-4 mt-8">
                {/* League Management Section */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase px-2">League</p>
                  <Link
                    href="/standings"
                    className="flex items-center gap-3 text-lg font-medium hover:text-primary transition-colors px-2"
                  >
                    <Trophy className="h-5 w-5" />
                    Standings
                  </Link>
                  <Link
                    href="/teams"
                    className="flex items-center gap-3 text-lg font-medium hover:text-primary transition-colors px-2"
                  >
                    <Users className="h-5 w-5" />
                    Teams
                  </Link>
                  <Link
                    href="/schedule"
                    className="flex items-center gap-3 text-lg font-medium hover:text-primary transition-colors px-2"
                  >
                    <Calendar className="h-5 w-5" />
                    Schedule
                  </Link>
                </div>
                
                {/* Divider */}
                <div className="h-px bg-border" />
                
                {/* Showdown Section */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase px-2">Showdown</p>
                  <Link
                    href="/showdown"
                    className="flex items-center gap-3 text-lg font-medium hover:text-primary transition-colors px-2"
                  >
                    <Swords className="h-5 w-5" />
                    Battle Simulator
                  </Link>
                  <Link
                    href="/teams/builder"
                    className="flex items-center gap-3 text-lg font-medium hover:text-primary transition-colors px-2"
                  >
                    <Brain className="h-5 w-5" />
                    Team Builder
                  </Link>
                </div>
                
                {/* Divider */}
                <div className="h-px bg-border" />
                
                {/* Reference & Insights Section */}
                <div className="space-y-2">
                  <Link
                    href="/pokedex"
                    className="flex items-center gap-3 text-lg font-medium hover:text-primary transition-colors px-2"
                  >
                    <BookOpen className="h-5 w-5" />
                    Pokédex
                  </Link>
                  <Link
                    href="/insights"
                    className="flex items-center gap-3 text-lg font-medium hover:text-primary transition-colors px-2"
                  >
                    <Sparkles className="h-5 w-5" />
                    AI Insights
                  </Link>
                </div>
                
                {/* Divider */}
                <div className="h-px bg-border" />
                
                {/* Admin Section */}
                <Link
                  href="/admin"
                  className="flex items-center gap-3 text-lg font-medium hover:text-primary transition-colors px-2"
                >
                  <Database className="h-5 w-5" />
                  Admin Dashboard
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
