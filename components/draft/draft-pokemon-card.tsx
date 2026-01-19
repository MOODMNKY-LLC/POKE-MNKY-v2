"use client"

import { MagicCard } from "@/components/ui/magic-card"
import { ShimmerButton } from "@/components/ui/shimmer-button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { PokemonSprite } from "@/components/pokemon-sprite"
import { BlurFade } from "@/components/ui/blur-fade"
import { cn } from "@/lib/utils"
import { CheckCircle2 } from "lucide-react"
import { usePokemonId } from "@/hooks/use-pokemon-id"

interface DraftPokemonCardProps {
  pokemon: {
    name: string
    point_value: number
    generation: number
    pokemon_id?: number | null
    status?: "available" | "drafted" | "banned" | "unavailable"
  }
  isDrafted: boolean
  isYourTurn: boolean
  onPick: () => void
}

export function DraftPokemonCard({
  pokemon,
  isDrafted,
  isYourTurn,
  onPick
}: DraftPokemonCardProps) {
  // Fetch pokemon_id from PokeAPI if not provided
  const fetchedPokemonId = usePokemonId(pokemon.pokemon_id ? null : pokemon.name)
  const pokemonId = pokemon.pokemon_id || fetchedPokemonId

  // Use status field if available, otherwise fall back to isDrafted prop
  const status = pokemon.status || (isDrafted ? "drafted" : "available")
  const isActuallyDrafted = status === "drafted" || isDrafted
  const isBanned = status === "banned"
  const isAvailable = status === "available" && !isActuallyDrafted

  return (
    <BlurFade delay={0.1} inView={!isActuallyDrafted}>
      <MagicCard className={cn(
        "relative transition-all",
        isActuallyDrafted && "opacity-50 pointer-events-none",
        isBanned && "opacity-30 pointer-events-none",
        isYourTurn && isAvailable && "ring-2 ring-primary ring-offset-2"
      )}>
        <Card className="p-4 flex flex-col items-center gap-3 h-full">
          <div className="h-24 w-24 flex items-center justify-center">
            <PokemonSprite 
              name={pokemon.name}
              pokemonId={pokemonId || undefined}
              size="lg"
              mode="artwork"
            />
          </div>
          
          <div className="text-center">
            <h3 className="font-semibold capitalize text-sm">{pokemon.name}</h3>
            <Badge variant="secondary" className="mt-1">
              {pokemon.point_value}pts
            </Badge>
            {status !== "available" && (
              <Badge 
                variant={status === "drafted" ? "default" : "destructive"} 
                className="mt-1 ml-1 text-xs"
              >
                {status === "drafted" ? "Drafted" : status === "banned" ? "Banned" : "Unavailable"}
              </Badge>
            )}
          </div>

          {isActuallyDrafted ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs">Drafted</span>
            </div>
          ) : isBanned ? (
            <div className="flex items-center gap-2 text-destructive">
              <span className="text-xs">Banned</span>
            </div>
          ) : isYourTurn ? (
            <ShimmerButton 
              onClick={onPick}
              className="w-full mt-auto"
            >
              Draft
            </ShimmerButton>
          ) : (
            <Badge variant="outline" className="mt-auto">
              Not Your Turn
            </Badge>
          )}
        </Card>
      </MagicCard>
    </BlurFade>
  )
}
