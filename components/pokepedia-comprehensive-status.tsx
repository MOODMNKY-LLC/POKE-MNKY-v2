/**
 * Comprehensive Pokepedia Status Component
 * Displays detailed sync status with counts, PokeAPI comparison, and connectivity
 */

"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Database,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronUp,
  Zap,
} from "lucide-react"
import { usePokepediaComprehensiveStatus } from "@/hooks/use-pokepedia-comprehensive-status"
import { usePokepediaSyncContext } from "@/components/pokepedia-sync-provider"
import { useAdmin } from "@/hooks/use-admin"
import { cn } from "@/lib/utils"

export function PokepediaComprehensiveStatus() {
  const { status, refresh, checkPokeAPI } = usePokepediaComprehensiveStatus()
  const syncState = usePokepediaSyncContext()
  const { isAdmin: isUserAdmin } = useAdmin()
  const [showPokeAPIComparison, setShowPokeAPIComparison] = useState(false)
  const [isChecking, setIsChecking] = useState(false)

  const handleCheckPokeAPI = async () => {
    setIsChecking(true)
    try {
      await checkPokeAPI()
    } finally {
      setIsChecking(false)
    }
  }

  const handleRefresh = async () => {
    await refresh()
  }

  const totalMasterData =
    status.masterData.types +
    status.masterData.abilities +
    status.masterData.moves +
    status.masterData.items +
    status.masterData.berries +
    status.masterData.stats +
    status.masterData.generations

  const totalPokemonData =
    status.pokemon.pokemon +
    status.pokemon.species +
    status.pokemon.forms +
    status.pokemon.evolutionChains

  const totalRelationships =
    status.relationships.pokemonAbilities +
    status.relationships.pokemonMoves +
    status.relationships.pokemonTypes +
    status.relationships.pokemonItems

  const isOutOfDate =
    status.pokeapiComparison &&
    Object.values(status.pokeapiComparison).some((comp) => !comp.upToDate)

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Pokepedia Sync Status
            </CardTitle>
            <CardDescription>Comprehensive database sync status and connectivity</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleRefresh} variant="outline" size="sm" disabled={status.loading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", status.loading && "animate-spin")} />
              Refresh
            </Button>
            <Button
              onClick={handleCheckPokeAPI}
              variant="outline"
              size="sm"
              disabled={isChecking || status.loading}
            >
              <Zap className={cn("h-4 w-4 mr-2", isChecking && "animate-spin")} />
              Check PokeAPI
            </Button>
            {!isUserAdmin && (
              <Badge variant="outline" className="text-xs">
                Read-Only
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Sync Status */}
        {syncState && (syncState.status === "syncing" || syncState.status === "stopped" || syncState.status === "completed") && (
          <div className="p-4 rounded-lg border bg-muted/30">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Current Sync Job</h3>
              <Badge variant={syncState.status === "syncing" ? "default" : syncState.status === "completed" ? "default" : "destructive"}>
                {syncState.status === "syncing" ? "Active" : syncState.status === "completed" ? "Completed" : "Stopped"}
              </Badge>
            </div>
            <div className="space-y-2">
              {syncState.phase && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Phase:</span>
                  <span className="font-medium capitalize">{syncState.phase}</span>
                </div>
              )}
              {syncState.itemsSynced !== undefined && syncState.itemsSynced > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Items Synced:</span>
                  <span className="font-medium">{syncState.itemsSynced.toLocaleString()}</span>
                </div>
              )}
              {syncState.progress > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress:</span>
                    <span className="font-medium">{syncState.progress.toFixed(1)}%</span>
                  </div>
                  <Progress value={syncState.progress} className="h-2" />
                </div>
              )}
              {syncState.currentChunk !== undefined && syncState.totalChunks !== undefined && syncState.totalChunks > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Chunks:</span>
                  <span className="font-medium">{syncState.currentChunk}/{syncState.totalChunks}</span>
                </div>
              )}
              {syncState.message && (
                <div className="text-xs text-muted-foreground mt-2">
                  {syncState.message}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Connectivity Status */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            {status.connected ? (
              <>
                <Wifi className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Database Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium">Database Disconnected</span>
              </>
            )}
          </div>
          {status.lastChecked && (
            <span className="text-xs text-muted-foreground">
              Last checked: {new Date(status.lastChecked).toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Generation Flags */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg border">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">Current Generation</span>
              <Badge variant="default">Gen {status.currentGeneration}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">Latest Pokemon generation available</p>
          </div>
          <div className="p-3 rounded-lg border">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">League Generation</span>
              <Badge variant="secondary">Gen {status.leagueGeneration}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">Generation used by league</p>
          </div>
        </div>

        {/* Master Data Counts */}
        <div>
          <h3 className="text-sm font-semibold mb-3">Master Data</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg border">
              <div className="text-2xl font-bold">{status.masterData.types}</div>
              <div className="text-xs text-muted-foreground">Types</div>
            </div>
            <div className="p-3 rounded-lg border">
              <div className="text-2xl font-bold">{status.masterData.abilities}</div>
              <div className="text-xs text-muted-foreground">Abilities</div>
            </div>
            <div className="p-3 rounded-lg border">
              <div className="text-2xl font-bold">{status.masterData.moves}</div>
              <div className="text-xs text-muted-foreground">Moves</div>
            </div>
            <div className="p-3 rounded-lg border">
              <div className="text-2xl font-bold">{status.masterData.items}</div>
              <div className="text-xs text-muted-foreground">Items</div>
            </div>
            <div className="p-3 rounded-lg border">
              <div className="text-2xl font-bold">{status.masterData.berries}</div>
              <div className="text-xs text-muted-foreground">Berries</div>
            </div>
            <div className="p-3 rounded-lg border">
              <div className="text-2xl font-bold">{status.masterData.stats}</div>
              <div className="text-xs text-muted-foreground">Stats</div>
            </div>
            <div className="p-3 rounded-lg border">
              <div className="text-2xl font-bold">{status.masterData.generations}</div>
              <div className="text-xs text-muted-foreground">Generations</div>
            </div>
            <div className="p-3 rounded-lg border bg-primary/5">
              <div className="text-2xl font-bold">{totalMasterData}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
          </div>
        </div>

        {/* Pokemon Data Counts */}
        <div>
          <h3 className="text-sm font-semibold mb-3">Pokemon Data</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg border">
              <div className="text-2xl font-bold">{status.pokemon.pokemon}</div>
              <div className="text-xs text-muted-foreground">Pokemon</div>
            </div>
            <div className="p-3 rounded-lg border">
              <div className="text-2xl font-bold">{status.pokemon.species}</div>
              <div className="text-xs text-muted-foreground">Species</div>
            </div>
            <div className="p-3 rounded-lg border">
              <div className="text-2xl font-bold">{status.pokemon.forms}</div>
              <div className="text-xs text-muted-foreground">Forms</div>
            </div>
            <div className="p-3 rounded-lg border">
              <div className="text-2xl font-bold">{status.pokemon.evolutionChains}</div>
              <div className="text-xs text-muted-foreground">Evolution Chains</div>
            </div>
          </div>
        </div>

        {/* Relationship Counts */}
        <div>
          <h3 className="text-sm font-semibold mb-3">Relationships</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg border">
              <div className="text-2xl font-bold">{status.relationships.pokemonAbilities}</div>
              <div className="text-xs text-muted-foreground">Pokemon ↔ Abilities</div>
            </div>
            <div className="p-3 rounded-lg border">
              <div className="text-2xl font-bold">{status.relationships.pokemonMoves}</div>
              <div className="text-xs text-muted-foreground">Pokemon ↔ Moves</div>
            </div>
            <div className="p-3 rounded-lg border">
              <div className="text-2xl font-bold">{status.relationships.pokemonTypes}</div>
              <div className="text-xs text-muted-foreground">Pokemon ↔ Types</div>
            </div>
            <div className="p-3 rounded-lg border">
              <div className="text-2xl font-bold">{status.relationships.pokemonItems}</div>
              <div className="text-xs text-muted-foreground">Pokemon ↔ Items</div>
            </div>
          </div>
        </div>

        {/* PokeAPI Comparison */}
        {status.pokeapiComparison && (
          <div>
            <button
              onClick={() => setShowPokeAPIComparison(!showPokeAPIComparison)}
              className="flex items-center justify-between w-full p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">PokeAPI Comparison</h3>
                {isOutOfDate && (
                  <Badge variant="destructive" className="text-xs">
                    Out of Date
                  </Badge>
                )}
                {!isOutOfDate && (
                  <Badge variant="default" className="text-xs bg-green-500">
                    Up to Date
                  </Badge>
                )}
              </div>
              {showPokeAPIComparison ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {showPokeAPIComparison && (
              <div className="mt-3 space-y-2">
                {Object.entries(status.pokeapiComparison).map(([key, comp]) => (
                  <div key={key} className="p-3 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium capitalize">{key}</span>
                      {comp.upToDate ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        Local: {comp.local.toLocaleString()} | Remote: {comp.remote.toLocaleString()}
                      </span>
                      {comp.diff !== 0 && (
                        <span className={cn("font-medium", comp.diff > 0 ? "text-yellow-500" : "text-green-500")}>
                          {comp.diff > 0 ? `+${comp.diff}` : comp.diff} missing
                        </span>
                      )}
                    </div>
                    {comp.diff !== 0 && (
                      <Progress
                        value={(comp.local / comp.remote) * 100}
                        className="h-1.5 mt-2"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {status.error && (
          <div className="p-3 rounded-lg border border-red-500 bg-red-500/10">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-500">{status.error}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
