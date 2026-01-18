"use client"

import { useState, useEffect, useMemo } from "react"
import { Search, ImageIcon, ArrowRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PokemonSprite } from "@/components/pokemon-sprite"
import { EmptyState } from "@/components/ui/empty-state"
import { PokedexChat } from "@/components/ai/pokedex-chat"
import { getAllPokemonFromCache, searchPokemon, type PokemonDisplayData } from "@/lib/pokemon-utils"
import { PokemonClient } from "pokenode-ts"
import {
  getPokemonSpeciesData,
  getPokemonEvolutionChain,
  getGenderRatio,
  getFlavorText,
  organizePokemonMoves,
  type OrganizedMoves,
} from "@/lib/pokemon-details"
import {
  calculateAllStatRanges,
  getStatBarWidth,
  type PokemonStatRanges,
} from "@/lib/pokemon-stats"

const pokemonClient = new PokemonClient()

interface ExtendedPokemonData extends PokemonDisplayData {
  speciesData?: any
  evolutionChain?: Array<{ id: number; name: string }>
  statRanges?: PokemonStatRanges
  organizedMoves?: OrganizedMoves
  flavorText?: string
  height?: number // in decimeters
  weight?: number // in hectograms
}

export default function PokedexPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPokemon, setSelectedPokemon] = useState<ExtendedPokemonData | null>(null)
  const [pokemonList, setPokemonList] = useState<PokemonDisplayData[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [spriteMode, setSpriteMode] = useState<"front" | "back" | "shiny" | "artwork">("front")

  useEffect(() => {
    async function loadPokemon() {
      setLoading(true)
      const pokemon = await getAllPokemonFromCache(200)
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

  // Load comprehensive details when Pokemon is selected
  useEffect(() => {
    async function loadComprehensiveDetails() {
      if (!selectedPokemon) return

      setLoadingDetails(true)
      try {
        const pokemonId = selectedPokemon.pokemon_id

        // Fetch full Pokemon data (includes moves)
        const fullPokemon = await pokemonClient.getPokemonById(pokemonId)

        // Fetch species data (egg groups, gender ratio, flavor text)
        const speciesData = await getPokemonSpeciesData(pokemonId)

        // Fetch evolution chain
        const evolutionChain = await getPokemonEvolutionChain(pokemonId)

        // Calculate stat ranges
        const statRanges = selectedPokemon.base_stats
          ? calculateAllStatRanges(selectedPokemon.base_stats)
          : undefined

        // Organize moves
        const organizedMoves = fullPokemon.moves
          ? await organizePokemonMoves(fullPokemon.moves)
          : undefined

        // Get flavor text
        const flavorText = getFlavorText(speciesData)

        // Update selected Pokemon with comprehensive data
        setSelectedPokemon({
          ...selectedPokemon,
          speciesData,
          evolutionChain,
          statRanges,
          organizedMoves,
          flavorText,
          height: fullPokemon.height,
          weight: fullPokemon.weight,
        })
      } catch (error) {
        console.error("Error loading comprehensive details:", error)
      } finally {
        setLoadingDetails(false)
      }
    }

    loadComprehensiveDetails()
  }, [selectedPokemon?.pokemon_id])

  const filteredPokemon = searchQuery.trim()
    ? pokemonList
    : pokemonList.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const getTierColor = (tier: string | null) => {
    if (!tier) return "bg-muted text-muted-foreground"
    const colors: Record<string, string> = {
      Uber: "bg-red-500/10 text-red-400 border-red-500/20",
      OU: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      UU: "bg-green-500/10 text-green-400 border-green-500/20",
      RU: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
      NU: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      LC: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    }
    return colors[tier] || "bg-muted text-muted-foreground"
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      normal: "bg-gray-500/20 text-gray-700 dark:text-gray-300",
      fire: "bg-red-500/20 text-red-700 dark:text-red-300",
      water: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
      electric: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300",
      grass: "bg-green-500/20 text-green-700 dark:text-green-300",
      ice: "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300",
      fighting: "bg-orange-500/20 text-orange-700 dark:text-orange-300",
      poison: "bg-purple-500/20 text-purple-700 dark:text-purple-300",
      ground: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
      flying: "bg-indigo-500/20 text-indigo-700 dark:text-indigo-300",
      psychic: "bg-pink-500/20 text-pink-700 dark:text-pink-300",
      bug: "bg-lime-500/20 text-lime-700 dark:text-lime-300",
      rock: "bg-stone-500/20 text-stone-700 dark:text-stone-300",
      ghost: "bg-violet-500/20 text-violet-700 dark:text-violet-300",
      dragon: "bg-indigo-600/20 text-indigo-800 dark:text-indigo-400",
      dark: "bg-gray-800/20 text-gray-900 dark:text-gray-100",
      steel: "bg-slate-500/20 text-slate-700 dark:text-slate-300",
      fairy: "bg-rose-500/20 text-rose-700 dark:text-rose-300",
    }
    return colors[type.toLowerCase()] || "bg-muted text-muted-foreground"
  }

  const formatHeight = (height: number | undefined) => {
    if (!height) return "N/A"
    return `${(height / 10).toFixed(1)} m`
  }

  const formatWeight = (weight: number | undefined) => {
    if (!weight) return "N/A"
    return `${(weight / 10).toFixed(1)} kg`
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
        <p className="text-muted-foreground">Explore comprehensive Pokémon data modeled after Showdown's Pokédex</p>
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
        <div className="space-y-2 h-[calc(100vh-200px)] overflow-y-auto scrollbar-hide pr-2">
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
                onClick={() => setSelectedPokemon(pokemon as ExtendedPokemonData)}
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
        <div className="h-[calc(100vh-200px)] overflow-y-auto scrollbar-hide hide-scrollbar">
          {selectedPokemon ? (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="stats">Stats</TabsTrigger>
                <TabsTrigger value="moves">Moves</TabsTrigger>
                <TabsTrigger value="ai">AI</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-4">
                {/* Header Card */}
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-3xl capitalize">{selectedPokemon.name}</CardTitle>
                          <CardDescription className="text-lg">#{selectedPokemon.pokemon_id}</CardDescription>
                          {selectedPokemon.tier && (
                            <Badge className={getTierColor(selectedPokemon.tier)} variant="outline">
                              {selectedPokemon.tier}
                            </Badge>
                          )}
                        </div>
                        {selectedPokemon.flavorText && (
                          <p className="text-sm text-muted-foreground mt-2">{selectedPokemon.flavorText}</p>
                        )}
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
                    {/* Types */}
                    {selectedPokemon.types && selectedPokemon.types.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-2">Types</h3>
                        <div className="flex gap-2">
                          {selectedPokemon.types.map((type: string) => (
                            <Badge key={type} className={`${getTypeColor(type)} capitalize font-semibold`}>
                              {type.toUpperCase()}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Size */}
                    {(selectedPokemon.height !== undefined || selectedPokemon.weight !== undefined) && (
                      <div>
                        <h3 className="font-semibold mb-2">Size</h3>
                        <p className="text-sm">
                          {formatHeight(selectedPokemon.height)}, {formatWeight(selectedPokemon.weight)}
                        </p>
                      </div>
                    )}

                    {/* Abilities */}
                    {selectedPokemon.ability_details && selectedPokemon.ability_details.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-2">Abilities</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedPokemon.ability_details.map((ability, idx) => (
                            <span key={ability.name} className="text-sm">
                              <span className="capitalize">{ability.name.replace("-", " ")}</span>
                              {ability.is_hidden && <span className="text-muted-foreground"> (H)</span>}
                              {idx < selectedPokemon.ability_details!.length - 1 && (
                                <span className="text-muted-foreground"> | </span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Egg Groups & Gender */}
                    {selectedPokemon.speciesData && (
                      <div className="grid grid-cols-2 gap-4">
                        {selectedPokemon.speciesData.egg_groups && selectedPokemon.speciesData.egg_groups.length > 0 && (
                          <div>
                            <h3 className="font-semibold mb-2">Egg Groups</h3>
                            <div className="flex flex-wrap gap-2">
                              {selectedPokemon.speciesData.egg_groups.map((group: any, idx: number) => (
                                <Badge key={group.name} variant="secondary" className="capitalize">
                                  {group.name}
                                  {idx < selectedPokemon.speciesData.egg_groups.length - 1 && ","}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {selectedPokemon.speciesData.gender_rate !== undefined && (
                          <div>
                            <h3 className="font-semibold mb-2">Gender Ratio</h3>
                            <p className="text-sm">{getGenderRatio(selectedPokemon.speciesData.gender_rate)}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Evolution Chain */}
                    {selectedPokemon.evolutionChain && selectedPokemon.evolutionChain.length > 1 && (
                      <div>
                        <h3 className="font-semibold mb-2">Evolution Chain</h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          {selectedPokemon.evolutionChain.map((evo, idx) => (
                            <div key={evo.id} className="flex items-center gap-2">
                              <div
                                className={`cursor-pointer transition-all ${
                                  evo.id === selectedPokemon.pokemon_id
                                    ? "ring-2 ring-primary rounded-lg p-1"
                                    : "opacity-60 hover:opacity-100"
                                }`}
                                onClick={() => {
                                  const pokemon = pokemonList.find((p) => p.pokemon_id === evo.id)
                                  if (pokemon) setSelectedPokemon(pokemon as ExtendedPokemonData)
                                }}
                              >
                                <PokemonSprite
                                  name={evo.name}
                                  pokemonId={evo.id}
                                  size="sm"
                                  mode="front"
                                />
                                <p className="text-xs text-center capitalize mt-1">{evo.name}</p>
                              </div>
                              {idx < selectedPokemon.evolutionChain!.length - 1 && (
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="stats" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Base Stats</CardTitle>
                    <CardDescription>Stat values and ranges at level 100</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedPokemon.base_stats && selectedPokemon.statRanges && (
                      <>
                        {/* Stat Bars */}
                        <div className="space-y-3">
                          {Object.entries(selectedPokemon.base_stats).map(([stat, value]: [string, any]) => {
                            // Map stat names to statRanges keys
                            let rangeKey: keyof typeof selectedPokemon.statRanges = "hp"
                            if (stat === "hp") rangeKey = "hp"
                            else if (stat === "attack") rangeKey = "attack"
                            else if (stat === "defense") rangeKey = "defense"
                            else if (stat === "special_attack" || stat === "specialAttack") rangeKey = "specialAttack"
                            else if (stat === "special_defense" || stat === "specialDefense") rangeKey = "specialDefense"
                            else if (stat === "speed") rangeKey = "speed"
                            
                            const range = selectedPokemon.statRanges![rangeKey]
                            const barWidth = getStatBarWidth(value)

                            return (
                              <div key={stat} className="space-y-1">
                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-semibold w-24 capitalize">
                                    {stat === "hp" ? "HP" : stat.replace("_", " ").toUpperCase()}
                                  </span>
                                  <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                                    <div
                                      className="bg-primary h-full transition-all"
                                      style={{ width: `${barWidth}%` }}
                                    />
                                  </div>
                                  <span className="text-sm font-mono w-12 text-right font-semibold">{value}</span>
                                </div>
                                {range && (
                                  <div className="flex gap-4 text-xs text-muted-foreground ml-28">
                                    <span>Min-: {range.minMinus}</span>
                                    <span>Min: {range.min}</span>
                                    <span>Max: {range.max}</span>
                                    <span>Max+: {range.maxPlus}</span>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>

                        {/* Total */}
                        {selectedPokemon.statRanges.total && (
                          <div className="pt-4 border-t">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-semibold w-24">Total</span>
                              <div className="flex-1" />
                              <div className="flex gap-4 text-sm font-semibold">
                                <span>Min-: {selectedPokemon.statRanges.total.minMinus}</span>
                                <span>Min: {selectedPokemon.statRanges.total.min}</span>
                                <span>Max: {selectedPokemon.statRanges.total.max}</span>
                                <span>Max+: {selectedPokemon.statRanges.total.maxPlus}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="moves" className="space-y-4 mt-4">
                {loadingDetails ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <p className="text-muted-foreground">Loading moves...</p>
                    </CardContent>
                  </Card>
                ) : selectedPokemon.organizedMoves ? (
                  <Tabs defaultValue="level-up" className="w-full">
                    <TabsList>
                      <TabsTrigger value="level-up">Level-up</TabsTrigger>
                      <TabsTrigger value="tm-hm">TM/HM</TabsTrigger>
                      <TabsTrigger value="egg">Egg Moves</TabsTrigger>
                      <TabsTrigger value="tutor">Tutor</TabsTrigger>
                    </TabsList>

                    <TabsContent value="level-up" className="mt-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>Level-up Moves</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-hide hide-scrollbar">
                            {selectedPokemon.organizedMoves.levelUp.length > 0 ? (
                              selectedPokemon.organizedMoves.levelUp.map((moveEntry, idx) => (
                                <div
                                  key={`${moveEntry.moveName}-${idx}`}
                                  className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted/50"
                                >
                                  <span className="text-sm font-mono w-12">L{moveEntry.level}</span>
                                  <Badge className={getTypeColor(moveEntry.move?.type?.name || "normal")}>
                                    {moveEntry.move?.type?.name?.toUpperCase() || "NORMAL"}
                                  </Badge>
                                  <span className="font-semibold capitalize flex-1">{moveEntry.moveName.replace("-", " ")}</span>
                                  <div className="flex gap-4 text-xs text-muted-foreground">
                                    {moveEntry.move?.power !== null && <span>Power: {moveEntry.move.power}</span>}
                                    {moveEntry.move?.accuracy !== null && <span>Acc: {moveEntry.move.accuracy}%</span>}
                                    {moveEntry.move?.pp !== null && <span>PP: {moveEntry.move.pp}</span>}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-muted-foreground">No level-up moves</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="tm-hm" className="mt-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>TM/HM Moves</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-hide hide-scrollbar">
                            {selectedPokemon.organizedMoves.machine.length > 0 ? (
                              selectedPokemon.organizedMoves.machine.map((moveEntry, idx) => (
                                <div
                                  key={`${moveEntry.moveName}-${idx}`}
                                  className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted/50"
                                >
                                  <Badge className={getTypeColor(moveEntry.move?.type?.name || "normal")}>
                                    {moveEntry.move?.type?.name?.toUpperCase() || "NORMAL"}
                                  </Badge>
                                  <span className="font-semibold capitalize flex-1">{moveEntry.moveName.replace("-", " ")}</span>
                                  <div className="flex gap-4 text-xs text-muted-foreground">
                                    {moveEntry.move?.power !== null && <span>Power: {moveEntry.move.power}</span>}
                                    {moveEntry.move?.accuracy !== null && <span>Acc: {moveEntry.move.accuracy}%</span>}
                                    {moveEntry.move?.pp !== null && <span>PP: {moveEntry.move.pp}</span>}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-muted-foreground">No TM/HM moves</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="egg" className="mt-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>Egg Moves</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-hide hide-scrollbar">
                            {selectedPokemon.organizedMoves.egg.length > 0 ? (
                              selectedPokemon.organizedMoves.egg.map((moveEntry, idx) => (
                                <div
                                  key={`${moveEntry.moveName}-${idx}`}
                                  className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted/50"
                                >
                                  <Badge className={getTypeColor(moveEntry.move?.type?.name || "normal")}>
                                    {moveEntry.move?.type?.name?.toUpperCase() || "NORMAL"}
                                  </Badge>
                                  <span className="font-semibold capitalize flex-1">{moveEntry.moveName.replace("-", " ")}</span>
                                  <div className="flex gap-4 text-xs text-muted-foreground">
                                    {moveEntry.move?.power !== null && <span>Power: {moveEntry.move.power}</span>}
                                    {moveEntry.move?.accuracy !== null && <span>Acc: {moveEntry.move.accuracy}%</span>}
                                    {moveEntry.move?.pp !== null && <span>PP: {moveEntry.move.pp}</span>}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-muted-foreground">No egg moves</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="tutor" className="mt-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>Tutor Moves</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-hide hide-scrollbar">
                            {selectedPokemon.organizedMoves.tutor.length > 0 ? (
                              selectedPokemon.organizedMoves.tutor.map((moveEntry, idx) => (
                                <div
                                  key={`${moveEntry.moveName}-${idx}`}
                                  className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted/50"
                                >
                                  <Badge className={getTypeColor(moveEntry.move?.type?.name || "normal")}>
                                    {moveEntry.move?.type?.name?.toUpperCase() || "NORMAL"}
                                  </Badge>
                                  <span className="font-semibold capitalize flex-1">{moveEntry.moveName.replace("-", " ")}</span>
                                  <div className="flex gap-4 text-xs text-muted-foreground">
                                    {moveEntry.move?.power !== null && <span>Power: {moveEntry.move.power}</span>}
                                    {moveEntry.move?.accuracy !== null && <span>Acc: {moveEntry.move.accuracy}%</span>}
                                    {moveEntry.move?.pp !== null && <span>PP: {moveEntry.move.pp}</span>}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-muted-foreground">No tutor moves</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <p className="text-muted-foreground">No move data available</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="ai" className="space-y-4 mt-4">
                <div className="h-[600px] border rounded-lg overflow-hidden">
                  <PokedexChat
                    selectedPokemon={selectedPokemon?.name}
                    className="h-full"
                  />
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <Card className="h-full">
              <CardContent className="p-8">
                <EmptyState
                  title="Select a Pokémon"
                  description="Choose a Pokémon from the list to view detailed information, stats, moves, and AI-powered insights."
                  characterSize={80}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
