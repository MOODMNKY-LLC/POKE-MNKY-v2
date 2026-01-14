/**
 * Pokemon Stat Icon Component
 * Displays Pokemon stat icon sprite (HP, Attack, Defense, etc.)
 * Falls back gracefully if sprite doesn't exist
 */

"use client"

import { getStatSpriteUrl } from "@/lib/pokemon-ui-sprites"
import { cn } from "@/lib/utils"
import { useState } from "react"

interface PokemonStatIconProps {
  stat: "hp" | "attack" | "defense" | "special-attack" | "special-defense" | "speed"
  size?: number
  className?: string
}

export function PokemonStatIcon({ stat, size = 20, className }: PokemonStatIconProps) {
  const spriteUrl = getStatSpriteUrl(stat)
  
  // Stat sprites don't exist, return null so parent can show fallback icon
  // This prevents 404 errors in the console
  if (!spriteUrl) {
    return null
  }
  
  const [hasError, setHasError] = useState(false)
  
  if (hasError) {
    return null // Hide if sprite doesn't exist, parent can show fallback icon
  }
  
  return (
    <div className={cn("relative flex-shrink-0", className)}>
      <img
        src={spriteUrl}
        alt={stat}
        width={size}
        height={size}
        className="object-contain"
        onError={() => {
          setHasError(true)
        }}
      />
    </div>
  )
}
