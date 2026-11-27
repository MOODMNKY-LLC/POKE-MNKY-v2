"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"

interface LeagueLogoProps {
  className?: string
  size?: "sm" | "md" | "lg" | "xl"
  variant?: "default" | "icon-only" | "full"
}

const sizeMap = {
  sm: 24,
  md: 36,
  lg: 48,
  xl: 64,
}

// league-logo-256.webp is 4x the largest displayed size (64px), so it stays crisp on 3x screens.
export function LeagueLogo({ className, size = "md" }: LeagueLogoProps) {
  const pixelSize = sizeMap[size]

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <Image
        src="/league-logo-256.webp"
        alt="Average at Best Battle League"
        width={pixelSize}
        height={pixelSize}
        sizes={`${pixelSize}px`}
        className="object-contain"
        priority
      />
    </div>
  )
}
