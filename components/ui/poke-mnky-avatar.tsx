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
  /** Size in pixels (ignored for layout when `fill` is true; still used as intrinsic image size) */
  size?: number
  /**
   * Fill the parent box with object-contain art instead of a fixed pixel box.
   * Parent should set width/height (or aspect-ratio). Prefer this for responsive cards.
   */
  fill?: boolean
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
  fill = false,
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

  const boxStyle = fill ? undefined : { width: size, height: size }
  const imageStyle = fill ? undefined : { width: size, height: size }
  const imageClassName = fill ? "h-full w-full object-contain" : "object-contain"

  if (!mounted) {
    // Return placeholder during SSR to avoid hydration mismatch
    return (
      <div
        className={cn(
          fill ? "h-full w-full rounded-full bg-muted animate-pulse" : "rounded-full bg-muted animate-pulse",
          className,
        )}
        style={boxStyle}
        aria-label={alt}
      />
    )
  }

  const imagePath = getImagePath()

  return (
    <div
      className={cn(fill ? "relative block h-full w-full" : "relative inline-block", className)}
      style={boxStyle}
    >
      {useSvg && variant === "avatar" ? (
        <img
          src={imagePath}
          alt={alt}
          width={size}
          height={size}
          className={imageClassName}
          style={imageStyle}
        />
      ) : (
        <Image
          src={imagePath}
          alt={alt}
          width={size}
          height={size}
          className={imageClassName}
          style={imageStyle}
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
