"use client"

import Image from "next/image"
import { useState } from "react"

interface PokemonSpriteProps {
  name: string
  sprite?: string
  size?: "sm" | "md" | "lg" | "xl"
  showShiny?: boolean
  animated?: boolean
  className?: string
}

export function PokemonSprite({
  name,
  sprite,
  size = "md",
  showShiny = false,
  animated = false,
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

  // Use provided sprite or construct from PokeAPI
  const spriteUrl =
    sprite ||
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${showShiny ? "shiny/" : ""}${animated ? "versions/generation-v/black-white/animated/" : ""}${name.toLowerCase()}.${animated ? "gif" : "png"}`

  if (imageError) {
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
        src={spriteUrl || "/placeholder.svg"}
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
