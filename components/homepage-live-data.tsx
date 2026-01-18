"use client"

/**
 * Homepage Live Data Component
 * 
 * Client-side component that loads league data on-demand.
 * Prevents unnecessary database queries on every page load.
 */

import { useState } from "react"
import { Trophy, Sparkles, RefreshCw, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PokeballIcon } from "@/components/ui/pokeball-icon"
import { PokemonSprite } from "@/components/pokemon-sprite"
import { EmptyState } from "@/components/ui/empty-state"

interface Team {
  id: string
  name: string
  wins: number
  losses: number
  differential: number
  coach_name: string
  avatar_url?: string
}

interface TopPokemon {
  pokemon_name: string
  kos_scored: number
  times_used: number
  pokemon?: {
    id: number
    name: string
    type1?: string
    type2?: string
  }
}

interface LiveDataResponse {
  teams: Team[]
  teamCount: number
  topPokemon: TopPokemon[]
}

export function HomepageLiveData() {
  const [data, setData] = useState<LiveDataResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasLoaded, setHasLoaded] = useState(false)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch("/api/homepage/live-data", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to load data: ${response.statusText}`)
      }

      const result = await response.json()
      setData(result)
      setHasLoaded(true)
    } catch (err: any) {
      setError(err.message || "Failed to load live data")
      console.error("[HomepageLiveData] Error loading data:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="w-full border-t border-border/40 bg-muted/20 py-12 md:py-20 lg:py-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 lg:items-start">
          {/* Current Standings */}
          <Card className="border-2 h-full flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  Current Standings
                </CardTitle>
                {data && (
                  <Badge variant="outline">{data.teamCount} Teams</Badge>
                )}
              </div>
              <CardDescription>Top 5 teams in the league right now</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              {!hasLoaded ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    Click the button below to load current standings
                  </p>
                  <Button
                    onClick={loadData}
                    disabled={loading}
                    className="gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        Load Standings
                      </>
                    )}
                  </Button>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-destructive mb-4">{error}</p>
                  <Button onClick={loadData} variant="outline" className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </Button>
                </div>
              ) : data && data.teams && data.teams.length > 0 ? (
                <div className="space-y-3">
                  {data.teams.map((team, index) => (
                    <div
                      key={team.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-semibold">{team.name}</p>
                          <div className="flex items-center gap-1.5">
                            <PokeballIcon role="coach" size="xs" />
                            <p className="text-sm text-muted-foreground">{team.coach_name}</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {team.wins}-{team.losses}
                        </p>
                        <p className="text-xs text-muted-foreground">+{team.differential}</p>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t">
                    <Button
                      onClick={loadData}
                      disabled={loading}
                      variant="ghost"
                      size="sm"
                      className="w-full gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Refreshing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-3 w-3" />
                          Refresh
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <EmptyState
                  title="No team data available yet"
                  description="Run database migrations and sync Google Sheets to populate team data."
                  characterSize={64}
                />
              )}
            </CardContent>
          </Card>

          {/* Top Pokemon */}
          <Card className="border-2 h-full flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  MVP Pokémon
                </CardTitle>
                <Badge variant="outline">Top Performers</Badge>
              </div>
              <CardDescription>Most valuable Pokémon this season</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              {!hasLoaded ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    Click the button below to load MVP Pokémon stats
                  </p>
                  <Button
                    onClick={loadData}
                    disabled={loading}
                    className="gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        Load MVP Stats
                      </>
                    )}
                  </Button>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-destructive mb-4">{error}</p>
                  <Button onClick={loadData} variant="outline" className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </Button>
                </div>
              ) : data && data.topPokemon && data.topPokemon.length > 0 ? (
                <div className="space-y-3">
                  {data.topPokemon.map((pokemon, index) => (
                    <div
                      key={`${pokemon.pokemon_name}-${index}`}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <PokemonSprite name={pokemon.pokemon_name} size="md" />
                      <div className="flex-1">
                        <p className="font-semibold capitalize">{pokemon.pokemon_name}</p>
                        <p className="text-sm text-muted-foreground">{pokemon.kos_scored} KOs</p>
                      </div>
                      <Badge variant="secondary">{pokemon.times_used} uses</Badge>
                    </div>
                  ))}
                  <div className="pt-2 border-t">
                    <Button
                      onClick={loadData}
                      disabled={loading}
                      variant="ghost"
                      size="sm"
                      className="w-full gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Refreshing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-3 w-3" />
                          Refresh
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No Pokémon stats available yet</p>
                  <p className="text-sm mt-2">Data will populate after first matches</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
