/**
 * Pokemon Type Icon Component
 * Displays Pokemon type icon sprite
 */

"use client"

import Image from "next/image"
import { getTypeSpriteUrl } from "@/lib/pokemon-ui-sprites"
import { cn } from "@/lib/utils"

interface PokemonTypeIconProps {
  type: string
  size?: number
  className?: string
}

export function PokemonTypeIcon({ type, size = 24, className }: PokemonTypeIconProps) {
  const spriteUrl = getTypeSpriteUrl(type)
  
  // For now, since PokeAPI doesn't have official type sprites,
  // we'll use a fallback approach: try sprite, fallback to colored badge
  return (
    <div className={cn("relative flex-shrink-0", className)}>
      <img
        src={spriteUrl}
        alt={type}
        width={size}
        height={size}
        className="object-contain"
        onError={(e) => {
          // Hide image if sprite doesn't exist, parent can show badge instead
          e.currentTarget.style.display = "none"
        }}
      />
    </div>
  )
}
