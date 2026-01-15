"use client"

import Image from "next/image"
import { useState } from "react"
import { getSpriteUrl, getFallbackSpriteUrl, type PokemonDisplayData } from "@/lib/pokemon-utils"
import { cn } from "@/lib/utils"

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
    xl: mode === "artwork" ? 320 : 196, // Larger size for artwork
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
    // getFallbackSpriteUrl now checks MinIO first, then Supabase Storage, then GitHub
    // Handle artwork mode separately
    const fallbackMode = mode === "artwork" ? "artwork" : mode === "back" ? "back" : "front"
    spriteUrl = getFallbackSpriteUrl(pokemonId, mode === "shiny", fallbackMode)
  } else {
    // Last resort: try to construct from name (this won't work for PokeAPI URLs)
    // Should ideally fetch Pokemon data by name to get ID, but for now return null to show placeholder
    spriteUrl = null
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
    <div 
      className={cn("relative", className)} 
      style={mode === "artwork" ? { width: "auto", height: "auto", maxWidth: pixelSize, maxHeight: pixelSize } : { width: pixelSize, height: pixelSize }}
    >
      <Image
        src={spriteUrl}
        alt={name}
        width={mode === "artwork" ? 512 : pixelSize}
        height={mode === "artwork" ? 512 : pixelSize}
        className={cn(
          mode === "artwork" ? "w-auto h-auto max-w-full max-h-full object-contain" : "pixelated",
          "transition-opacity duration-300"
        )}
        onError={() => {
          console.error(`Failed to load ${mode} image for ${name}:`, spriteUrl)
          setImageError(true)
        }}
        unoptimized
        priority={mode === "artwork"}
        loading={mode === "artwork" ? "eager" : "lazy"} // Lazy load non-artwork images
        sizes={mode === "artwork" ? "320px" : `${pixelSize}px`} // Proper sizing hints
      />
    </div>
  )
}
