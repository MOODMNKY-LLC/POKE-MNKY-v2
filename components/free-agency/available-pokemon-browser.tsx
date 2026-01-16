"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface AvailablePokemonBrowserProps {
  seasonId: string
  onSelectPokemon?: (pokemonId: string) => void
}

export function AvailablePokemonBrowser({
  seasonId,
  onSelectPokemon,
}: AvailablePokemonBrowserProps) {
  const [pokemon, setPokemon] = useState<Array<{
    pokemon_id: string
    pokemon_name: string
    point_value: number
    generation: number | null
  }>>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [minPoints, setMinPoints] = useState<number | undefined>()
  const [maxPoints, setMaxPoints] = useState<number | undefined>()
  const [generation, setGeneration] = useState<number | undefined>()

  useEffect(() => {
    loadPokemon()
  }, [seasonId, search, minPoints, maxPoints, generation])

  const loadPokemon = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        season_id: seasonId,
        limit: "200",
      })
      if (search) params.append("search", search)
      if (minPoints) params.append("min_points", minPoints.toString())
      if (maxPoints) params.append("max_points", maxPoints.toString())
      if (generation) params.append("generation", generation.toString())

      const response = await fetch(`/api/free-agency/available?${params}`)
      const data = await response.json()

      if (data.success) {
        setPokemon(data.pokemon || [])
      }
    } catch (error) {
      console.error("Error loading available Pokemon:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Available Pokemon</CardTitle>
        <CardDescription>Browse Pokemon available for free agency</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label>Search</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pokemon name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Min Points</Label>
            <Input
              type="number"
              placeholder="12"
              value={minPoints || ""}
              onChange={(e) =>
                setMinPoints(e.target.value ? parseInt(e.target.value) : undefined)
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Max Points</Label>
            <Input
              type="number"
              placeholder="20"
              value={maxPoints || ""}
              onChange={(e) =>
                setMaxPoints(e.target.value ? parseInt(e.target.value) : undefined)
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Generation</Label>
            <Select
              value={generation?.toString() || ""}
              onValueChange={(value) =>
                setGeneration(value ? parseInt(value) : undefined)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Generations</SelectItem>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((gen) => (
                  <SelectItem key={gen} value={gen.toString()}>
                    Generation {gen}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Pokemon Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {pokemon.map((p) => (
                <div
                  key={p.pokemon_id}
                  className={`p-3 border rounded-lg cursor-pointer hover:bg-muted transition-colors ${
                    onSelectPokemon ? "" : "cursor-default"
                  }`}
                  onClick={() => onSelectPokemon?.(p.pokemon_id)}
                >
                  <div className="font-medium text-sm">{p.pokemon_name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {p.point_value}pts
                    </Badge>
                    {p.generation && (
                      <Badge variant="outline" className="text-xs">
                        Gen {p.generation}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {pokemon.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No Pokemon available matching your filters
              </div>
            )}
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
