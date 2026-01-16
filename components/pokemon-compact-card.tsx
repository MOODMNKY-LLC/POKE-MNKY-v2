/**
 * Compact Pokemon Card Component
 * Theme-aware compact card for displaying Pokemon in showcases
 * Uses theme CSS variables instead of type-colored backgrounds
 */

"use client"

import { PokemonSprite } from "./pokemon-sprite"
import { Badge } from "./ui/badge"
import { Card } from "./ui/card"
import { usePokemonData } from "@/hooks/use-pokemon-data"
import { getPokemonTypeColors } from "@/lib/pokemon-type-colors"
import { cn } from "@/lib/utils"
import { Activity, Zap, ArrowRight } from "lucide-react"
import { PokeballIcon } from "./pokeball-icon"
import { PokemonStatIcon } from "./pokemon-stat-icon"
import type { PokemonDisplayData } from "@/lib/pokemon-utils"

interface PokemonCompactCardProps {
  pokemonId: number
  className?: string
  showEvolution?: boolean
  evolutionChain?: Array<{ id: number; name: string }>
  pokemonData?: PokemonDisplayData // Pre-fetched data to avoid individual API calls
}

export function PokemonCompactCard({
  pokemonId,
  className,
  showEvolution = false,
  evolutionChain,
  pokemonData: providedPokemonData,
}: PokemonCompactCardProps) {
  // Only fetch individually if data wasn't provided (for backward compatibility)
  const { pokemon: fetchedPokemon, loading, error } = usePokemonData(pokemonId)
  const pokemon = providedPokemonData || fetchedPokemon

  // If no pokemon data available but we have pokemonId, show sprite-only card
  // This allows sprites to load from GitHub PokeAPI/sprites repo even when data fetch fails or is still loading
  // This is the PRIMARY way to display Pokemon - sprites from GitHub repo
  if (!pokemon && pokemonId) {
    return (
      <Card 
        className={cn("p-2 flex flex-col items-center justify-center", className)} 
        style={{ minHeight: "200px", width: "180px" }}
      >
        <div className="flex flex-col items-center gap-2 w-full">
          <div className="relative w-20 h-20 flex items-center justify-center bg-muted/20 rounded-md overflow-hidden">
            <PokemonSprite
              name={`pokemon-${pokemonId}`}
              pokemonId={pokemonId}
              size="md"
              mode="artwork"
              className="drop-shadow-md"
            />
          </div>
          <p className="text-xs text-muted-foreground text-center font-medium">#{String(pokemonId).padStart(4, "0")}</p>
          {loading && (
            <div className="flex items-center gap-1">
              <PokeballIcon size={10} className="animate-spin text-muted-foreground" />
              <p className="text-[9px] text-muted-foreground">Loading data...</p>
            </div>
          )}
        </div>
      </Card>
    )
  }

  // Handle error state - only show if we don't have provided data
  if (!providedPokemonData && error && !pokemonId) {
    return (
      <Card 
        className={cn("p-2 flex items-center justify-center", className)} 
        style={{ minHeight: "200px", width: "180px" }} // Fixed dimensions
      >
        <p className="text-[9px] text-destructive">Error</p>
      </Card>
    )
  }

  // If no pokemon data and no pokemonId, show loading placeholder
  if (!pokemon && !pokemonId) {
    return (
      <Card 
        className={cn("p-2 flex items-center justify-center", className)} 
        style={{ minHeight: "200px", width: "180px" }}
      >
        <div className="flex flex-col items-center gap-2">
          <PokeballIcon size={24} className="text-muted-foreground" />
          <p className="text-xs text-muted-foreground text-center">Loading...</p>
        </div>
      </Card>
    )
  }

  const typeColors = getPokemonTypeColors(pokemon.types)
  const hp = pokemon.base_stats.hp

  return (
    <Card
      className={cn(
        "relative overflow-hidden border transition-all duration-300",
        "bg-card text-card-foreground",
        "hover:shadow-lg hover:border-primary/50",
        className
      )}
      style={{
        borderColor: typeColors.border,
        minHeight: "200px", // Fixed height to prevent layout shift
        width: "180px", // Fixed width
      }}
    >
      {/* Type-colored accent border (subtle) */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{
          backgroundColor: typeColors.bg,
        }}
      />

      <div className="relative z-10 flex flex-col p-2.5">
        {/* Header */}
        <div className="flex items-start justify-between mb-1.5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 mb-0.5">
              <h4 className="text-sm font-bold capitalize truncate">{pokemon.name}</h4>
              <PokeballIcon size={10} className="text-muted-foreground flex-shrink-0" />
            </div>
            <p className="text-[10px] text-muted-foreground">#{String(pokemon.pokemon_id).padStart(4, "0")}</p>
          </div>

          {/* HP Badge */}
          <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-muted border flex-shrink-0">
            <Activity className="h-2.5 w-2.5 text-destructive" />
            <span className="font-bold text-[10px]">{hp}</span>
          </div>
        </div>

        {/* Types */}
        <div className="flex gap-0.5 mb-2">
          {pokemon.types.map((type) => (
            <Badge
              key={type}
              className="capitalize text-[9px] px-1 py-0"
              style={{
                backgroundColor: typeColors.bg,
                color: typeColors.text,
                borderColor: typeColors.border,
              }}
            >
              {type}
            </Badge>
          ))}
        </div>

        {/* Artwork */}
        <div className="relative w-full h-20 mb-1.5 flex items-center justify-center bg-muted/20 rounded-md overflow-hidden">
          <PokemonSprite
            name={pokemon.name}
            pokemonId={pokemon.pokemon_id}
            size="sm"
            mode="artwork"
            className="drop-shadow-md"
          />
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-1 mb-2">
          <div className="text-center p-1 rounded bg-muted/50 border">
            <div className="flex items-center justify-center gap-0.5 mb-0.5">
              <PokemonStatIcon stat="attack" size={10} />
              <div className="text-[9px] text-muted-foreground">ATK</div>
            </div>
            <div className="font-bold text-[10px]">{pokemon.base_stats.attack}</div>
          </div>
          <div className="text-center p-1 rounded bg-muted/50 border">
            <div className="flex items-center justify-center gap-0.5 mb-0.5">
              <PokemonStatIcon stat="defense" size={10} />
              <div className="text-[9px] text-muted-foreground">DEF</div>
            </div>
            <div className="font-bold text-[10px]">{pokemon.base_stats.defense}</div>
          </div>
          <div className="text-center p-1 rounded bg-muted/50 border">
            <div className="flex items-center justify-center gap-0.5 mb-0.5">
              <PokemonStatIcon stat="speed" size={10} />
              <div className="text-[9px] text-muted-foreground">SPD</div>
            </div>
            <div className="font-bold text-[10px]">{pokemon.base_stats.speed}</div>
          </div>
        </div>

        {/* Abilities */}
        {pokemon.abilities.length > 0 && (
          <div className="mb-1">
            <div className="flex items-center gap-0.5 mb-0.5">
              <Zap className="h-2.5 w-2.5 text-primary" />
              <span className="text-[9px] font-semibold">Abilities</span>
            </div>
            <div className="flex flex-wrap gap-0.5">
              {pokemon.abilities.slice(0, 2).map((ability) => {
                const isHidden = pokemon.hidden_ability === ability
                return (
                  <Badge
                    key={ability}
                    variant={isHidden ? "secondary" : "outline"}
                    className="capitalize text-[8px] px-0.5 py-0"
                  >
                    {ability}
                    {isHidden && " (H)"}
                  </Badge>
                )
              })}
            </div>
          </div>
        )}

        {/* Evolution Chain */}
        {showEvolution && evolutionChain && evolutionChain.length > 1 && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
              <span>Evolution:</span>
            </div>
            <div className="flex items-center gap-1">
              {evolutionChain.map((evo, idx) => (
                <div key={evo.id} className="flex items-center gap-1">
                  <div
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[9px] font-medium",
                      evo.id === pokemonId
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {evo.name}
                  </div>
                  {idx < evolutionChain.length - 1 && (
                    <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
