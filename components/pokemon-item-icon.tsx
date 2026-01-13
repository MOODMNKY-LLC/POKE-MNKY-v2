/**
 * Pokemon Item Icon Component
 * Displays Pokemon item sprite (items ARE available in PokeAPI)
 */

"use client"

import Image from "next/image"
import { getItemSpriteUrl } from "@/lib/pokemon-ui-sprites"
import { cn } from "@/lib/utils"

interface PokemonItemIconProps {
  itemName: string
  size?: number
  className?: string
}

export function PokemonItemIcon({ itemName, size = 24, className }: PokemonItemIconProps) {
  const spriteUrl = getItemSpriteUrl(itemName)
  
  return (
    <div className={cn("relative flex-shrink-0", className)}>
      <img
        src={spriteUrl}
        alt={itemName}
        width={size}
        height={size}
        className="object-contain"
        onError={(e) => {
          // Show placeholder if sprite doesn't exist
          e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Crect fill='%23ccc' width='24' height='24'/%3E%3C/svg%3E"
        }}
      />
    </div>
  )
}
