"use client"

import Link from "next/link"
import Image from "next/image"
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
import {
  LogIn,
  Menu,
  Database,
  LogOut,
  ChevronDown,
  LayoutDashboard,
  Search,
  Music2,
  BookOpen,
} from "lucide-react"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { ScrollingText } from "@/components/ui/scrolling-text"
import { HeaderMusicPlayer } from "@/components/music/header-music-player"
import { OPEN_MOBILE_MUSIC_EVENT } from "@/components/music/mobile-music-player"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import type { AuthChangeEvent, Session, User as SupabaseUser } from "@supabase/supabase-js"
import { getCurrentUserProfile, type UserProfile } from "@/lib/rbac"
import type { User } from "@supabase/supabase-js"
import { ReferencePopoutSheet, type ReferencePopoutVariant } from "@/components/reference-popout-sheet"
import { OPEN_COMMAND_PALETTE_EVENT } from "@/components/command-palette"
import { PUBLIC_NAV_GROUPS, type PublicNavItem } from "@/lib/nav/public-nav"

interface SiteHeaderProps {
  initialUser?: User | null
  initialProfile?: UserProfile | null
}

function DesktopNavItem({ item }: { item: PublicNavItem }) {
  const Icon = item.icon
  if (item.external) {
    return (
      <DropdownMenuItem asChild>
        <a href={item.href} target="_blank" rel="noopener noreferrer" className="cursor-pointer">
          <Icon className="mr-2 h-4 w-4" aria-hidden="true" />
          {item.title}
        </a>
      </DropdownMenuItem>
    )
  }
  return (
    <DropdownMenuItem asChild>
      <Link href={item.href} className="cursor-pointer">
        <Icon className="mr-2 h-4 w-4" aria-hidden="true" />
        {item.title}
      </Link>
    </DropdownMenuItem>
  )
}

export function SiteHeader({ initialUser, initialProfile }: SiteHeaderProps = {}) {
  const hasServerData = initialUser !== undefined

  const [user, setUser] = useState<SupabaseUser | null>(initialUser ?? null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(initialProfile ?? null)
  const [isLoading, setIsLoading] = useState(!hasServerData)
  const [mounted, setMounted] = useState(false)
  const [referencePopout, setReferencePopout] = useState<ReferencePopoutVariant>(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
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

    const checkAuth = async () => {
      if (hasServerData) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (cancelled) return

        if (!session || sessionError) {
          setIsLoading(false)
          return
        }

        if (session.user && !cancelled) {
          setUser(session.user)

          getCurrentUserProfile(supabase)
            .then((profile) => {
              if (!cancelled) {
                setUserProfile(profile)
              }
            })
            .catch((profileError) => {
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
      }
    }

    checkAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, session: Session | null) => {
      if (cancelled) return

      setUser(session?.user ?? null)
      setIsLoading(false)

      if (session?.user) {
        getCurrentUserProfile(supabase)
          .then((profile) => {
            if (!cancelled) {
              setUserProfile(profile)
            }
          })
          .catch((profileError) => {
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

  const handleSignOut = async () => {
    if (!mounted) return
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push("/")
      router.refresh()
    } catch (error) {
      console.error("[SiteHeader] Error signing out:", error)
      router.push("/")
      router.refresh()
    }
  }

  const openCommandPalette = () => {
    window.dispatchEvent(new Event(OPEN_COMMAND_PALETTE_EVENT))
  }

  const openMobileMusic = () => {
    window.dispatchEvent(new Event(OPEN_MOBILE_MUSIC_EVENT))
    setMobileNavOpen(false)
  }

  const discordAvatar = user?.user_metadata?.avatar_url
  const discordUsername =
    user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0]
  const userInitials = discordUsername?.substring(0, 2).toUpperCase() || "U"

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto flex h-16 items-center px-4 md:px-6">
        <div className="mr-4 flex items-center gap-3">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-primary to-secondary group-hover:scale-110 transition-transform shadow-lg shadow-primary/20 overflow-hidden">
              <Image
                src="/league-logo-128.webp"
                alt="Average at Best Pokemon Battle League"
                width={36}
                height={36}
                sizes="36px"
                className="h-full w-full object-contain p-1"
                priority
              />
            </div>
            <div className="hidden lg:block">
              <ScrollingText
                text="Average At Best Pokemon Battle League"
                speed={20}
                pauseOnHover={true}
                className="font-bold text-foreground group-hover:text-primary transition-colors font-marker"
              />
            </div>
            <span
              className="hidden font-bold text-foreground sm:inline-block lg:hidden font-marker whitespace-nowrap"
              suppressHydrationWarning
            >
              AAB League
            </span>
          </Link>
        </div>

        <nav className="hidden lg:flex flex-1 items-center justify-between gap-6" aria-label="Primary">
          <div className="flex items-center gap-1">
            {PUBLIC_NAV_GROUPS.map((group, index) => {
              const GroupIcon = group.icon
              return (
                <div key={group.id} className="flex items-center">
                  {index > 0 ? <div className="mx-1 h-6 w-px bg-border" aria-hidden="true" /> : null}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild suppressHydrationWarning>
                      <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                        <GroupIcon className="mr-1.5 h-4 w-4" aria-hidden="true" />
                        {group.label}
                        <ChevronDown className="ml-1 h-3 w-3" aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <DropdownMenuLabel>{group.menuLabel}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {group.items.map((item) => (
                        <DesktopNavItem key={item.id} item={item} />
                      ))}
                      {group.id === "reference" ? (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel className="font-normal text-muted-foreground">
                            League & dashboard guides
                          </DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => setReferencePopout("league")}
                            className="cursor-pointer"
                          >
                            <BookOpen className="mr-2 h-4 w-4" aria-hidden="true" />
                            League Features Guide (v3)
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setReferencePopout("dashboard")}
                            className="cursor-pointer"
                          >
                            <BookOpen className="mr-2 h-4 w-4" aria-hidden="true" />
                            Dashboard Guides &amp; References
                          </DropdownMenuItem>
                        </>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )
            })}
          </div>

          <ReferencePopoutSheet
            open={referencePopout !== null}
            onOpenChange={(open) => !open && setReferencePopout(null)}
            variant={referencePopout}
            onOpenLeagueInPopout={() => setReferencePopout("league")}
          />

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground"
              onClick={openCommandPalette}
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              <span>Search</span>
              <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:inline-flex">
                ⌘K
              </kbd>
            </Button>
            <HeaderMusicPlayer />
            <ThemeSwitcher />
            {isLoading ? (
              <div className="h-8 w-24 animate-pulse rounded-md bg-muted" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild suppressHydrationWarning>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={discordAvatar || "/placeholder.svg"} alt={discordUsername} />
                      <AvatarFallback className="bg-[#5865F2] text-xs text-white">{userInitials}</AvatarFallback>
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
                    <Link href="/dashboard" className="cursor-pointer">
                      <LayoutDashboard className="mr-2 h-4 w-4" aria-hidden="true" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  {userProfile?.role === "admin" && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="cursor-pointer">
                        <Database className="mr-2 h-4 w-4" aria-hidden="true" />
                        Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild size="sm" variant="outline">
                <Link href="/auth/login" aria-label="Sign in with Discord">
                  <LogIn className="mr-2 h-4 w-4" aria-hidden="true" />
                  Sign in
                </Link>
              </Button>
            )}
          </div>
        </nav>

        <div className="flex flex-1 items-center justify-end gap-2 lg:hidden">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="px-2"
            onClick={openCommandPalette}
            aria-label="Search"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
          </Button>
          <ThemeSwitcher />
          {isLoading ? (
            <div className="h-8 w-8 animate-pulse rounded-md bg-muted" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="p-1" aria-label="Account menu">
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
                  <Link href="/dashboard" className="cursor-pointer">
                    <LayoutDashboard className="mr-2 h-4 w-4" aria-hidden="true" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                {userProfile?.role === "admin" && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="cursor-pointer">
                      <Database className="mr-2 h-4 w-4" aria-hidden="true" />
                      Admin Dashboard
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm" variant="outline">
              <Link href="/auth/login" aria-label="Sign in with Discord">
                <LogIn className="h-4 w-4" aria-hidden="true" />
                <span className="hidden min-[380px]:inline">Sign in</span>
              </Link>
            </Button>
          )}
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="px-2" suppressHydrationWarning>
                <Menu className="h-5 w-5" aria-hidden="true" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="max-h-screen w-[300px] overflow-y-auto sm:w-[400px]">
              <nav className="mt-8 flex flex-col gap-4 pb-4" aria-label="Mobile">
                {PUBLIC_NAV_GROUPS.map((group, index) => (
                  <div key={group.id} className="space-y-2">
                    {index > 0 ? <div className="h-px bg-border" aria-hidden="true" /> : null}
                    <p className="px-2 text-xs font-semibold uppercase text-muted-foreground">{group.label}</p>
                    {group.items.map((item) => {
                      const Icon = item.icon
                      const linkClass =
                        "flex items-center gap-3 px-2 text-lg font-medium transition-colors hover:text-primary"
                      if (item.external) {
                        return (
                          <a
                            key={item.id}
                            href={item.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={linkClass}
                            onClick={() => setMobileNavOpen(false)}
                          >
                            <Icon className="h-5 w-5" aria-hidden="true" />
                            {item.title}
                          </a>
                        )
                      }
                      return (
                        <Link
                          key={item.id}
                          href={item.href}
                          className={linkClass}
                          onClick={() => setMobileNavOpen(false)}
                        >
                          <Icon className="h-5 w-5" aria-hidden="true" />
                          {item.title}
                        </Link>
                      )
                    })}
                    {group.id === "reference" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setMobileNavOpen(false)
                            setReferencePopout("league")
                          }}
                          className="flex w-full items-center gap-3 px-2 text-left text-lg font-medium transition-colors hover:text-primary"
                        >
                          <BookOpen className="h-5 w-5" aria-hidden="true" />
                          League Features Guide (v3)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMobileNavOpen(false)
                            setReferencePopout("dashboard")
                          }}
                          className="flex w-full items-center gap-3 px-2 text-left text-lg font-medium transition-colors hover:text-primary"
                        >
                          <BookOpen className="h-5 w-5" aria-hidden="true" />
                          Dashboard Guides &amp; References
                        </button>
                      </>
                    ) : null}
                  </div>
                ))}

                <div className="h-px bg-border" aria-hidden="true" />
                <div className="space-y-2">
                  <p className="px-2 text-xs font-semibold uppercase text-muted-foreground">Music</p>
                  <button
                    type="button"
                    onClick={openMobileMusic}
                    className="flex w-full items-center gap-3 px-2 text-left text-lg font-medium transition-colors hover:text-primary"
                    aria-label="Open music player"
                    data-testid="mobile-menu-music"
                  >
                    <Music2 className="h-5 w-5" aria-hidden="true" />
                    Music
                  </button>
                </div>

                <div className="mt-4 border-t border-border pt-4">
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
                        <LogOut className="mr-2 h-5 w-5" aria-hidden="true" />
                        Sign Out
                      </Button>
                    </>
                  ) : (
                    <Button asChild size="lg" variant="outline" className="w-full">
                      <Link href="/auth/login">
                        <LogIn className="mr-2 h-5 w-5" aria-hidden="true" />
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
