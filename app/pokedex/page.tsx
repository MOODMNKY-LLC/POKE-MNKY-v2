"use client"

import { useState } from "react"
import { Search, Sparkles } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

const USE_MOCK_DATA = true

const MOCK_POKEMON = [
  {
    pokemon_id: 25,
    name: "pikachu",
    types: ["electric"],
    base_stats: { hp: 35, attack: 55, defense: 40, special_attack: 50, special_defense: 50, speed: 90 },
    abilities: ["static", "lightning-rod"],
    tier: "RU",
    draft_cost: 8,
    sprite_url: "/placeholder.svg?height=96&width=96",
  },
  {
    pokemon_id: 94,
    name: "gengar",
    types: ["ghost", "poison"],
    base_stats: { hp: 60, attack: 65, defense: 60, special_attack: 130, special_defense: 75, speed: 110 },
    abilities: ["cursed-body"],
    tier: "OU",
    draft_cost: 15,
    sprite_url: "/placeholder.svg?height=96&width=96",
  },
  {
    pokemon_id: 445,
    name: "garchomp",
    types: ["dragon", "ground"],
    base_stats: { hp: 108, attack: 130, defense: 95, special_attack: 80, special_defense: 85, speed: 102 },
    abilities: ["sand-veil", "rough-skin"],
    tier: "OU",
    draft_cost: 16,
    sprite_url: "/placeholder.svg?height=96&width=96",
  },
]

export default function PokedexPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPokemon, setSelectedPokemon] = useState<any>(null)
  const [aiQuestion, setAiQuestion] = useState("")
  const [aiResponse, setAiResponse] = useState("")
  const [loading, setLoading] = useState(false)

  const filteredPokemon = MOCK_POKEMON.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const handleAskAI = async () => {
    if (!aiQuestion.trim()) return

    setLoading(true)
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
      setLoading(false)
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

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Pokédex</h1>
        <p className="text-muted-foreground">
          Browse Pokémon data, check stats, and get AI-powered insights for your team building.
        </p>
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
            <div className="space-y-2">
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
                      src={pokemon.sprite_url || "/placeholder.svg"}
                      alt={pokemon.name}
                      className="h-12 w-12 rounded bg-muted"
                    />
                    <div className="flex-1">
                      <p className="font-semibold capitalize">{pokemon.name}</p>
                      <div className="flex gap-1 mt-1">
                        {pokemon.types.map((type) => (
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
                      Draft Cost: {selectedPokemon.draft_cost} points • Tier: {selectedPokemon.tier}
                    </CardDescription>
                  )}
                </div>
                {selectedPokemon && (
                  <img
                    src={selectedPokemon.sprite_url || "/placeholder.svg"}
                    alt={selectedPokemon.name}
                    className="h-24 w-24 rounded-lg bg-muted"
                  />
                )}
              </div>
              {selectedPokemon && (
                <TabsList className="mt-4">
                  <TabsTrigger value="stats">Stats</TabsTrigger>
                  <TabsTrigger value="abilities">Abilities</TabsTrigger>
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
                  <div className="space-y-2">
                    <h3 className="font-semibold mb-3">Abilities</h3>
                    {selectedPokemon.abilities.map((ability: string) => (
                      <div key={ability} className="p-3 bg-muted rounded-lg">
                        <p className="font-semibold capitalize">{ability.replace("-", " ")}</p>
                      </div>
                    ))}
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
                    <Button onClick={handleAskAI} disabled={loading} className="w-full">
                      <Sparkles className="h-4 w-4 mr-2" />
                      {loading ? "Thinking..." : "Ask AI"}
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
