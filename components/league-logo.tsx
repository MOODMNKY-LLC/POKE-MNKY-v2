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

export function LeagueLogo({ className, size = "md", variant = "default" }: LeagueLogoProps) {
  const pixelSize = sizeMap[size]

  // For icon-only variant, use SVG inline for better scaling
  if (variant === "icon-only") {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <img
          src="/league-logo.svg"
          alt="Average at Best Battle League"
          width={pixelSize}
          height={pixelSize}
          className="object-contain"
          loading="eager"
        />
      </div>
    )
  }

  // For default/full variants, use Next.js Image for optimization
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <img
        src="/league-logo.svg"
        alt="Average at Best Battle League"
        width={pixelSize}
        height={pixelSize}
        className="object-contain"
        loading="eager"
      />
    </div>
  )
}
