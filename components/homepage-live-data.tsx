"use client"

/**
 * Homepage live league data — standings + weekly vs seasonal top performers (AAB).
 */

import { useCallback, useEffect, useState } from "react"
import { Flame, RefreshCw, Loader2, Sparkles, Trophy } from "lucide-react"
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
    id: string | number
    name: string
    type1?: string
    type2?: string
  }
}

interface LiveDataResponse {
  teams: Team[]
  teamCount: number
  topPokemon?: TopPokemon[]
  topPokemonSeasonal?: TopPokemon[]
  topPokemonWeekly?: TopPokemon[]
  currentWeek?: number | null
}

export function HomepageLiveData() {
  const [data, setData] = useState<LiveDataResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasLoaded, setHasLoaded] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/homepage/live-data", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })

      if (!response.ok) {
        throw new Error(`Failed to load data: ${response.statusText}`)
      }

      const result = (await response.json()) as LiveDataResponse
      setData(result)
      setHasLoaded(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load live data"
      setError(message)
      console.error("[HomepageLiveData] Error loading data:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const seasonal = data?.topPokemonSeasonal ?? data?.topPokemon ?? []
  const weekly = data?.topPokemonWeekly ?? []

  return (
    <section className="w-full border-t border-border/40 bg-muted/20 py-12 md:py-20 lg:py-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mb-10 flex flex-col gap-2 text-center md:text-left">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">League snapshot</h2>
          <p className="text-muted-foreground max-w-2xl">
            Standings and top Pokémon — weekly strip uses the latest match week in the database; seasonal is
            all recorded KOs this season.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 lg:items-start">
          {/* Standings */}
          <Card className="border-2 h-full flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  Current standings
                </CardTitle>
                {data && <Badge variant="outline">{data.teamCount} teams</Badge>}
              </div>
              <CardDescription>Top five by wins right now</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              {loading && !hasLoaded ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading standings…
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
                          Refreshing…
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
                  title="No team data yet"
                  description="Sync the league spreadsheet or run migrations so teams appear here."
                  characterSize={64}
                />
              )}
            </CardContent>
          </Card>

          {/* Performers: weekly + seasonal */}
          <div className="flex flex-col gap-6">
            <Card className="border-2 flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <CardTitle className="flex items-center gap-2">
                    <Flame className="h-5 w-5 text-orange-500" />
                    Top weekly performers
                  </CardTitle>
                  <Badge variant="default" className="bg-orange-600 hover:bg-orange-600">
                    Week {data?.currentWeek ?? "—"}
                  </Badge>
                </div>
                <CardDescription>KOs in the latest completed match week</CardDescription>
              </CardHeader>
              <CardContent>
                {loading && !hasLoaded ? (
                  <div className="flex py-8 justify-center text-muted-foreground gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : weekly.length > 0 ? (
                  <PerformerList items={weekly} />
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No weekly stats yet — matches and KOs will populate this strip.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-2 flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Top seasonal performers
                  </CardTitle>
                  <Badge variant="secondary">Season</Badge>
                </div>
                <CardDescription>Total KOs across all logged matches</CardDescription>
              </CardHeader>
              <CardContent>
                {loading && !hasLoaded ? (
                  <div className="flex py-8 justify-center text-muted-foreground gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : seasonal.length > 0 ? (
                  <PerformerList items={seasonal} />
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No seasonal totals yet.
                  </p>
                )}
              </CardContent>
            </Card>

            <Button
              onClick={loadData}
              disabled={loading}
              variant="outline"
              size="sm"
              className="w-full gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh league data
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

function PerformerList({ items }: { items: TopPokemon[] }) {
  return (
    <div className="space-y-3">
      {items.map((pokemon, index) => (
        <div
          key={`${pokemon.pokemon_name}-${index}`}
          className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
        >
          <PokemonSprite name={pokemon.pokemon_name} size="md" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold capitalize truncate">{pokemon.pokemon_name}</p>
            <p className="text-sm text-muted-foreground">{pokemon.kos_scored} KOs</p>
          </div>
          <Badge variant="secondary">{pokemon.times_used} games</Badge>
        </div>
      ))}
    </div>
  )
}
