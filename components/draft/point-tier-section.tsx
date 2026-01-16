"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text"
import { DraftPokemonCard } from "./draft-pokemon-card"

interface Pokemon {
  name: string
  point_value: number
  generation: number
  pokemon_id?: string
}

interface PointTierSectionProps {
  points: number
  pokemon: Pokemon[]
  draftedPokemon: string[]
  isYourTurn: boolean
  onPick: (pokemonName: string) => void
}

export function PointTierSection({
  points,
  pokemon,
  draftedPokemon,
  isYourTurn,
  onPick
}: PointTierSectionProps) {
  return (
    <Card>
      <CardHeader>
        <AnimatedGradientText className="text-2xl font-bold">
          {points} Points
        </AnimatedGradientText>
        <p className="text-sm text-muted-foreground mt-1">
          {pokemon.length} Pokemon available
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {pokemon.map(p => (
            <DraftPokemonCard
              key={p.name}
              pokemon={{
                name: p.name,
                point_value: p.point_value,
                generation: p.generation || 1,
                pokemon_id: p.pokemon_id ?? null,
              }}
              isDrafted={draftedPokemon.includes(p.name.toLowerCase())}
              isYourTurn={isYourTurn}
              onPick={() => onPick(p.name)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
