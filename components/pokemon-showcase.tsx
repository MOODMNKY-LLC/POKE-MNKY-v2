"use client"

import { useState, useEffect } from "react"
import { PokemonSprite } from "./pokemon-sprite"
import { Badge } from "./ui/badge"
import { Zap } from "lucide-react"

interface PokemonShowcaseProps {
  featured?: string[]
}

const FEATURED_POKEMON = [
  { name: "charizard", type: "Fire/Flying" },
  { name: "garchomp", type: "Dragon/Ground" },
  { name: "metagross", type: "Steel/Psychic" },
  { name: "greninja", type: "Water/Dark" },
  { name: "mimikyu", type: "Ghost/Fairy" },
  { name: "corviknight", type: "Flying/Steel" },
]

export function PokemonShowcase({ featured }: PokemonShowcaseProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const pokemonList = featured || FEATURED_POKEMON.map((p) => p.name)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % pokemonList.length)
    }, 3000)

    return () => clearInterval(interval)
  }, [pokemonList.length])

  return (
    <div className="relative w-full h-64 sm:h-80 overflow-hidden rounded-2xl">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-secondary/20" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          {FEATURED_POKEMON.map((pokemon, index) => (
            <div
              key={pokemon.name}
              className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 ${
                index === currentIndex ? "opacity-100 scale-100" : "opacity-0 scale-75 pointer-events-none"
              }`}
            >
              <PokemonSprite name={pokemon.name} size="xl" className="drop-shadow-2xl animate-scale-in" />
              <div className="mt-4 text-center">
                <h3 className="text-2xl sm:text-3xl font-bold capitalize">{pokemon.name}</h3>
                <Badge variant="secondary" className="mt-2">
                  <Zap className="h-3 w-3 mr-1" />
                  {pokemon.type}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {FEATURED_POKEMON.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`h-2 rounded-full transition-all ${
              index === currentIndex ? "w-8 bg-primary" : "w-2 bg-muted-foreground/50"
            }`}
            aria-label={`View Pokemon ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
