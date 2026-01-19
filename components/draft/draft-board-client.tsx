"use client"

import { useEffect, useState, useTransition } from "react"
import { PointTierSection } from "./point-tier-section"
import { BudgetDisplay } from "./budget-display"
import { PickConfirmationDialog } from "./pick-confirmation-dialog"
import { BorderBeam } from "@/components/ui/border-beam"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"

interface Pokemon {
  pokemon_name: string
  point_value: number
  generation: number | null
  pokemon_id: number | null
  status?: "available" | "drafted" | "banned" | "unavailable"
}

interface DraftBoardClientProps {
  sessionId: string
  currentTeamId: string | null
  seasonId: string
  isYourTurn?: boolean
  initialPokemon: Pokemon[]
  initialDraftedPokemon: string[]
  initialBudget: { total: number; spent: number; remaining: number } | null
}

/**
 * Client Component: DraftBoardClient
 * Handles all interactive features (filters, search, picking, real-time updates)
 */
export function DraftBoardClient({
  sessionId,
  currentTeamId,
  seasonId,
  isYourTurn = false,
  initialPokemon,
  initialDraftedPokemon,
  initialBudget,
}: DraftBoardClientProps) {
  const [pokemon, setPokemon] = useState<Pokemon[]>(initialPokemon)
  const [draftedPokemon, setDraftedPokemon] = useState<string[]>(initialDraftedPokemon)
  const [loading, setLoading] = useState(initialPokemon.length === 0)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTier, setSelectedTier] = useState<number | "all">("all")
  const [selectedGeneration, setSelectedGeneration] = useState<number | "all">("all")
  const [selectedPokemon, setSelectedPokemon] = useState<Pokemon | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [budget, setBudget] = useState<{ total: number; spent: number; remaining: number } | null>(initialBudget)
  const [supabase] = useState(() => {
    if (typeof window === 'undefined') return null as any
    return createClient()
  })

  // Fetch initial data if not provided (client-side fallback)
  useEffect(() => {
    async function fetchInitialData() {
      if (initialPokemon.length > 0) {
        // Data already provided, skip fetch
        setLoading(false)
        return
      }

      if (!seasonId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        
        // Fetch Pokemon
        const pokemonResponse = await fetch(`/api/draft/available?limit=500&season_id=${seasonId}`)
        const pokemonData = await pokemonResponse.json()
        
        if (pokemonData.success) {
          setPokemon(pokemonData.pokemon || [])
        }

        // Fetch drafted Pokemon
        if (supabase) {
          const { data: draftedData } = await supabase
            .from("draft_pool")
            .select("pokemon_name")
            .eq("season_id", seasonId)
            .eq("status", "drafted")

          setDraftedPokemon(draftedData?.map(p => p.pokemon_name.toLowerCase()) || [])
        }

        // Fetch budget
        if (currentTeamId && supabase) {
          const { data: budgetData } = await supabase
            .from("draft_budgets")
            .select("total_points, spent_points, remaining_points")
            .eq("team_id", currentTeamId)
            .eq("season_id", seasonId)
            .single()

          if (budgetData) {
            setBudget({
              total: budgetData.total_points,
              spent: budgetData.spent_points,
              remaining: budgetData.remaining_points,
            })
          }
        }
      } catch (error) {
        console.error("[DraftBoardClient] Error fetching initial data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchInitialData()
  }, [seasonId, currentTeamId, initialPokemon.length, supabase])

  // Set up real-time subscription for drafted Pokemon updates
  useEffect(() => {
    if (!seasonId || !supabase) return

    const channel = supabase
      .channel(`draft-pool:${seasonId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "draft_pool",
          filter: `season_id=eq.${seasonId}`,
        },
        (payload) => {
          const newRecord = payload.new as any
          if (newRecord.status === "drafted") {
            setDraftedPokemon((prev) => {
              const pokemonName = newRecord.pokemon_name.toLowerCase()
              if (!prev.includes(pokemonName)) {
                return [...prev, pokemonName]
              }
              return prev
            })
            // Update Pokemon status in local state
            setPokemon((prev) =>
              prev.map((p) =>
                p.pokemon_name.toLowerCase() === newRecord.pokemon_name.toLowerCase()
                  ? { ...p, status: "drafted" as const }
                  : p
              )
            )
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [seasonId, supabase])

  // Set up real-time subscription for budget updates
  useEffect(() => {
    if (!currentTeamId || !seasonId || !supabase) return

    const channel = supabase
      .channel(`budget:${currentTeamId}:${seasonId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "draft_budgets",
          filter: `team_id=eq.${currentTeamId}`,
        },
        (payload) => {
          const newRecord = payload.new as any
          if (newRecord.season_id === seasonId) {
            setBudget({
              total: newRecord.total_points,
              spent: newRecord.spent_points,
              remaining: newRecord.remaining_points,
            })
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [currentTeamId, seasonId, supabase])

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

  // Get point tiers (20 to 1)
  const pointTiers = Array.from({ length: 20 }, (_, i) => 20 - i)

  const handlePokemonClick = (pokemonName: string) => {
    if (!currentTeamId || !isYourTurn) return

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

      // Close dialog - real-time subscription will update state
      setShowConfirmDialog(false)
      setSelectedPokemon(null)
    } catch (error) {
      console.error("Error making pick:", error)
      throw error // Re-throw so dialog can handle it
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 w-full bg-muted animate-pulse rounded" />
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
                No Pokemon found. Check console for details.
              </p>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>Season ID: {seasonId || "Not provided"}</p>
                <p>Filters: Tier={selectedTier}, Gen={selectedGeneration}, Search="{searchQuery}"</p>
                <p className="text-xs">Check browser console for [DraftBoard] logs</p>
              </div>
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
                      status: p.status || "available",
                    }))}
                    draftedPokemon={draftedPokemon}
                    isYourTurn={isYourTurn && !!currentTeamId}
                    onPick={handlePokemonClick}
                  />
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

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
