"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { getCurrentSeasonWithFallback } from "@/lib/seasons"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TeamRosterPanel } from "@/components/draft/team-roster-panel"
import { BudgetDisplay } from "@/components/draft/budget-display"
import { PointTierSection } from "@/components/draft/point-tier-section"
import { AlertCircle, RefreshCw, ExternalLink } from "lucide-react"
import Link from "next/link"

interface Pokemon {
  pokemon_name: string
  point_value: number
  generation: number | null
  pokemon_id: number | null
  status?: "available" | "drafted" | "banned" | "unavailable"
}

export function DraftPlanningSection() {
  const [season, setSeason] = useState<{ id: string; name: string } | null>(null)
  const [draftSession, setDraftSession] = useState<{ id: string; status: string } | null>(null)
  const [draftPoolCount, setDraftPoolCount] = useState({ total: 0, available: 0 })
  const [userTeam, setUserTeam] = useState<{ id: string; name: string; rosterCount: number } | null>(null)
  const [pokemon, setPokemon] = useState<Pokemon[]>([])
  const [draftedPokemon, setDraftedPokemon] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTier, setSelectedTier] = useState<number | "all">("all")
  const [selectedGeneration, setSelectedGeneration] = useState<number | "all">("all")
  const [seasonId, setSeasonId] = useState<string | null>(null)
  const [teamId, setTeamId] = useState<string | null>(null)
  const [supabase, setSupabase] = useState<ReturnType<typeof createBrowserClient> | null>(null)

  useEffect(() => {
    // Initialize Supabase client only on client side
    if (typeof window !== 'undefined') {
      setSupabase(createBrowserClient())
    }
  }, [])

  useEffect(() => {
    if (supabase) {
      loadData()
    }
  }, [supabase])

  useEffect(() => {
    if (seasonId && supabase) {
      loadPokemon()
      loadDraftedPokemon()
      loadDraftPoolCount()
    }
  }, [seasonId, supabase])

  async function loadData() {
    if (!supabase) return
    
    try {
      setLoading(true)
      
      // Get current season with fallback to Season 6
      const seasonData = await getCurrentSeasonWithFallback(supabase)

      if (seasonData) {
        setSeason({ id: seasonData.id, name: seasonData.name })
        setSeasonId(seasonData.id)
        
        // Load draft session
        const sessionRes = await fetch(`/api/draft/status?season_id=${seasonData.id}`)
        const sessionData = await sessionRes.json()
        if (sessionData.success && sessionData.session) {
          setDraftSession({
            id: sessionData.session.id,
            status: sessionData.session.status,
          })
        }

        // Load user's team
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: teamData } = await supabase
            .from("teams")
            .select("id, name")
            .eq("coach_id", user.id)
            .eq("season_id", seasonData.id)
            .maybeSingle()

          if (teamData) {
            const { count: rosterCount } = await supabase
              .from("team_rosters")
              .select("*", { count: "exact", head: true })
              .eq("team_id", teamData.id)

            setUserTeam({
              id: teamData.id,
              name: teamData.name,
              rosterCount: rosterCount || 0,
            })
            setTeamId(teamData.id)
          }
        }
      }
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  async function loadDraftPoolCount() {
    if (!seasonId || !supabase) return

    try {
      const { data, count } = await supabase
        .from("draft_pool")
        .select("status", { count: "exact", head: false })
        .eq("season_id", seasonId)
        .limit(1000)

      const available = data?.filter(p => p.status === "available").length || 0
      setDraftPoolCount({ total: count || 0, available })
    } catch (error) {
      console.error("Error loading draft pool count:", error)
    }
  }

  async function loadPokemon() {
    if (!seasonId) return

    try {
      const response = await fetch(`/api/draft/available?limit=500&season_id=${seasonId}`)
      const data = await response.json()

      if (data.success) {
        setPokemon(data.pokemon || [])
      }
    } catch (error) {
      console.error("Error fetching Pokemon:", error)
    }
  }

  async function loadDraftedPokemon() {
    if (!seasonId || !supabase) return

    try {
      const { data } = await supabase
        .from("draft_pool")
        .select("pokemon_name")
        .eq("season_id", seasonId)
        .eq("status", "drafted")

      if (data) {
        setDraftedPokemon(data.map(p => p.pokemon_name.toLowerCase()))
      }
    } catch (error) {
      console.error("Error fetching drafted Pokemon:", error)
    }
  }

  // Set up real-time subscription for draft pool changes
  useEffect(() => {
    if (!seasonId || !supabase) return

    const channel = supabase
      .channel(`draft-planning:${seasonId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "draft_pool",
          filter: `season_id=eq.${seasonId}`,
        },
        () => {
          // Debounce updates
          setTimeout(() => {
            loadPokemon()
            loadDraftedPokemon()
          }, 500)
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [seasonId, supabase])

  // Filter Pokemon
  const filteredPokemon = pokemon.filter(p => {
    const matchesSearch = !searchQuery || p.pokemon_name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTier = selectedTier === "all" || p.point_value === selectedTier
    const matchesGeneration = selectedGeneration === "all" || (p.generation !== null && p.generation === selectedGeneration)
    return matchesSearch && matchesTier && matchesGeneration
  })

  const pointTiers = Array.from({ length: 20 }, (_, i) => 20 - i)

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-96 w-full" />
          </div>
          <div className="lg:col-span-1 space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Draft Planning</h2>
          <p className="text-muted-foreground">
            Plan your draft strategy and track available Pokemon
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {draftSession && (
            <Button asChild>
              <Link href="/draft/board">
                <ExternalLink className="h-4 w-4 mr-2" />
                Go to Draft Board
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Status Alert */}
      {season && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center gap-4 flex-wrap">
            <span>
              <strong>Season:</strong> {season.name}
            </span>
            <span>
              <strong>Draft Pool:</strong> {draftPoolCount.available} available / {draftPoolCount.total} total
            </span>
            <span>
              <strong>Session:</strong> {draftSession ? (
                <Badge variant={draftSession.status === "active" ? "default" : "secondary"}>
                  {draftSession.status}
                </Badge>
              ) : (
                "None"
              )}
            </span>
            {userTeam ? (
              <span>
                <strong>Your Team:</strong> {userTeam.name} ({userTeam.rosterCount}/11)
              </span>
            ) : (
              <span className="text-destructive">
                <strong>No Team:</strong> You need a team for this season
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Warnings */}
      {draftPoolCount.total === 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Draft pool is empty! Please populate it using the draft pool parser script.
          </AlertDescription>
        </Alert>
      )}

      {season && !userTeam && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have a team for this season. Please contact an admin to assign you to a team.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Pokemon List (2 columns) */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <CardTitle>Available Pokemon</CardTitle>
                {teamId && (
                  <BudgetDisplay teamId={teamId} seasonId={seasonId!} />
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Input
                  placeholder="Search Pokemon..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <Select value={selectedTier.toString()} onValueChange={(v) => setSelectedTier(v === "all" ? "all" : parseInt(v))}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Point Tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tiers</SelectItem>
                    {pointTiers.map(tier => (
                      <SelectItem key={tier} value={tier.toString()}>
                        {tier} Points
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedGeneration.toString()} onValueChange={(v) => setSelectedGeneration(v === "all" ? "all" : parseInt(v))}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Generation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Generations</SelectItem>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(gen => (
                      <SelectItem key={gen} value={gen.toString()}>
                        Gen {gen}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {pointTiers.map(tier => {
                  const tierPokemon = filteredPokemon.filter(p => p.point_value === tier)
                  if (tierPokemon.length === 0) return null

                  return (
                    <PointTierSection
                      key={tier}
                      points={tier}
                      pokemon={tierPokemon.map(p => ({
                        name: p.pokemon_name,
                        point_value: p.point_value,
                        generation: p.generation || 1,
                        pokemon_id: p.pokemon_id ?? null,
                        status: p.status || "available",
                      }))}
                      draftedPokemon={draftedPokemon}
                      isYourTurn={false}
                      onPick={() => {}} // No pick action in planning mode
                    />
                  )
                })}
                {filteredPokemon.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    No Pokemon found matching your filters
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Team Info (1 column) */}
        <div className="lg:col-span-1 space-y-6">
          {teamId && seasonId ? (
            <>
              <TeamRosterPanel teamId={teamId} seasonId={seasonId} />
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Your Team</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center py-4">
                  {userTeam ? "Loading team data..." : "No team assigned for this season"}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
