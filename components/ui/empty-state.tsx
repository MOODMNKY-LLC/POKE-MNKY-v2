"use client"

import { PokeMnkyAssistant } from "./poke-mnky-avatar"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  /** Main title */
  title: string
  /** Description text */
  description?: string
  /** Optional action button */
  action?: React.ReactNode
  /** Additional CSS classes */
  className?: string
  /** Character size */
  characterSize?: number
  /** Show character (default: true) */
  showCharacter?: boolean
}

/**
 * Empty State Component with POKE MNKY Character
 * 
 * Displays a helpful empty state with the POKE MNKY assistant character
 * to guide users when no data is available.
 * 
 * @example
 * ```tsx
 * <EmptyState
 *   title="No teams found"
 *   description="Create your first team to get started"
 *   action={<Button>Create Team</Button>}
 * />
 * ```
 */
export function EmptyState({
  title,
  description,
  action,
  className,
  characterSize = 96,
  showCharacter = true,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      {showCharacter && (
        <div className="mb-6 animate-fade-in">
          <PokeMnkyAssistant size={characterSize} />
        </div>
      )}
      
      <h3 className="text-xl font-semibold mb-2 animate-slide-up">
        {title}
      </h3>
      
      {description && (
        <p className="text-muted-foreground max-w-md mb-6 animate-slide-up [animation-delay:0.1s]">
          {description}
        </p>
      )}
      
      {action && (
        <div className="animate-slide-up [animation-delay:0.2s]">
          {action}
        </div>
      )}
    </div>
  )
}
