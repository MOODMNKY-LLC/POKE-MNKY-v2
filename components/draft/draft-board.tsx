"use client"

import { useEffect, useState } from "react"
import { PointTierSection } from "./point-tier-section"
import { BudgetDisplay } from "./budget-display"
import { PickConfirmationDialog } from "./pick-confirmation-dialog"
import { BorderBeam } from "@/components/ui/border-beam"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { createClient } from "@/lib/supabase/client"

interface Pokemon {
  pokemon_name: string
  point_value: number
  generation: number | null
  pokemon_id: number | null
  status?: "available" | "drafted" | "banned" | "unavailable"
}

interface DraftBoardProps {
  sessionId: string
  currentTeamId: string | null
  seasonId: string
}

export function DraftBoard({ sessionId, currentTeamId, seasonId, isYourTurn = false }: DraftBoardProps) {
  console.log("[DraftBoard] Component rendered with props:", { sessionId, currentTeamId, seasonId, isYourTurn })
  
  const [pokemon, setPokemon] = useState<Pokemon[]>([])
  const [draftedPokemon, setDraftedPokemon] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTier, setSelectedTier] = useState<number | "all">("all")
  const [selectedGeneration, setSelectedGeneration] = useState<number | "all">("all")
  const [selectedPokemon, setSelectedPokemon] = useState<Pokemon | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [budget, setBudget] = useState<{ total: number; spent: number; remaining: number } | null>(null)
  const [supabase] = useState(() => {
    if (typeof window === 'undefined') return null as any
    return createClient()
  })

  // Fetch available Pokemon
  useEffect(() => {
    async function fetchPokemon() {
      if (!seasonId) {
        console.warn("[DraftBoard] No seasonId provided, skipping fetch")
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        console.log("[DraftBoard] Fetching Pokemon for season:", seasonId)
        const response = await fetch(`/api/draft/available?limit=500&season_id=${seasonId}`)
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`)
        }
        
        const data = await response.json()
        console.log("[DraftBoard] API response:", { success: data.success, count: data.pokemon?.length || 0 })
        
        if (data.success) {
          const pokemonList = data.pokemon || []
          console.log("[DraftBoard] Setting Pokemon:", pokemonList.length, "Sample:", pokemonList.slice(0, 3))
          setPokemon(pokemonList)
          
          if (pokemonList.length === 0) {
            console.warn("[DraftBoard] API returned success but empty Pokemon array. Response:", data)
          }
        } else {
          console.error("[DraftBoard] API returned error:", data.error)
          console.error("[DraftBoard] Full API response:", data)
        }
      } catch (error) {
        console.error("[DraftBoard] Error fetching Pokemon:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPokemon()
  }, [seasonId])

  // Fetch drafted Pokemon (using status field from draft_pool)
  useEffect(() => {
    if (!seasonId || !supabase) return

    let mounted = true
    let timeoutId: NodeJS.Timeout | null = null

    async function fetchDraftedPokemon() {
      // Query draft_pool directly for drafted Pokemon (uses denormalized fields)
      const { data } = await supabase
        .from("draft_pool")
        .select("pokemon_name")
        .eq("season_id", seasonId)
        .eq("status", "drafted")

      if (mounted && data) {
        const draftedNames = data
          .map(p => p.pokemon_name.toLowerCase())
        setDraftedPokemon(draftedNames)
      } else if (mounted) {
        setDraftedPokemon([])
      }
    }

    // Initial fetch
    fetchDraftedPokemon()

    // Debounce function for updates
    const debouncedFetch = () => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        fetchDraftedPokemon()
      }, 300) // 300ms debounce
    }

    // Subscribe to draft_pool changes (postgres_changes for better reliability)
    const channel = supabase
      ?.channel(`draft-pool:${seasonId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "draft_pool",
          filter: `season_id=eq.${seasonId}`,
        },
        debouncedFetch
      )
      .subscribe()

    return () => {
      mounted = false
      if (timeoutId) clearTimeout(timeoutId)
      channel?.unsubscribe()
    }
  }, [sessionId, seasonId, supabase])

  // Organize Pokemon by point tier
  const pokemonByTier: Record<number, Pokemon[]> = {}
  pokemon.forEach(p => {
    if (!pokemonByTier[p.point_value]) {
      pokemonByTier[p.point_value] = []
    }
    pokemonByTier[p.point_value].push(p)
  })

  // Filter Pokemon
  const filteredPokemon = pokemon.filter(p => {
    const matchesSearch = !searchQuery || p.pokemon_name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTier = selectedTier === "all" || p.point_value === selectedTier
    const matchesGeneration = selectedGeneration === "all" || (p.generation !== null && p.generation === selectedGeneration)
    return matchesSearch && matchesTier && matchesGeneration
  })

  // Debug logging
  useEffect(() => {
    if (pokemon.length > 0) {
      console.log("[DraftBoard] Pokemon state:", {
        total: pokemon.length,
        filtered: filteredPokemon.length,
        searchQuery,
        selectedTier,
        selectedGeneration,
        sample: pokemon.slice(0, 3).map(p => ({ name: p.pokemon_name, points: p.point_value, gen: p.generation }))
      })
    }
  }, [pokemon, filteredPokemon.length, searchQuery, selectedTier, selectedGeneration])

  // Get point tiers (20 to 1)
  const pointTiers = Array.from({ length: 20 }, (_, i) => 20 - i)

  // Fetch budget for confirmation dialog
  useEffect(() => {
    async function fetchBudget() {
      if (!currentTeamId) return

      try {
        const url = seasonId
          ? `/api/draft/team-status?team_id=${currentTeamId}&season_id=${seasonId}`
          : `/api/draft/team-status?team_id=${currentTeamId}`
        
        const response = await fetch(url)
        const data = await response.json()

        if (data.success && data.budget) {
          setBudget(data.budget)
        }
      } catch (error) {
        console.error("Error fetching budget:", error)
      }
    }

    fetchBudget()
  }, [currentTeamId, seasonId])

  const handlePokemonClick = (pokemonName: string) => {
    if (!currentTeamId) return

    const selected = pokemon.find(p => p.pokemon_name.toLowerCase() === pokemonName.toLowerCase())
    if (selected) {
      setSelectedPokemon(selected)
      setShowConfirmDialog(true)
    }
  }

  const handleConfirmPick = async () => {
    if (!currentTeamId || !selectedPokemon || !budget) return

    try {
      const response = await fetch("/api/draft/pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pokemon_name: selectedPokemon.pokemon_name.toLowerCase(),
          team_id: currentTeamId,
          season_id: seasonId,
        }),
      })

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || "Failed to make pick")
      }

      // Refresh data
      setShowConfirmDialog(false)
      setSelectedPokemon(null)
      // Budget and Pokemon will update via real-time subscription
    } catch (error) {
      console.error("Error making pick:", error)
      throw error // Re-throw so dialog can handle it
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="relative overflow-hidden">
        {isYourTurn && currentTeamId && (
          <BorderBeam 
            size={250}
            duration={12}
            borderWidth={2}
            colorFrom="#3b82f6"
            colorTo="#8b5cf6"
            className="opacity-100"
          />
        )}
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Draft Board</CardTitle>
            {currentTeamId && (
              <BudgetDisplay teamId={currentTeamId} seasonId={seasonId} />
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
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
        {pokemon.length === 0 ? (
          <div className="text-center py-8 space-y-4">
            <p className="text-muted-foreground">
              {loading ? "Loading Pokemon..." : "No Pokemon found. Check console for details."}
            </p>
            {!loading && (
              <div className="text-sm text-muted-foreground space-y-2">
                <p>Season ID: {seasonId || "Not provided"}</p>
                <p>Filters: Tier={selectedTier}, Gen={selectedGeneration}, Search="{searchQuery}"</p>
                <p className="text-xs">Check browser console for [DraftBoard] logs</p>
              </div>
            )}
          </div>
        ) : filteredPokemon.length === 0 ? (
          <div className="text-center py-8 space-y-4">
            <p className="text-muted-foreground">
              {pokemon.length} Pokemon loaded, but none match current filters.
            </p>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>Filters: Tier={selectedTier}, Gen={selectedGeneration}, Search="{searchQuery}"</p>
              <p>Try clearing filters to see all Pokemon.</p>
            </div>
          </div>
        ) : (
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
                  status: p.status || "available", // Include status field
                }))}
                draftedPokemon={draftedPokemon}
                isYourTurn={!!currentTeamId}
                onPick={handlePokemonClick}
              />
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>

    {/* Pick Confirmation Dialog */}
    {selectedPokemon && budget && (
      <PickConfirmationDialog
        pokemon={{
          name: selectedPokemon.pokemon_name,
          point_value: selectedPokemon.point_value,
          generation: selectedPokemon.generation || undefined,
          pokemon_id: selectedPokemon.pokemon_id || undefined,
        }}
        teamId={currentTeamId!}
        seasonId={seasonId}
        currentBudget={budget}
        open={showConfirmDialog}
        onConfirm={handleConfirmPick}
        onCancel={() => {
          setShowConfirmDialog(false)
          setSelectedPokemon(null)
        }}
      />
    )}
    </>
  )
}
