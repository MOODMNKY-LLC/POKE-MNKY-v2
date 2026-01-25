 "use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Trash2, Save, Sparkles, Loader2, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PokemonSprite } from "@/components/pokemon-sprite"
import { FixedSizeList as List } from "react-window"
import { getAllPokemonFromCache, searchPokemon, type PokemonDisplayData } from "@/lib/pokemon-utils"
import { generateShowdownTeamExport, downloadTeamFile } from "@/lib/team-builder-utils"
import { toast } from "sonner"
import { Toggle } from "@/components/ui/toggle"

export default function TeamBuilderPage() {
  const router = useRouter()
  const [teamName, setTeamName] = useState("")
  const [selectedPokemon, setSelectedPokemon] = useState<PokemonDisplayData[]>([])
  const [availablePokemon, setAvailablePokemon] = useState<PokemonDisplayData[]>([])
  const [budget, setBudget] = useState(120)
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generation, setGeneration] = useState(9)
  const [format, setFormat] = useState("ou")

  useEffect(() => {
    async function loadPokemon() {
      setLoading(true)
      const pokemon = await getAllPokemonFromCache()
      setAvailablePokemon(pokemon)
      setLoading(false)
    }
    loadPokemon()
  }, [])

  // Search Pokemon
  useEffect(() => {
    if (!searchQuery.trim()) {
      return
    }

    const timeoutId = setTimeout(async () => {
      const results = await searchPokemon(searchQuery)
      setAvailablePokemon(results)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  const spentPoints = selectedPokemon.reduce((sum, p) => sum + p.draft_cost, 0)
  const remainingBudget = budget - spentPoints

  const addPokemon = (pokemon: PokemonDisplayData) => {
    if (selectedPokemon.length >= 10) {
      alert("Maximum 10 Pokémon per team")
      return
    }

    if (spentPoints + pokemon.draft_cost > budget) {
      alert(`Not enough points! Need ${pokemon.draft_cost}, have ${remainingBudget}`)
      return
    }

    if (selectedPokemon.find((p) => p.pokemon_id === pokemon.pokemon_id)) {
      alert("Pokémon already in team")
      return
    }

    setSelectedPokemon([...selectedPokemon, pokemon])
  }

  const removePokemon = (pokemonId: number) => {
    setSelectedPokemon(selectedPokemon.filter((p) => p.pokemon_id !== pokemonId))
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

  const [density, setDensity] = useState<"compact" | "comfortable">("compact")
  const [pointFilter, setPointFilter] = useState<number | null>(null)

  const filteredAvailable = useMemo(() => {
    return availablePokemon.filter((p) => {
      if (selectedPokemon.find((sp) => sp.pokemon_id === p.pokemon_id)) return false
      if (pointFilter !== null && p.draft_cost !== pointFilter) return false
      if (searchQuery.trim()) return true
      return p.name.toLowerCase().includes(searchQuery.toLowerCase())
    })
  }, [availablePokemon, selectedPokemon, searchQuery, pointFilter])

  const pointValues = useMemo(() => {
    const vals = Array.from(new Set(availablePokemon.map((p) => p.draft_cost))).sort((a, b) => a - b)
    return vals
  }, [availablePokemon])

  const handleSaveTeam = async () => {
    if (selectedPokemon.length === 0) {
      toast.error('Please add at least one Pokemon to your team');
      return;
    }

    if (!teamName.trim()) {
      toast.error('Please enter a team name');
      return;
    }

    setSaving(true);

    try {
      // Generate Showdown team export
      const teamText = generateShowdownTeamExport(
        selectedPokemon,
        teamName.trim(),
        generation,
        format
      );

      // Save to database
      const response = await fetch('/api/showdown/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          team_text: teamText,
          team_name: teamName.trim(),
          tags: [format],
          source: 'builder'
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Team saved successfully!');
        // Broadcast the new team so other components can update optimistically
        try {
          if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
            const bc = new window.BroadcastChannel('showdown-teams')
            bc.postMessage({ type: 'team-created', team: data.team })
            bc.close()
          } else {
            localStorage.setItem('showdown_team_created', JSON.stringify({ team: data.team, ts: Date.now() }))
          }
        } catch (e) {
          // ignore broadcast failures
        }
        // We broadcast the new team; stay on builder so the user can continue editing
        // (other components will update via BroadcastChannel / storage)
      } else {
        toast.error(data.error || 'Failed to save team');
      }
    } catch (error) {
      console.error('Failed to save team:', error);
      toast.error('Failed to save team. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadTeam = () => {
    if (selectedPokemon.length === 0) {
      toast.error('Please add at least one Pokemon to your team');
      return;
    }

    const finalTeamName = teamName.trim() || 'My Team';
    const teamText = generateShowdownTeamExport(
      selectedPokemon,
      finalTeamName,
      generation,
      format
    );

    // Create filename with format: [gen9ou] Team Name.txt
    const filename = `[gen${generation}${format}] ${finalTeamName}.txt`;
    downloadTeamFile(teamText, filename);
    toast.success('Team downloaded!');
  };

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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label>Team Name</Label>
                <Input
                  placeholder="Enter team name..."
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                />
              </div>
              <div>
                <Label>Generation</Label>
                <Select value={generation.toString()} onValueChange={(v) => setGeneration(Number.parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="9">Gen 9</SelectItem>
                    <SelectItem value="8">Gen 8</SelectItem>
                    <SelectItem value="7">Gen 7</SelectItem>
                    <SelectItem value="6">Gen 6</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Format</Label>
                <Select value={format} onValueChange={setFormat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ou">OU</SelectItem>
                    <SelectItem value="uu">UU</SelectItem>
                    <SelectItem value="vgc">VGC</SelectItem>
                    <SelectItem value="lc">LC</SelectItem>
                    <SelectItem value="monotype">Monotype</SelectItem>
                    <SelectItem value="1v1">1v1</SelectItem>
                  </SelectContent>
                </Select>
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
                    <div key={pokemon.pokemon_id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <span className="text-sm text-muted-foreground w-6">{idx + 1}</span>
                      <PokemonSprite
                        name={pokemon.name}
                        pokemonId={pokemon.pokemon_id}
                        pokemon={pokemon}
                        size="sm"
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
                      <Badge variant="outline">{pokemon.draft_cost} pts</Badge>
                      <Button variant="ghost" size="icon" onClick={() => removePokemon(pokemon.pokemon_id)}>
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
              <Button 
                className="flex-1" 
                disabled={selectedPokemon.length === 0 || saving}
                onClick={handleSaveTeam}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Team
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                disabled={selectedPokemon.length === 0}
                onClick={handleDownloadTeam}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
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
          <CardHeader className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle>Available Pokémon</CardTitle>
              <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground mr-2">Density</span>
                <div className="flex items-center gap-2">
                  <button
                    className={`px-2 py-1 rounded ${density === 'comfortable' ? 'bg-primary text-white' : 'bg-transparent'}`}
                    onClick={() => setDensity('comfortable')}
                  >
                    Comfortable
                  </button>
                  <button
                    className={`px-2 py-1 rounded ${density === 'compact' ? 'bg-primary text-white' : 'bg-transparent'}`}
                    onClick={() => setDensity('compact')}
                  >
                    Compact
                  </button>
                </div>
              </div>
              <div className="w-full">
                <div className="flex gap-2 overflow-x-auto py-1">
                  <button
                    onClick={() => setPointFilter(null)}
                    className={`px-2 py-1 rounded ${pointFilter === null ? 'bg-primary text-white' : 'bg-transparent'}`}
                  >
                    All
                  </button>
                  {pointValues.map((pv) => (
                    <button
                      key={pv}
                      onClick={() => setPointFilter(pv)}
                      className={`px-2 py-1 rounded ${pointFilter === pv ? 'bg-primary text-white' : 'bg-transparent'}`}
                      title={`Points: ${pv}`}
                    >
                      {pv} ({availablePokemon.filter((p) => p.draft_cost === pv).length})
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredAvailable.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No Pokémon found</p>
                    <p className="text-sm mt-2">
                      {searchQuery.trim() ? "Try a different search" : "Loading from cache..."}
                    </p>
                  </div>
              ) : density === 'compact' ? (
                // Virtualized list for dense, performant rendering
                <div style={{ width: '100%' }}>
                  <List
                    height={600}
                    itemCount={filteredAvailable.length}
                    itemSize={56}
                    width="100%"
                  >
                    {({ index, style }) => {
                      const pokemon = filteredAvailable[index]
                      return (
                        <div style={style} key={pokemon.pokemon_id} className="px-2">
                          <button
                            onClick={() => addPokemon(pokemon)}
                            className="w-full text-left py-2 px-3 rounded-md border hover:bg-muted transition-colors flex items-center gap-3"
                          >
                            <PokemonSprite
                              name={pokemon.name}
                              pokemonId={pokemon.pokemon_id}
                              pokemon={pokemon}
                              size="xs"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <p className="font-semibold text-sm truncate capitalize">{pokemon.name}</p>
                                <Badge variant="outline" className="text-xs">{pokemon.draft_cost} pts</Badge>
                              </div>
                            </div>
                          </button>
                        </div>
                      )
                    }}
                  </List>
                </div>
              ) : (
                // Comfortable card grid view
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredAvailable.map((pokemon) => (
                    <button
                      key={pokemon.pokemon_id}
                      onClick={() => addPokemon(pokemon)}
                      className="w-full text-left p-3 rounded-lg border hover:bg-muted transition-colors flex items-center gap-3"
                    >
                      <PokemonSprite
                        name={pokemon.name}
                        pokemonId={pokemon.pokemon_id}
                        pokemon={pokemon}
                        size="sm"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold capitalize">{pokemon.name}</p>
                          <Badge variant="outline">{pokemon.draft_cost} pts</Badge>
                        </div>
                        <div className="flex gap-1">
                          {pokemon.types.map((type) => (
                            <Badge key={type} variant="secondary" className="text-xs capitalize">
                              {type}
                            </Badge>
                          ))}
                          {pokemon.tier && (
                            <Badge variant="outline" className="text-xs">
                              {pokemon.tier}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
