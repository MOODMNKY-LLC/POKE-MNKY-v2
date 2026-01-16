"use client"

import Image from "next/image"
import { useState, useMemo } from "react"
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

/**
 * Convert a storage path to GitHub fallback URL
 */
function getGitHubFallbackUrl(storagePath: string | null, pokemonId?: number, mode: "front" | "back" | "shiny" | "artwork" = "front", shiny = false): string | null {
  if (storagePath) {
    // If we have a storage path, convert it to GitHub URL
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/${storagePath}`
  }
  
  // Fallback: construct from pokemonId if available
  if (pokemonId) {
    if (mode === "artwork") {
      return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${shiny ? "shiny/" : ""}${pokemonId}.png`
    } else if (mode === "back") {
      return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${pokemonId}.png`
    } else if (shiny || mode === "shiny") {
      return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${pokemonId}.png`
    } else {
      return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`
    }
  }
  
  return null
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
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null)

  const sizeMap = {
    sm: 48,
    md: 96,
    lg: 128,
    xl: mode === "artwork" ? 320 : 196, // Larger size for artwork
  }

  const pixelSize = sizeMap[size]

  // Determine sprite URL priority:
  // 1. Provided sprite prop
  // 2. GitHub PokeAPI/sprites repo (when pokemonId available) - PRIMARY SOURCE
  // 3. Supabase Storage path (from pokepedia_pokemon table)
  // 4. Pokemon object with sprites (external URLs)
  const primarySpriteUrl = useMemo(() => {
    if (sprite) {
      return sprite
    } else if (pokemonId) {
      // PRIMARY: Use GitHub PokeAPI/sprites repo directly when pokemonId is available
      // This ensures sprites load even when Pokemon data isn't fetched
      const fallbackMode = mode === "artwork" ? "artwork" : mode === "back" ? "back" : "front"
      return getFallbackSpriteUrl(pokemonId, mode === "shiny", fallbackMode)
    } else if (pokemon) {
      // getSpriteUrl checks Supabase Storage paths first, then external URLs
      return getSpriteUrl(pokemon, mode)
    } else {
      return null
    }
  }, [sprite, pokemonId, pokemon, mode])

  // Determine GitHub fallback URL for when primary URL fails
  const githubFallbackUrl = useMemo(() => {
    if (pokemon) {
      const pokemonAny = pokemon as any
      const storagePath = mode === "artwork" 
        ? pokemonAny.sprite_official_artwork_path 
        : pokemonAny.sprite_front_default_path
      return getGitHubFallbackUrl(storagePath, pokemon.pokemon_id, mode, mode === "shiny")
    } else if (pokemonId) {
      return getGitHubFallbackUrl(null, pokemonId, mode, mode === "shiny")
    }
    return null
  }, [pokemon, pokemonId, mode])

  // Use fallback URL if primary failed, otherwise use primary
  const spriteUrl = fallbackUrl || primarySpriteUrl

  const handleImageError = () => {
    // If primary URL failed and we haven't tried fallback yet, switch to GitHub fallback
    if (!fallbackUrl && githubFallbackUrl && primarySpriteUrl !== githubFallbackUrl) {
      console.warn(`[PokemonSprite] Primary sprite URL failed for ${name}, falling back to GitHub:`, {
        primary: primarySpriteUrl,
        fallback: githubFallbackUrl
      })
      setFallbackUrl(githubFallbackUrl)
      setImageError(false) // Reset error to try fallback
    } else {
      // Both URLs failed or no fallback available
      console.error(`Failed to load ${mode} image for ${name}:`, spriteUrl)
      setImageError(true)
    }
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
        onError={handleImageError}
        unoptimized
        priority={mode === "artwork"}
        loading={mode === "artwork" ? "eager" : "lazy"} // Lazy load non-artwork images
        sizes={mode === "artwork" ? "320px" : `${pixelSize}px`} // Proper sizing hints
      />
    </div>
  )
}
