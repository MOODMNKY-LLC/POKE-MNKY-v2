"use client"

import { useState } from "react"
import { Trash2, Save, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const MOCK_AVAILABLE_POKEMON = [
  { id: 25, name: "Pikachu", types: ["electric"], tier: "RU", cost: 8 },
  { id: 94, name: "Gengar", types: ["ghost", "poison"], tier: "OU", cost: 15 },
  { id: 445, name: "Garchomp", types: ["dragon", "ground"], tier: "OU", cost: 16 },
  { id: 6, name: "Charizard", types: ["fire", "flying"], tier: "UU", cost: 12 },
  { id: 9, name: "Blastoise", types: ["water"], tier: "UU", cost: 11 },
  { id: 3, name: "Venusaur", types: ["grass", "poison"], tier: "OU", cost: 14 },
]

export default function TeamBuilderPage() {
  const [teamName, setTeamName] = useState("")
  const [selectedPokemon, setSelectedPokemon] = useState<any[]>([])
  const [budget, setBudget] = useState(120)
  const [searchQuery, setSearchQuery] = useState("")

  const spentPoints = selectedPokemon.reduce((sum, p) => sum + p.cost, 0)
  const remainingBudget = budget - spentPoints

  const addPokemon = (pokemon: any) => {
    if (selectedPokemon.length >= 10) {
      alert("Maximum 10 Pokémon per team")
      return
    }

    if (spentPoints + pokemon.cost > budget) {
      alert(`Not enough points! Need ${pokemon.cost}, have ${remainingBudget}`)
      return
    }

    if (selectedPokemon.find((p) => p.id === pokemon.id)) {
      alert("Pokémon already in team")
      return
    }

    setSelectedPokemon([...selectedPokemon, pokemon])
  }

  const removePokemon = (id: number) => {
    setSelectedPokemon(selectedPokemon.filter((p) => p.id !== id))
  }

  const getTypeAnalysis = () => {
    const types: Record<string, number> = {}
    selectedPokemon.forEach((p) => {
      p.types.forEach((t: string) => {
        types[t] = (types[t] || 0) + 1
      })
    })
    return types
  }

  const typeAnalysis = getTypeAnalysis()

  const filteredAvailable = MOCK_AVAILABLE_POKEMON.filter(
    (p) => !selectedPokemon.find((sp) => sp.id === p.id) && p.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Team Builder</h1>
        <p className="text-muted-foreground">Draft your team within the point budget and analyze type coverage.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Team Configuration */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Your Team</CardTitle>
            <CardDescription>
              {selectedPokemon.length}/10 Pokémon • {spentPoints}/{budget} points used
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Team Name</Label>
                <Input
                  placeholder="Enter team name..."
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                />
              </div>
              <div>
                <Label>Total Budget</Label>
                <Select value={budget.toString()} onValueChange={(v) => setBudget(Number.parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="100">100 points</SelectItem>
                    <SelectItem value="120">120 points</SelectItem>
                    <SelectItem value="150">150 points</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Budget Bar */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Budget Used</span>
                <span className={remainingBudget < 0 ? "text-destructive font-semibold" : "text-muted-foreground"}>
                  {remainingBudget} points remaining
                </span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    remainingBudget < 0 ? "bg-destructive" : "bg-primary"
                  }`}
                  style={{ width: `${Math.min((spentPoints / budget) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Selected Pokemon */}
            <div className="space-y-2">
              <Label>Selected Pokémon ({selectedPokemon.length})</Label>
              {selectedPokemon.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No Pokémon selected yet</p>
                  <p className="text-sm">Add Pokémon from the available list</p>
                </div>
              ) : (
                <div className="grid gap-2">
                  {selectedPokemon.map((pokemon, idx) => (
                    <div key={pokemon.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <span className="text-sm text-muted-foreground w-6">{idx + 1}</span>
                      <div className="flex-1">
                        <p className="font-semibold">{pokemon.name}</p>
                        <div className="flex gap-1 mt-1">
                          {pokemon.types.map((type: string) => (
                            <Badge key={type} variant="secondary" className="text-xs capitalize">
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Badge variant="outline">{pokemon.cost} pts</Badge>
                      <Button variant="ghost" size="icon" onClick={() => removePokemon(pokemon.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Type Coverage Analysis */}
            {selectedPokemon.length > 0 && (
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-3">Type Coverage</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(typeAnalysis).map(([type, count]) => (
                    <Badge key={type} className="capitalize">
                      {type} x{count}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button className="flex-1" disabled={selectedPokemon.length === 0}>
                <Save className="h-4 w-4 mr-2" />
                Save Team
              </Button>
              <Button variant="outline" disabled={selectedPokemon.length === 0}>
                <Sparkles className="h-4 w-4 mr-2" />
                Get AI Advice
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Available Pokemon */}
        <Card>
          <CardHeader>
            <CardTitle>Available Pokémon</CardTitle>
            <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredAvailable.map((pokemon) => (
                <button
                  key={pokemon.id}
                  onClick={() => addPokemon(pokemon)}
                  className="w-full text-left p-3 rounded-lg border hover:bg-muted transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold">{pokemon.name}</p>
                    <Badge variant="outline">{pokemon.cost} pts</Badge>
                  </div>
                  <div className="flex gap-1">
                    {pokemon.types.map((type) => (
                      <Badge key={type} variant="secondary" className="text-xs capitalize">
                        {type}
                      </Badge>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
