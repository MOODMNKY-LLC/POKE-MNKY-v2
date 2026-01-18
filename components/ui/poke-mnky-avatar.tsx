"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

export type PokeMnkyPalette = "red-blue" | "gold-black"
export type PokeMnkyVariant = "avatar" | "icon"

interface PokeMnkyAvatarProps {
  /** Color palette - red-blue (primary) or gold-black (premium/admin) */
  palette?: PokeMnkyPalette
  /** Variant - avatar (no bg) or icon (with bg) */
  variant?: PokeMnkyVariant
  /** Size in pixels */
  size?: number
  /** Additional CSS classes */
  className?: string
  /** Alt text for accessibility */
  alt?: string
  /** Use SVG instead of PNG for better scaling */
  useSvg?: boolean
}

/**
 * POKE MNKY Character Avatar Component
 * 
 * Displays the POKE MNKY virtual assistant character with automatic
 * light/dark mode support and palette selection.
 * 
 * @example
 * ```tsx
 * <PokeMnkyAvatar palette="red-blue" variant="avatar" size={48} />
 * ```
 */
export function PokeMnkyAvatar({
  palette = "red-blue",
  variant = "avatar",
  size = 48,
  className,
  alt = "POKE MNKY Assistant",
  useSvg = false,
}: PokeMnkyAvatarProps) {
  const { theme, systemTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    setMounted(true)
    const currentTheme = theme === "system" ? systemTheme : theme
    setIsDark(currentTheme === "dark")
  }, [theme, systemTheme])

  // Determine which image to use
  const getImagePath = () => {
    if (variant === "icon") {
      // Icon style has separate light/dark versions
      const mode = isDark ? "dark" : "light"
      return `/poke-mnky/icons/${mode}-${palette}.png`
    } else {
      // Avatar style works for both light/dark (transparent bg)
      if (useSvg) {
        return `/poke-mnky/avatars/${palette}.svg`
      }
      return `/poke-mnky/avatars/${palette}.png`
    }
  }

  if (!mounted) {
    // Return placeholder during SSR to avoid hydration mismatch
    return (
      <div
        className={cn("rounded-full bg-muted animate-pulse", className)}
        style={{ width: size, height: size }}
        aria-label={alt}
      />
    )
  }

  const imagePath = getImagePath()

  return (
    <div
      className={cn("relative inline-block", className)}
      style={{ width: size, height: size }}
    >
      {useSvg && variant === "avatar" ? (
        <img
          src={imagePath}
          alt={alt}
          width={size}
          height={size}
          className="object-contain"
          style={{ width: size, height: size }}
        />
      ) : (
        <Image
          src={imagePath}
          alt={alt}
          width={size}
          height={size}
          className="object-contain"
          style={{ width: size, height: size }}
          unoptimized={variant === "icon"} // Icons may be larger, allow unoptimized
        />
      )}
    </div>
  )
}

/**
 * Convenience component for AI Assistant avatar
 * Uses red-blue palette and avatar variant by default
 */
export function PokeMnkyAssistant({
  size = 48,
  className,
}: {
  size?: number
  className?: string
}) {
  return (
    <PokeMnkyAvatar
      palette="red-blue"
      variant="avatar"
      size={size}
      className={className}
      alt="POKE MNKY AI Assistant"
    />
  )
}

/**
 * Convenience component for Admin/Premium features
 * Uses gold-black palette
 */
export function PokeMnkyPremium({
  size = 48,
  className,
}: {
  size?: number
  className?: string
}) {
  return (
    <PokeMnkyAvatar
      palette="gold-black"
      variant="avatar"
      size={size}
      className={className}
      alt="POKE MNKY Premium Assistant"
    />
  )
}
