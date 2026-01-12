"use client"

import { useState, useEffect } from "react"
import { Search, Sparkles, ImageIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createBrowserClient } from "@/lib/supabase/client"

const supabase = createBrowserClient()

export default function PokedexPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPokemon, setSelectedPokemon] = useState<any>(null)
  const [pokemonList, setPokemonList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [aiQuestion, setAiQuestion] = useState("")
  const [aiResponse, setAiResponse] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [spriteMode, setSpriteMode] = useState<"front" | "back" | "shiny" | "artwork">("front")

  useEffect(() => {
    async function loadPokemon() {
      setLoading(true)
      const { data, error } = await supabase
        .from("pokemon_cache")
        .select("*")
        .order("pokemon_id", { ascending: true })
        .limit(50)

      if (error) {
        console.error("[v0] Failed to load Pokemon:", error)
      } else {
        setPokemonList(data || [])
      }
      setLoading(false)
    }

    loadPokemon()
  }, [])

  const filteredPokemon = pokemonList.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const handleAskAI = async () => {
    if (!aiQuestion.trim()) return

    setAiLoading(true)
    try {
      const response = await fetch("/api/ai/pokedex", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: aiQuestion }),
      })

      const data = await response.json()
      setAiResponse(data.answer || data.error || "No response")
    } catch (error) {
      setAiResponse("Error: " + (error instanceof Error ? error.message : "Unknown error"))
    } finally {
      setAiLoading(false)
    }
  }

  const getTierColor = (tier: string) => {
    const colors: Record<string, string> = {
      Uber: "bg-red-500/10 text-red-400 border-red-500/20",
      OU: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      UU: "bg-green-500/10 text-green-400 border-green-500/20",
      RU: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
      NU: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    }
    return colors[tier] || "bg-muted text-muted-foreground"
  }

  const getSpriteUrl = (pokemon: any) => {
    if (!pokemon.sprites) return pokemon.sprite_url || "/placeholder.svg?height=96&width=96"

    switch (spriteMode) {
      case "back":
        return pokemon.sprites.back_default || pokemon.sprites.front_default
      case "shiny":
        return pokemon.sprites.front_shiny || pokemon.sprites.front_default
      case "artwork":
        return pokemon.sprites.official_artwork || pokemon.sprites.front_default
      default:
        return pokemon.sprites.front_default || pokemon.sprite_url
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <p className="text-muted-foreground">Loading Pokédex...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Pokédex</h1>
        <p className="text-muted-foreground">
          Browse Pokémon data, check stats, and get AI-powered insights for your team building.
        </p>
        {pokemonList.length === 0 && (
          <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              ⚠️ No Pokémon data found. Run the pre-cache script to populate the database.
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Pokemon List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Search Pokémon</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredPokemon.map((pokemon) => (
                <button
                  key={pokemon.pokemon_id}
                  onClick={() => setSelectedPokemon(pokemon)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedPokemon?.pokemon_id === pokemon.pokemon_id
                      ? "bg-primary/10 border-primary"
                      : "hover:bg-muted border-border"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={getSpriteUrl(pokemon) || "/placeholder.svg"}
                      alt={pokemon.name}
                      className="h-12 w-12 rounded bg-muted"
                    />
                    <div className="flex-1">
                      <p className="font-semibold capitalize">{pokemon.name}</p>
                      <div className="flex gap-1 mt-1">
                        {pokemon.types.map((type: string) => (
                          <Badge key={type} variant="secondary" className="text-xs capitalize">
                            {type}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Badge className={getTierColor(pokemon.tier)}>{pokemon.tier}</Badge>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pokemon Details */}
        <Card className="lg:col-span-2">
          <Tabs defaultValue="stats">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="capitalize text-3xl">{selectedPokemon?.name || "Select a Pokémon"}</CardTitle>
                  {selectedPokemon && (
                    <CardDescription className="mt-2">
                      Draft Cost: {selectedPokemon.draft_cost} points • Tier: {selectedPokemon.tier} • Gen{" "}
                      {selectedPokemon.generation || "?"}
                    </CardDescription>
                  )}
                </div>
                {selectedPokemon && (
                  <div className="flex flex-col items-end gap-2">
                    <img
                      src={getSpriteUrl(selectedPokemon) || "/placeholder.svg"}
                      alt={selectedPokemon.name}
                      className="h-24 w-24 rounded-lg bg-muted"
                    />
                    {selectedPokemon.sprites && (
                      <Select value={spriteMode} onValueChange={(v: any) => setSpriteMode(v)}>
                        <SelectTrigger className="w-[140px] h-8 text-xs">
                          <ImageIcon className="h-3 w-3 mr-1" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="front">Front</SelectItem>
                          <SelectItem value="back">Back</SelectItem>
                          <SelectItem value="shiny">Shiny</SelectItem>
                          <SelectItem value="artwork">Artwork</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}
              </div>
              {selectedPokemon && (
                <TabsList className="mt-4">
                  <TabsTrigger value="stats">Stats</TabsTrigger>
                  <TabsTrigger value="abilities">Abilities</TabsTrigger>
                  <TabsTrigger value="moves">Moves</TabsTrigger>
                  <TabsTrigger value="ai">
                    <Sparkles className="h-4 w-4 mr-2" />
                    AI Assistant
                  </TabsTrigger>
                </TabsList>
              )}
            </CardHeader>

            {selectedPokemon && (
              <CardContent>
                <TabsContent value="stats" className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-3">Base Stats</h3>
                    <div className="space-y-3">
                      {Object.entries(selectedPokemon.base_stats).map(([stat, value]) => (
                        <div key={stat}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="capitalize">{stat.replace("_", " ")}</span>
                            <span className="font-semibold">{value as number}</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${Math.min(((value as number) / 255) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Base Stat Total:{" "}
                        <span className="font-semibold text-foreground">
                          {Object.values(selectedPokemon.base_stats).reduce((a, b) => a + b, 0)}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Types</h3>
                    <div className="flex gap-2">
                      {selectedPokemon.types.map((type: string) => (
                        <Badge key={type} className="capitalize">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="abilities">
                  <div className="space-y-3">
                    <h3 className="font-semibold mb-3">Abilities</h3>
                    {selectedPokemon.ability_details && selectedPokemon.ability_details.length > 0
                      ? selectedPokemon.ability_details.map((ability: any) => (
                          <div key={ability.name} className="p-3 bg-muted rounded-lg space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold capitalize">{ability.name.replace("-", " ")}</p>
                              {ability.is_hidden && (
                                <Badge variant="outline" className="text-xs">
                                  Hidden
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{ability.effect}</p>
                          </div>
                        ))
                      : selectedPokemon.abilities.map((ability: string) => (
                          <div key={ability} className="p-3 bg-muted rounded-lg">
                            <p className="font-semibold capitalize">{ability.replace("-", " ")}</p>
                          </div>
                        ))}
                  </div>
                </TabsContent>

                <TabsContent value="moves">
                  <div className="space-y-3">
                    <h3 className="font-semibold mb-3">Top Competitive Moves</h3>
                    {selectedPokemon.move_details && selectedPokemon.move_details.length > 0 ? (
                      <div className="space-y-2">
                        {selectedPokemon.move_details.slice(0, 10).map((move: any) => (
                          <div key={move.name} className="p-3 bg-muted rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-semibold capitalize">{move.name.replace("-", " ")}</p>
                              <div className="flex gap-2">
                                <Badge variant="outline" className="capitalize text-xs">
                                  {move.type}
                                </Badge>
                                <Badge variant="secondary" className="capitalize text-xs">
                                  {move.category}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex gap-4 text-xs text-muted-foreground">
                              {move.power && <span>Power: {move.power}</span>}
                              {move.accuracy && <span>Acc: {move.accuracy}%</span>}
                              <span>PP: {move.pp}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{move.effect}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Move details not cached. Extended data will be loaded on next fetch.
                      </p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="ai">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Ask AI about {selectedPokemon.name}</label>
                      <Textarea
                        placeholder={`e.g., "What's a good moveset for ${selectedPokemon.name} in Gen 9 OU?"`}
                        value={aiQuestion}
                        onChange={(e) => setAiQuestion(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <Button onClick={handleAskAI} disabled={aiLoading} className="w-full">
                      <Sparkles className="h-4 w-4 mr-2" />
                      {aiLoading ? "Thinking..." : "Ask AI"}
                    </Button>

                    {aiResponse && (
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm whitespace-pre-wrap">{aiResponse}</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </CardContent>
            )}
          </Tabs>
        </Card>
      </div>
    </div>
  )
}
