"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { PokeballIcon } from "@/components/ui/pokeball-icon"

interface SplashScreenProps {
  /** Whether the splash screen is visible */
  isVisible: boolean
  /** Callback when splash should be hidden */
  onHide: () => void
  /** Minimum display time in milliseconds (default: 1000ms) */
  minDisplayTime?: number
}

/**
 * Splash Screen Component
 * 
 * Displays a branded loading screen with:
 * - League background images (dark/light mode aware)
 * - League logo
 * - Animated Pokeball loading indicator
 * - Smooth fade-out transition
 */
export function SplashScreen({ 
  isVisible, 
  onHide, 
  minDisplayTime = 1000 
}: SplashScreenProps) {
  const [shouldRender, setShouldRender] = useState(isVisible)
  const [isFading, setIsFading] = useState(false)

  useEffect(() => {
    if (!isVisible) {
      // Start fade-out animation
      setIsFading(true)
      // Remove from DOM after animation completes
      const timer = setTimeout(() => {
        setShouldRender(false)
      }, 500) // Match CSS transition duration
      return () => clearTimeout(timer)
    } else {
      setShouldRender(true)
      setIsFading(false)
    }
  }, [isVisible])

  // Auto-hide after minimum display time
  useEffect(() => {
    if (isVisible && minDisplayTime > 0) {
      const timer = setTimeout(() => {
        onHide()
      }, minDisplayTime)
      return () => clearTimeout(timer)
    }
  }, [isVisible, minDisplayTime, onHide])

  if (!shouldRender) return null

  return (
    <div
      className={`
        fixed inset-0 z-[9999] flex items-center justify-center
        bg-background transition-opacity duration-500 ease-in-out
        ${isFading ? "opacity-0" : "opacity-100"}
      `}
      aria-label="Loading splash screen"
      aria-live="polite"
    >
      {/* Background Image Layer */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Light mode background */}
        <div 
          className="absolute inset-0 bg-[url('/league-bg-light.png')] bg-cover bg-center bg-no-repeat opacity-20 dark:hidden"
          aria-hidden="true"
        />
        {/* Dark mode background */}
        <div 
          className="absolute inset-0 hidden bg-[url('/league-bg-dark.png')] bg-cover bg-center bg-no-repeat opacity-25 dark:block"
          aria-hidden="true"
        />
        {/* Overlay for better contrast */}
        <div className="absolute inset-0 bg-background/60 dark:bg-background/70" aria-hidden="true" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center space-y-8 px-4">
        {/* League Logo */}
        <div className="relative h-24 w-24 sm:h-32 sm:w-32 md:h-40 md:w-40 animate-fade-in">
          <Image
            src="/league-logo.png"
            alt="Average at Best Battle League"
            width={160}
            height={160}
            priority
            className="h-full w-full object-contain drop-shadow-lg"
          />
        </div>

        {/* App Name */}
        <div className="text-center space-y-2 animate-slide-up">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            <span className="block">Average at Best</span>
            <span className="block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Battle League
            </span>
          </h1>
        </div>

        {/* Loading Indicator */}
        <div className="flex flex-col items-center space-y-4 animate-fade-in-delay">
          {/* Animated Pokeball */}
          <div className="relative">
            <PokeballIcon className="h-12 w-12 sm:h-16 sm:w-16 text-primary animate-spin-slow" />
            {/* Pulsing ring effect */}
            <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
          </div>

          {/* Loading dots */}
          <div className="flex justify-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce" />
          </div>
        </div>
      </div>
    </div>
  )
}
