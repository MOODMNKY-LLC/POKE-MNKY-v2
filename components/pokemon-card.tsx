/**
 * Comprehensive Pokemon Card Component
 * Displays Pokemon data in a card format similar to official Pokemon TCG cards
 * Theme-aware and responsive
 */

"use client"

import { PokemonSprite } from "./pokemon-sprite"
import { Badge } from "./ui/badge"
import { Card } from "./ui/card"
import { usePokemonData } from "@/hooks/use-pokemon-data"
import { getPokemonTypeColors } from "@/lib/pokemon-type-colors"
import { cn } from "@/lib/utils"
import {
  Activity,
  Zap,
  Shield,
  Gauge,
  Weight,
  Ruler,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react"
import { PokeballIcon } from "./pokeball-icon"
import { PokemonStatIcon } from "./pokemon-stat-icon"

interface PokemonCardProps {
  pokemonId: number
  className?: string
}

export function PokemonCard({ pokemonId, className }: PokemonCardProps) {
  const { pokemon, loading, error } = usePokemonData(pokemonId)

  if (loading) {
    return (
      <Card className={cn("p-8 flex items-center justify-center min-h-[500px]", className)}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading Pokemon...</p>
        </div>
      </Card>
    )
  }

  if (error || !pokemon) {
    return (
      <Card className={cn("p-8 flex items-center justify-center min-h-[500px]", className)}>
        <div className="text-center">
          <p className="text-destructive">Failed to load Pokemon</p>
          <p className="text-sm text-muted-foreground mt-2">{error}</p>
        </div>
      </Card>
    )
  }

  const typeColors = getPokemonTypeColors(pokemon.types)
  const totalStats =
    pokemon.base_stats.hp +
    pokemon.base_stats.attack +
    pokemon.base_stats.defense +
    pokemon.base_stats.special_attack +
    pokemon.base_stats.special_defense +
    pokemon.base_stats.speed

  // Calculate HP (base HP stat)
  const hp = pokemon.base_stats.hp

  return (
    <Card
      className={cn(
        "relative overflow-hidden border-2 transition-all duration-300",
        "bg-card text-card-foreground shadow-lg",
        className
      )}
      style={{
        borderColor: typeColors.border,
      }}
    >
      {/* Type-themed background gradient - theme aware */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: typeColors.gradient || typeColors.bg,
          opacity: "var(--theme) === 'dark' ? 0.1 : 0.05",
        }}
      />
      <div
        className="absolute inset-0 dark:opacity-10 opacity-5 pointer-events-none"
        style={{
          background: typeColors.gradient || typeColors.bg,
        }}
      />

      {/* Card Content */}
      <div className="relative z-10 flex flex-col">
        {/* Header Section */}
        <div className="flex items-start justify-between p-4 border-b bg-muted/30">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-2xl font-bold capitalize">{pokemon.name}</h3>
              <PokeballIcon size={20} className="text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">#{String(pokemon.pokemon_id).padStart(4, "0")}</p>
          </div>

          {/* HP and Types */}
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-background/80 border">
              <Activity className="h-4 w-4 text-destructive" />
              <span className="font-bold text-lg">{hp}</span>
              <span className="text-xs text-muted-foreground">HP</span>
            </div>
            <div className="flex gap-1">
              {pokemon.types.map((type) => (
                <Badge
                  key={type}
                  className="capitalize text-xs"
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
          </div>
        </div>

        {/* Artwork Section */}
        <div className="relative p-6 bg-gradient-to-b from-muted/20 to-transparent">
          <div className="relative w-full aspect-square max-w-xs mx-auto flex items-center justify-center">
            {/* Decorative border */}
            <div
              className="absolute inset-0 rounded-lg border-2 opacity-20"
              style={{ borderColor: typeColors.border }}
            />
            <PokemonSprite
              name={pokemon.name}
              pokemonId={pokemon.pokemon_id}
              size="xl"
              mode="artwork"
              className="drop-shadow-2xl z-10"
            />
          </div>
        </div>

        {/* Stats Section */}
        <div className="p-4 border-t bg-muted/20">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <StatItem
              label="HP"
              value={pokemon.base_stats.hp}
              icon={Activity}
              color="text-red-500"
              stat="hp"
            />
            <StatItem
              label="ATK"
              value={pokemon.base_stats.attack}
              icon={Zap}
              color="text-orange-500"
              stat="attack"
            />
            <StatItem
              label="DEF"
              value={pokemon.base_stats.defense}
              icon={Shield}
              color="text-blue-500"
              stat="defense"
            />
            <StatItem
              label="SpA"
              value={pokemon.base_stats.special_attack}
              icon={Sparkles}
              color="text-purple-500"
              stat="special-attack"
            />
            <StatItem
              label="SpD"
              value={pokemon.base_stats.special_defense}
              icon={Shield}
              color="text-green-500"
              stat="special-defense"
            />
            <StatItem
              label="SPD"
              value={pokemon.base_stats.speed}
              icon={Gauge}
              color="text-yellow-500"
              stat="speed"
            />
          </div>

          {/* Total Stats */}
          <div className="flex items-center justify-between p-2 rounded-md bg-background/50 border">
            <span className="text-sm font-medium">Total</span>
            <span className="font-bold">{totalStats}</span>
          </div>
        </div>

        {/* Abilities Section */}
        {pokemon.abilities.length > 0 && (
          <div className="p-4 border-t bg-muted/10">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Abilities</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {pokemon.abilities.map((ability, idx) => {
                const isHidden = pokemon.hidden_ability === ability
                return (
                  <Badge
                    key={ability}
                    variant={isHidden ? "secondary" : "default"}
                    className="capitalize text-xs"
                  >
                    {ability}
                    {isHidden && <span className="ml-1 text-[10px]">(H)</span>}
                  </Badge>
                )
              })}
            </div>
          </div>
        )}

        {/* Physical Info Section */}
        <div className="p-4 border-t bg-muted/10 grid grid-cols-3 gap-4">
          <InfoItem
            icon={Ruler}
            label="Height"
            value={pokemon.height ? `${(pokemon.height / 10).toFixed(1)}m` : undefined}
            fallback="—"
          />
          <InfoItem
            icon={Weight}
            label="Weight"
            value={pokemon.weight ? `${(pokemon.weight / 10).toFixed(1)}kg` : undefined}
            fallback="—"
          />
          <InfoItem
            icon={Sparkles}
            label="Base EXP"
            value={pokemon.base_experience ? String(pokemon.base_experience) : undefined}
            fallback="—"
          />
        </div>

        {/* Footer - Generation Badge */}
        {pokemon.generation && (
          <div className="p-3 border-t bg-muted/20 flex items-center justify-center">
            <Badge variant="outline" className="text-xs">
              Generation {pokemon.generation}
            </Badge>
          </div>
        )}
      </div>
    </Card>
  )
}

function StatItem({
  label,
  value,
  icon: Icon,
  color,
  stat,
}: {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  color: string
  stat?: "hp" | "attack" | "defense" | "special-attack" | "special-defense" | "speed"
}) {
  const statMap: Record<string, "hp" | "attack" | "defense" | "special-attack" | "special-defense" | "speed"> = {
    HP: "hp",
    ATK: "attack",
    DEF: "defense",
    SpA: "special-attack",
    SpD: "special-defense",
    SPD: "speed",
  }
  
  const statKey = stat || statMap[label]
  
  return (
    <div className="flex flex-col items-center gap-1 p-2 rounded-md bg-background/50 border">
      <div className="relative flex items-center justify-center">
        {statKey && <PokemonStatIcon stat={statKey} size={16} className="absolute" />}
        <Icon className={cn("h-4 w-4", color, statKey && "opacity-0")} />
      </div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-bold text-sm">{value}</span>
    </div>
  )
}

function InfoItem({
  icon: Icon,
  label,
  value,
  fallback,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value?: string
  fallback: string
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value || fallback}</span>
    </div>
  )
}
