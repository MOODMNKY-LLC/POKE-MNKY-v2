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
import { PokemonSprite } from "@/components/pokemon-sprite"
import { getAllPokemonFromCache, searchPokemon, type PokemonDisplayData } from "@/lib/pokemon-utils"

export default function PokedexPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPokemon, setSelectedPokemon] = useState<PokemonDisplayData | null>(null)
  const [pokemonList, setPokemonList] = useState<PokemonDisplayData[]>([])
  const [loading, setLoading] = useState(true)
  const [aiQuestion, setAiQuestion] = useState("")
  const [aiResponse, setAiResponse] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [spriteMode, setSpriteMode] = useState<"front" | "back" | "shiny" | "artwork">("front")

  useEffect(() => {
    async function loadPokemon() {
      setLoading(true)
      // Load all Pokemon from cache (not just 50)
      const pokemon = await getAllPokemonFromCache()
      setPokemonList(pokemon)
      setLoading(false)
    }

    loadPokemon()
  }, [])

  // Search with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      return
    }

    const timeoutId = setTimeout(async () => {
      const results = await searchPokemon(searchQuery)
      setPokemonList(results)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  const filteredPokemon = searchQuery.trim()
    ? pokemonList
    : pokemonList.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))

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

  const getTierColor = (tier: string | null) => {
    if (!tier) return "bg-muted text-muted-foreground"
    const colors: Record<string, string> = {
      Uber: "bg-red-500/10 text-red-400 border-red-500/20",
      OU: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      UU: "bg-green-500/10 text-green-400 border-green-500/20",
      RU: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
      NU: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    }
    return colors[tier] || "bg-muted text-muted-foreground"
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
        <h1 className="text-4xl font-bold mb-2">
          <span className="text-pokemon">Pokédex</span>
        </h1>
        <p className="text-muted-foreground">Explore competitive Pokémon data with AI-powered insights</p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search Pokémon..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={spriteMode} onValueChange={(v: any) => setSpriteMode(v)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <ImageIcon className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="front">Front Sprite</SelectItem>
            <SelectItem value="back">Back Sprite</SelectItem>
            <SelectItem value="shiny">Shiny</SelectItem>
            <SelectItem value="artwork">Official Art</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid lg:grid-cols-[300px_1fr] gap-6">
        {/* Pokemon List */}
        <div className="space-y-2 h-[600px] overflow-y-auto pr-2">
          {filteredPokemon.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No Pokémon found</p>
              <p className="text-sm mt-2">Run pre-cache script or adjust search</p>
            </div>
          ) : (
            filteredPokemon.map((pokemon) => (
              <Card
                key={pokemon.pokemon_id}
                className={`cursor-pointer transition-all hover:border-primary ${
                  selectedPokemon?.pokemon_id === pokemon.pokemon_id ? "border-primary bg-primary/5" : ""
                }`}
                onClick={() => setSelectedPokemon(pokemon)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <PokemonSprite
                    name={pokemon.name}
                    pokemonId={pokemon.pokemon_id}
                    pokemon={pokemon}
                    size="sm"
                    mode={spriteMode}
                  />
                  <div className="flex-1">
                    <p className="font-semibold capitalize">{pokemon.name}</p>
                    <p className="text-xs text-muted-foreground">#{pokemon.pokemon_id}</p>
                  </div>
                  {pokemon.tier && (
                    <Badge className={getTierColor(pokemon.tier)} variant="outline">
                      {pokemon.tier}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Pokemon Details */}
        <div>
          {selectedPokemon ? (
            <Tabs defaultValue="stats" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="stats">Stats</TabsTrigger>
                <TabsTrigger value="abilities">Abilities</TabsTrigger>
                <TabsTrigger value="ai">AI Assistant</TabsTrigger>
              </TabsList>

              <TabsContent value="stats" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-3xl capitalize">{selectedPokemon.name}</CardTitle>
                        <CardDescription>#{selectedPokemon.pokemon_id}</CardDescription>
                      </div>
                      <PokemonSprite
                        name={selectedPokemon.name}
                        pokemonId={selectedPokemon.pokemon_id}
                        pokemon={selectedPokemon}
                        size="lg"
                        mode={spriteMode}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedPokemon.types && selectedPokemon.types.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-2">Types</h3>
                        <div className="flex gap-2">
                          {selectedPokemon.types.map((type: string) => (
                            <Badge key={type} variant="secondary" className="capitalize">
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedPokemon.base_stats && (
                      <div>
                        <h3 className="font-semibold mb-2">Base Stats</h3>
                        <div className="space-y-2">
                          {Object.entries(selectedPokemon.base_stats).map(([stat, value]: [string, any]) => (
                            <div key={stat} className="flex items-center gap-3">
                              <span className="text-sm w-20 capitalize">{stat.replace("_", " ")}</span>
                              <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-primary h-full transition-all"
                                  style={{ width: `${(value / 255) * 100}%` }}
                                />
                              </div>
                              <span className="text-sm font-mono w-8 text-right">{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedPokemon.tier && (
                      <div>
                        <h3 className="font-semibold mb-2">Competitive Tier</h3>
                        <Badge className={getTierColor(selectedPokemon.tier)} variant="outline">
                          {selectedPokemon.tier}
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="abilities" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Abilities</CardTitle>
                    <CardDescription>Available abilities for {selectedPokemon.name}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedPokemon.ability_details && selectedPokemon.ability_details.length > 0 ? (
                      <div className="space-y-3">
                        {selectedPokemon.ability_details.map((ability) => (
                          <div key={ability.name} className="p-3 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold capitalize">{ability.name.replace("-", " ")}</h4>
                              {ability.is_hidden && <Badge variant="secondary">Hidden</Badge>}
                            </div>
                            {ability.effect && <p className="text-sm text-muted-foreground">{ability.effect}</p>}
                          </div>
                        ))}
                      </div>
                    ) : selectedPokemon.abilities && selectedPokemon.abilities.length > 0 ? (
                      <div className="space-y-2">
                        {selectedPokemon.abilities.map((ability: string) => (
                          <Badge key={ability} variant="secondary" className="capitalize">
                            {ability.replace("-", " ")}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No ability data available</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="ai" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      AI Pokémon Assistant
                    </CardTitle>
                    <CardDescription>
                      Ask questions about {selectedPokemon.name} and competitive strategy
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Textarea
                        placeholder={`What are the best moves for ${selectedPokemon.name}?`}
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
                      <Card className="bg-muted/50">
                        <CardContent className="pt-6">
                          <p className="text-sm whitespace-pre-wrap">{aiResponse}</p>
                        </CardContent>
                      </Card>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card className="h-[600px] flex items-center justify-center">
              <CardContent className="text-center text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a Pokémon to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
