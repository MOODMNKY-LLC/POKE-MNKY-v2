"use client"

/**
 * Floating Assistant Button (FAB)
 * 
 * A floating action button that opens the unified assistant popup.
 * Positioned in bottom-right corner, ChatGPT-style.
 */

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PokeMnkyAssistant } from "@/components/ui/poke-mnky-avatar"
import { Sparkles } from "lucide-react"
import { UnifiedAssistantPopup } from "./unified-assistant-popup"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "motion/react"

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
  /** Custom className */
  className?: string
}

export function FloatingAssistantButton({
  context = {},
  className,
}: FloatingAssistantButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

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
              className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-primary hover:bg-primary/90"
            >
              <div className="relative">
                <PokeMnkyAssistant size={32} />
                <Badge
                  variant="secondary"
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-primary text-primary-foreground"
                >
                  <Sparkles className="h-3 w-3" />
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
      />
    </>
  )
}
