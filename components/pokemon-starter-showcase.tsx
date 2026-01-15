/**
 * Pokemon Starter Showcase Component
 * Displays starter Pokemon from all generations in a smooth scrolling marquee
 * Pauses on hover for better user interaction
 */

"use client"

import { useEffect, useMemo } from "react"
import { PokemonCompactCard } from "./pokemon-compact-card"
import { Badge } from "./ui/badge"
import { Marquee } from "./ui/marquee"
import { BlurFade } from "./ui/blur-fade"
import { cn } from "@/lib/utils"
import { STARTER_POKEMON_BY_GENERATION } from "@/lib/pokemon-evolution"
import { usePokemonBatch } from "@/hooks/use-pokemon-batch"

export function PokemonStarterShowcase() {
  // Flatten all starter Pokemon from all generations
  const allStarters = useMemo(() => {
    const starters: Array<{ name: string; id: number; generation: number }> = []
    Object.entries(STARTER_POKEMON_BY_GENERATION).forEach(([gen, pokemon]) => {
      pokemon.forEach((p) => {
        starters.push({ ...p, generation: parseInt(gen) })
      })
    })
    return starters
  }, [])

  // Extract Pokemon IDs for batch fetching
  const pokemonIds = useMemo(() => allStarters.map(s => s.id), [allStarters])
  
  // Batch fetch all Pokemon data at once
  const { pokemonMap, loading: batchLoading } = usePokemonBatch(pokemonIds)

  return (
    <BlurFade delay={0.1} className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm px-3 py-1">
            Starter Pokemon Showcase
          </Badge>
          <span className="text-sm text-muted-foreground">
            All {allStarters.length} starters across 9 generations
          </span>
        </div>
      </div>

      {/* Scrolling Marquee - Pauses on Hover */}
      <div className="relative overflow-x-hidden overflow-y-visible rounded-lg border border-border/40 bg-muted/20 p-4 w-full max-w-full">
        {/* Gradient fade edges for smooth visual effect */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-background via-background/80 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-background via-background/80 to-transparent" />
        
        <Marquee pauseOnHover className="[--duration:120s] [--gap:1rem] w-full max-w-full overflow-x-hidden">
          {allStarters.map((starter) => {
            const pokemonData = pokemonMap.get(starter.id)
            return (
              <div
                key={`${starter.generation}-${starter.id}`}
                className="flex-shrink-0 w-[180px]"
                style={{ minHeight: "200px" }} // Fixed height to prevent layout shift
              >
                <BlurFade delay={0} duration={0.3} className="h-full">
                  <PokemonCompactCard
                    pokemonId={starter.id}
                    pokemonData={pokemonData} // Pass pre-fetched data
                    showEvolution={false}
                    className={cn(
                      "h-full card-transition",
                      "hover:shadow-lg hover:border-primary/50"
                    )}
                  />
                </BlurFade>
              </div>
            )
          })}
        </Marquee>
      </div>

      {/* Generation Legend */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium">Generations:</span>
        {Object.keys(STARTER_POKEMON_BY_GENERATION).map((gen) => (
          <Badge key={gen} variant="secondary" className="text-xs">
            Gen {gen}
          </Badge>
        ))}
      </div>
    </BlurFade>
  )
}
