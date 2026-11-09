"use client"

/**
 * Shared POKE MNKY launcher.
 * A reserved bottom dock, not a circle over the page. The open chat is the
 * existing dialog (desktop) or sheet (mobile).
 */

import { useRef } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { MessageCircle } from "lucide-react"
import { cn } from "@/lib/utils"

const UnifiedAssistantPopup = dynamic(
  () => import("./unified-assistant-popup").then((mod) => ({ default: mod.UnifiedAssistantPopup })),
  {
    ssr: false,
    loading: () => null,
  },
)

interface FloatingAssistantButtonProps {
  context?: {
    teamId?: string | null
    seasonId?: string | null
    selectedPokemon?: string | null
    team1Id?: string | null
    team2Id?: string | null
    matchId?: string | null
  }
  isAuthenticated?: boolean
  className?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When true, the dock sits above the dashboard tab bar instead of the viewport edge. */
  aboveTabBar?: boolean
}

export function FloatingAssistantButton({
  context = {},
  isAuthenticated = false,
  className,
  open,
  onOpenChange,
  aboveTabBar = false,
}: FloatingAssistantButtonProps) {
  const launcherRef = useRef<HTMLButtonElement>(null)

  function setOpen(next: boolean) {
    onOpenChange(next)
    if (!next) {
      requestAnimationFrame(() => launcherRef.current?.focus())
    }
  }

  return (
    <>
      <div
        data-testid="assistant-dock"
        data-state={open ? "open" : "closed"}
        className={cn(
          "fixed inset-x-0 z-40 border-t border-border bg-background text-foreground",
          aboveTabBar
            ? "bottom-[var(--mobile-tab-bar-height)] md:bottom-0 md:pb-[env(safe-area-inset-bottom)]"
            : "bottom-0 pb-[env(safe-area-inset-bottom)]",
          open && "hidden",
          className,
        )}
      >
        <div className="mx-auto flex h-12 max-w-5xl items-center justify-end px-3">
          <Button
            ref={launcherRef}
            type="button"
            data-testid="assistant-launcher"
            aria-expanded={open}
            aria-haspopup="dialog"
            aria-label="Ask POKE MNKY"
            className="h-11 min-h-11 gap-2 bg-primary px-4 text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            onClick={() => setOpen(true)}
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            Ask POKE MNKY
          </Button>
        </div>
      </div>

      <UnifiedAssistantPopup
        open={open}
        onOpenChange={setOpen}
        context={context}
        isAuthenticated={isAuthenticated}
      />
    </>
  )
}
