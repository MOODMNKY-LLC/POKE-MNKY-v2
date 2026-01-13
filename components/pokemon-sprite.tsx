"use client"

import Image from "next/image"
import { useState } from "react"
import { getSpriteUrl, getFallbackSpriteUrl, type PokemonDisplayData } from "@/lib/pokemon-utils"

interface PokemonSpriteProps {
  name: string
  pokemonId?: number
  pokemon?: PokemonDisplayData
  sprite?: string
  size?: "sm" | "md" | "lg" | "xl"
  mode?: "front" | "back" | "shiny" | "artwork"
  className?: string
}

export function PokemonSprite({
  name,
  pokemonId,
  pokemon,
  sprite,
  size = "md",
  mode = "front",
  className = "",
}: PokemonSpriteProps) {
  const [imageError, setImageError] = useState(false)

  const sizeMap = {
    sm: 48,
    md: 96,
    lg: 128,
    xl: 196,
  }

  const pixelSize = sizeMap[size]

  // Determine sprite URL priority:
  // 1. Provided sprite prop
  // 2. Supabase Storage path (from pokepedia_pokemon table)
  // 3. Pokemon object with sprites (external URLs)
  // 4. Fallback to PokeAPI URL
  let spriteUrl: string | null = null

  if (sprite) {
    spriteUrl = sprite
  } else if (pokemon) {
    // getSpriteUrl now checks Supabase Storage paths first, then external URLs
    spriteUrl = getSpriteUrl(pokemon, mode)
  } else if (pokemonId) {
    // getFallbackSpriteUrl now checks Supabase Storage first
    spriteUrl = getFallbackSpriteUrl(pokemonId, mode === "shiny")
  } else {
    // Last resort: try to construct from name
    spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${name.toLowerCase()}.png`
  }

  if (imageError || !spriteUrl) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg bg-muted ${className}`}
        style={{ width: pixelSize, height: pixelSize }}
      >
        <span className="text-xs text-muted-foreground">?</span>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`} style={{ width: pixelSize, height: pixelSize }}>
      <Image
        src={spriteUrl}
        alt={name}
        width={pixelSize}
        height={pixelSize}
        className="pixelated"
        onError={() => setImageError(true)}
        unoptimized
      />
    </div>
  )
}
