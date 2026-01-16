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
import { UserAvatar } from "@/components/ui/user-avatar"
import { PokeballIcon } from "@/components/ui/pokeball-icon"
import { MessageSquare, Sparkles, Menu, Database, Brain, Trophy, Calendar, Users, BookOpen, LogOut, Info, Loader2, CheckCircle2, Swords, ChevronDown, FileText, LayoutDashboard, ClipboardList, Video } from "lucide-react"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import { Badge } from "@/components/ui/badge"
import { getCurrentUserProfile, type UserProfile } from "@/lib/rbac"
import type { User } from "@supabase/supabase-js"

interface SiteHeaderProps {
  initialUser?: User | null
  initialProfile?: UserProfile | null
}

export function SiteHeader({ initialUser, initialProfile }: SiteHeaderProps = {}) {
  // Determine if we have server-side data (even if null, it means server tried)
  const hasServerData = initialUser !== undefined
  
  const [user, setUser] = useState<SupabaseUser | null>(initialUser ?? null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(initialProfile ?? null)
  const [isLoading, setIsLoading] = useState(!hasServerData) // Start as false if we have server data
  const [syncState, setSyncState] = useState<any>(null)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  // Only create Supabase client on the client side
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // Only run on client side
    if (!mounted) return

    let cancelled = false
    let supabase
    try {
      supabase = createClient()
    } catch (error) {
      console.error("[SiteHeader] Error creating Supabase client:", error)
      setIsLoading(false)
      return
    }

    // Only fetch if we don't have server-side data
    // Use getSession() first (faster, checks local storage)
    // Then rely on onAuthStateChange for actual user data
    const checkAuth = async () => {
      // If we already have server-side data, skip fetching
      if (hasServerData) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      // Quick session check (checks local storage, doesn't hit server)
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (cancelled) return

        // If no session, show login button immediately
        if (!session || sessionError) {
          setIsLoading(false)
          // Don't set user here - let onAuthStateChange handle it
          return
        }

        // If we have a session, set user from session (faster than getUser())
        if (session.user && !cancelled) {
          setUser(session.user)
          
          // Fetch profile asynchronously (don't block)
          getCurrentUserProfile(supabase)
            .then(profile => {
              if (!cancelled) {
                setUserProfile(profile)
              }
            })
            .catch(profileError => {
              console.debug("[SiteHeader] Error fetching profile:", profileError)
            })
        }
        
        if (!cancelled) {
          setIsLoading(false)
        }
      } catch (error) {
        if (cancelled) return
        console.debug("[SiteHeader] Session check error:", error)
        setIsLoading(false)
        // Don't set user to null - let onAuthStateChange handle it
      }
    }

    // Check auth state quickly
    checkAuth()

    // Listen for auth changes (this is more reliable than getUser)
    // This fires immediately with current session and on any auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) return
      
      // Update user immediately when auth state changes
      setUser(session?.user ?? null)
      setIsLoading(false) // Always set loading to false when auth state changes
      
      if (session?.user) {
        // Fetch profile asynchronously (don't block)
        getCurrentUserProfile(supabase)
          .then(profile => {
            if (!cancelled) {
              setUserProfile(profile)
            }
          })
          .catch(profileError => {
            console.debug("[SiteHeader] Error fetching profile:", profileError)
          })
      } else {
        setUserProfile(null)
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [mounted, hasServerData])

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
    if (!mounted) return
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push("/")
      router.refresh()
    } catch (error) {
      console.error("[SiteHeader] Error signing out:", error)
      // Still redirect even if sign out fails
      router.push("/")
      router.refresh()
    }
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
            <span className="hidden font-bold text-foreground lg:inline-block group-hover:text-primary transition-colors font-marker" suppressHydrationWarning>
              Average at Best Battle League
            </span>
            <span className="hidden font-bold text-foreground sm:inline-block lg:hidden font-marker" suppressHydrationWarning>AAB League</span>
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
            <Link href="/draft">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <ClipboardList className="h-4 w-4 mr-1.5" />
                Draft
              </Button>
            </Link>
            
            {/* Divider */}
            <div className="h-6 w-px bg-border mx-1" />
            
            {/* Showdown Section */}
            <Link href="/showdown">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <Swords className="h-4 w-4 mr-1.5" />
                Showdown
              </Button>
            </Link>
            
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
            <Link href="/videos">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <Video className="h-4 w-4 mr-1.5" />
                Videos
              </Button>
            </Link>
            
            {/* Divider */}
            <div className="h-6 w-px bg-border mx-1" />
            
            {/* Dashboard Link - Only visible to authenticated users */}
            {user && (
              <>
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    <LayoutDashboard className="h-4 w-4 mr-1.5" />
                    Dashboard
                  </Button>
                </Link>
                {/* Divider */}
                <div className="h-6 w-px bg-border mx-1" />
              </>
            )}
            
            {/* Resources Section */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild suppressHydrationWarning>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  <FileText className="h-4 w-4 mr-1.5" />
                  Resources
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem asChild>
                  <Link href="/docs/api" className="cursor-pointer">
                    <FileText className="mr-2 h-4 w-4" />
                    API Documentation
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
            {isLoading ? (
              // Loading skeleton to prevent layout shift
              <div className="h-8 w-24 animate-pulse rounded-md bg-muted" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild suppressHydrationWarning>
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
            )}
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
          {isLoading ? (
            // Loading skeleton to prevent layout shift
            <div className="h-8 w-8 animate-pulse rounded-md bg-muted" />
          ) : user ? (
            <DropdownMenu suppressHydrationWarning>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-1">
                    <UserAvatar
                      src={discordAvatar || undefined}
                      alt={discordUsername}
                      fallback={userInitials}
                      role={userProfile?.role}
                      size="sm"
                      showBadge={true}
                      showPokeball={false}
                    />
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
            )}
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
                  <Link
                    href="/draft"
                    className="flex items-center gap-3 text-lg font-medium hover:text-primary transition-colors px-2"
                  >
                    <ClipboardList className="h-5 w-5" />
                    Draft Room
                  </Link>
                </div>
                
                {/* Divider */}
                <div className="h-px bg-border" />
                
                {/* Showdown Section */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase px-2 font-marker" suppressHydrationWarning>Showdown</p>
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
                
                {/* Dashboard Section - Only visible to authenticated users */}
                {user && (
                  <>
                    <div className="space-y-2">
                      <Link
                        href="/dashboard"
                        className="flex items-center gap-3 text-lg font-medium hover:text-primary transition-colors px-2"
                      >
                        <LayoutDashboard className="h-5 w-5" />
                        Dashboard
                      </Link>
                    </div>
                    {/* Divider */}
                    <div className="h-px bg-border" />
                  </>
                )}
                
                {/* Resources Section */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase px-2">Resources</p>
                  <Link
                    href="/docs/api"
                    className="flex items-center gap-3 text-lg font-medium hover:text-primary transition-colors px-2"
                  >
                    <FileText className="h-5 w-5" />
                    API Documentation
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
