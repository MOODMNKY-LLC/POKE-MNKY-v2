/**
 * Read-Only Pokepedia Sync Status Component
 * For regular users - shows sync completion status only
 * No triggers, no admin controls
 */

"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, AlertCircle, Database, RefreshCw } from "lucide-react"
import { usePokepediaComprehensiveStatus } from "@/hooks/use-pokepedia-comprehensive-status"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function PokepediaSyncStatusReadOnly() {
  const { status, refresh } = usePokepediaComprehensiveStatus()

  // Determine if sync is complete based on data counts
  const hasMasterData = status.masterData.types > 0 || status.masterData.abilities > 0 || status.masterData.moves > 0
  const hasPokemonData = status.pokemon.pokemon > 0
  const isSyncComplete = hasMasterData && hasPokemonData && status.connected

  // Check if data is up to date with PokeAPI
  const isUpToDate = status.pokeapiComparison
    ? Object.values(status.pokeapiComparison).every((comp) => comp.upToDate)
    : null

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Pokepedia Sync Status
            </CardTitle>
            <CardDescription>Current sync status and data availability</CardDescription>
          </div>
          <Button onClick={refresh} variant="outline" size="sm" disabled={status.loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", status.loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Status */}
        <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
          <div className="flex items-center gap-3">
            {isSyncComplete ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <div className="font-semibold">Sync Complete</div>
                  <div className="text-sm text-muted-foreground">
                    Pokepedia data is available
                  </div>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <div>
                  <div className="font-semibold">Sync In Progress</div>
                  <div className="text-sm text-muted-foreground">
                    Data is being synchronized
                  </div>
                </div>
              </>
            )}
          </div>
          <Badge variant={isSyncComplete ? "default" : "secondary"}>
            {isSyncComplete ? "Ready" : "Syncing"}
          </Badge>
        </div>

        {/* Connectivity Status */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            {status.connected ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Database Connected</span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium">Database Disconnected</span>
              </>
            )}
          </div>
          {status.lastChecked && (
            <span className="text-xs text-muted-foreground">
              Updated: {new Date(status.lastChecked).toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Data Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg border">
            <div className="text-2xl font-bold">{status.pokemon.pokemon.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Pokémon</div>
          </div>
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
        </div>

        {/* PokeAPI Comparison (if available) */}
        {status.pokeapiComparison && (
          <div className="p-3 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">Data Freshness</span>
              <Badge variant={isUpToDate ? "default" : "secondary"}>
                {isUpToDate ? "Up to Date" : "Needs Update"}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              {isUpToDate
                ? "All data is synchronized with PokeAPI"
                : "Some data may need updating"}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
