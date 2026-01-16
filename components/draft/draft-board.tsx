"use client"

import { useEffect, useState } from "react"
import { PointTierSection } from "./point-tier-section"
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
}

interface DraftBoardProps {
  sessionId: string
  currentTeamId: string | null
  seasonId: string
}

export function DraftBoard({ sessionId, currentTeamId, seasonId }: DraftBoardProps) {
  const [pokemon, setPokemon] = useState<Pokemon[]>([])
  const [draftedPokemon, setDraftedPokemon] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTier, setSelectedTier] = useState<number | "all">("all")
  const [selectedGeneration, setSelectedGeneration] = useState<number | "all">("all")
  const [supabase] = useState(() => {
    if (typeof window === 'undefined') return null as any
    return createClient()
  })

  // Fetch available Pokemon
  useEffect(() => {
    async function fetchPokemon() {
      try {
        setLoading(true)
        const response = await fetch(`/api/draft/available?limit=500`)
        const data = await response.json()
        
        if (data.success) {
          setPokemon(data.pokemon || [])
        }
      } catch (error) {
        console.error("Error fetching Pokemon:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPokemon()
  }, [])

  // Fetch drafted Pokemon
  useEffect(() => {
    async function fetchDraftedPokemon() {
      // Get all teams for this season, then get their rosters
      const { data: teams } = await supabase
        .from("teams")
        .select("id")
        .eq("season_id", seasonId)

      if (!teams || teams.length === 0) {
        setDraftedPokemon([])
        return
      }

      const teamIds = teams.map(t => t.id)
      
      // Get drafted Pokemon names from team_rosters via pokemon table
      const { data } = await supabase
        .from("team_rosters")
        .select(`
          pokemon:pokemon_id (
            name
          )
        `)
        .in("team_id", teamIds)
        .not("pokemon_id", "is", null)

      if (data) {
        const draftedNames = data
          .map(r => (r.pokemon as any)?.name)
          .filter(Boolean)
          .map((name: string) => name.toLowerCase())
        setDraftedPokemon(draftedNames)
      }
    }

    fetchDraftedPokemon()

    // Subscribe to new picks
    const channel = supabase
      .channel(`draft:${sessionId}:picks`)
      .on(
        "broadcast",
        { event: "INSERT" },
        () => {
          fetchDraftedPokemon()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
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

  // Get point tiers (20 to 1)
  const pointTiers = Array.from({ length: 20 }, (_, i) => 20 - i)

  const handlePick = async (pokemonName: string) => {
    if (!currentTeamId) return

    try {
      const response = await fetch("/api/draft/pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pokemon_name: pokemonName.toLowerCase(),
          team_id: currentTeamId,
          season_id: seasonId,
        }),
      })

      const data = await response.json()
      if (!data.success) {
        alert(data.error || "Failed to make pick")
      }
    } catch (error) {
      console.error("Error making pick:", error)
      alert("Failed to make pick")
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
    <Card>
      <CardHeader>
        <CardTitle>Draft Board</CardTitle>
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
              }))}
              draftedPokemon={draftedPokemon}
              isYourTurn={!!currentTeamId}
              onPick={handlePick}
            />
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
