"use client"

/**
 * Floating Assistant Button (FAB)
 * 
 * A floating action button that opens the unified assistant popup.
 * Positioned in bottom-right corner, ChatGPT-style.
 */

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PokeMnkyAssistant } from "@/components/ui/poke-mnky-avatar"
import { Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "motion/react"

// Dynamically import UnifiedAssistantPopup to prevent HMR issues with Radix UI components
const UnifiedAssistantPopup = dynamic(
  () => import("./unified-assistant-popup").then((mod) => ({ default: mod.UnifiedAssistantPopup })),
  {
    ssr: false,
    loading: () => null,
  }
)

interface FloatingAssistantButtonProps {
  /** Additional context data */
  context?: {
    teamId?: string | null
    seasonId?: string | null
    selectedPokemon?: string | null
    team1Id?: string | null
    team2Id?: string | null
    matchId?: string | null
  }
  /** Whether user is authenticated */
  isAuthenticated?: boolean
  /** Custom className */
  className?: string
}

export function FloatingAssistantButton({
  context = {},
  isAuthenticated = false,
  className,
}: FloatingAssistantButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Debug: Log when component renders
  useEffect(() => {
    console.log("[FloatingAssistantButton] Component mounted/rendered", { isOpen, context })
  }, [isOpen, context])

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className={cn(
              "fixed bottom-6 right-6 z-50",
              className
            )}
          >
            <Button
              onClick={() => setIsOpen(true)}
              size="lg"
              className={cn(
                "h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200",
                // Gold glassmorphic styling - theme aware using Pokémon Gold
                "bg-gradient-to-br from-[#B3A125]/90 via-[#D4AF37]/85 to-[#FFD700]/90",
                "dark:from-[#B3A125]/80 dark:via-[#D4AF37]/75 dark:to-[#FFD700]/80",
                "backdrop-blur-md border-2 border-[#D4AF37]/40 dark:border-[#FFD700]/30",
                "hover:from-[#D4AF37] hover:via-[#FFD700] hover:to-[#FFA500]",
                "dark:hover:from-[#D4AF37]/90 dark:hover:via-[#FFD700]/85 dark:hover:to-[#FFA500]/80",
                "shadow-[0_4px_14px_0_rgba(212,175,55,0.3)] dark:shadow-[0_4px_14px_0_rgba(255,215,0,0.2)]",
                "hover:shadow-[0_6px_20px_0_rgba(212,175,55,0.4)] dark:hover:shadow-[0_6px_20px_0_rgba(255,215,0,0.3)]",
                // Ensure minimum touch target size (44x44px for accessibility)
                "min-h-[44px] min-w-[44px]",
                // Better touch feedback
                "active:scale-95 touch-manipulation",
                // PWA safe area handling - already handled by parent
              )}
              aria-label="Open POKE MNKY"
            >
              <div className="relative">
                <PokeMnkyAssistant size={32} className="drop-shadow-lg" />
                <Badge
                  variant="secondary"
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-white/20 dark:bg-black/30 backdrop-blur-sm border border-white/30 dark:border-white/20"
                >
                  <Sparkles className="h-3 w-3 text-[#FFD700] dark:text-[#FFD700]" />
                </Badge>
              </div>
              <span className="sr-only">Open AI Assistant</span>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <UnifiedAssistantPopup
        open={isOpen}
        onOpenChange={setIsOpen}
        context={context}
        isAuthenticated={isAuthenticated}
      />
    </>
  )
}
